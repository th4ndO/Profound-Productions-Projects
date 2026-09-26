/// <reference lib="webworker" />
// Parses one file off the main thread. Each file gets its own worker, so
// removing a file simply terminates it.
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { buildIndex } from '../match/search';
import { ParseError } from './common';
import { parseBuffer, type Loaders } from './dispatch';
import type { Mammoth } from './docx';
import { RECORD_BATCH, type FromWorker, type ToWorker } from './protocol';
import { packIndex } from '../match/tokenIndex';

declare const self: DedicatedWorkerGlobalScope;

const post = (m: FromWorker) => self.postMessage(m);

const loaders: Loaders = {
  async pdfjs() {
    const lib = await import('pdfjs-dist');
    if (typeof Worker === 'undefined') {
      // No nested workers (older Safari): run pdf.js's worker code in this
      // thread instead. We are already off the main thread.
      (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.min.mjs');
    } else {
      lib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    }
    return { lib, options: { cMapUrl: `${import.meta.env.BASE_URL}pdfjs/cmaps/`, cMapPacked: true, verbosity: 0 } };
  },
  xlsx: () => import('xlsx'),
  async mammoth() {
    const m = (await import('mammoth')) as unknown as Mammoth & { default?: Mammoth };
    return m.default ?? m;
  },
};

self.onmessage = async (e: MessageEvent<ToWorker>) => {
  const msg = e.data;
  if (msg.type !== 'parse') return;
  const { fileId, name, buffer } = msg;
  let last = 0;
  const progress = (fraction: number) => {
    // Throttle to whole percents so big files don't flood the main thread.
    const f = Math.max(0, Math.min(1, fraction));
    if (f === 1 || f - last >= 0.01) {
      last = f;
      post({ type: 'progress', fileId, fraction: f });
    }
  };
  try {
    // Parsing reports 0–90%; indexing and handing over records the rest.
    const doc = await parseBuffer(name, buffer, { fileId, fileName: name, progress: (f) => progress(f * 0.9) }, loaders);
    const index = packIndex(buildIndex(doc.records));
    progress(0.95);
    for (let i = 0; i < doc.records.length; i += RECORD_BATCH) {
      post({ type: 'records', fileId, records: doc.records.slice(i, i + RECORD_BATCH) });
    }
    self.postMessage({ type: 'done', fileId, fileType: doc.type, unit: doc.unit, index, warnings: doc.warnings } satisfies FromWorker, [
      index.starts.buffer,
      index.postings.buffer,
    ]);
  } catch (err) {
    const message =
      err instanceof ParseError || (err as Error)?.name === 'ParseError'
        ? (err as Error).message
        : `Something went wrong while reading this file (${(err as Error)?.message ?? String(err)}). If it opens normally elsewhere, try saving a fresh copy.`;
    post({ type: 'error', fileId, message });
  }
};
