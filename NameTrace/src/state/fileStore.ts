import { PackedIndex, type TokenIndex } from '../match/tokenIndex';
import type { ColumnStat } from '../model/fields';
import type { FileType, NormRecord, Unit } from '../model/types';
import { MAX_FILE_BYTES } from '../parse/detect';
import type { FromWorker, ToWorker } from '../parse/protocol';

export type FileStatus = 'queued' | 'parsing' | 'done' | 'error';

export interface FileEntry {
  id: string;
  name: string;
  size: number;
  status: FileStatus;
  progress: number;
  fileType?: FileType;
  unit?: Unit;
  records: NormRecord[];
  index?: TokenIndex;
  columns: ColumnStat[];
  warnings: string[];
  error?: string;
}

/** The subset of Worker the store uses, so tests can pass a fake. */
export interface WorkerLike {
  postMessage(message: ToWorker, transfer: Transferable[]): void;
  terminate(): void;
  onmessage: ((e: MessageEvent<FromWorker>) => void) | null;
  onerror: ((e: ErrorEvent) => void) | null;
}

export interface FileStoreOptions {
  createWorker: () => WorkerLike;
  /** How many files parse at the same time. */
  concurrency?: number;
  readFile?: (file: File) => Promise<ArrayBuffer>;
}

let counter = 0;
const newId = () => `f${Date.now().toString(36)}${(counter++).toString(36)}`;

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Holds the loaded files and runs one worker per file, a few at a time.
 * Shaped for React's useSyncExternalStore.
 */
export class FileStore {
  private files: FileEntry[] = [];
  private listeners = new Set<() => void>();
  private pending: { id: string; file: File }[] = [];
  private running = new Map<string, WorkerLike>();
  private readonly concurrency: number;
  private readonly readFile: (file: File) => Promise<ArrayBuffer>;

  constructor(private opts: FileStoreOptions) {
    this.concurrency = opts.concurrency ?? 2;
    this.readFile = opts.readFile ?? ((f) => f.arrayBuffer());
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = () => this.files;

  private emit() {
    for (const fn of this.listeners) fn();
  }

  private update(id: string, patch: Partial<FileEntry>) {
    let changed = false;
    this.files = this.files.map((f) => {
      if (f.id !== id) return f;
      changed = true;
      return { ...f, ...patch };
    });
    if (changed) this.emit();
  }

  add(list: Iterable<File>): string[] {
    const ids: string[] = [];
    const added: FileEntry[] = [];
    for (const file of list) {
      const id = newId();
      ids.push(id);
      const entry: FileEntry = { id, name: file.name, size: file.size, status: 'queued', progress: 0, records: [], columns: [], warnings: [] };
      if (file.size > MAX_FILE_BYTES) {
        entry.status = 'error';
        entry.error = `This file is ${formatBytes(file.size)}. NameTrace handles files up to 60 MB. Split it into smaller files and add them separately.`;
      } else if (file.size === 0) {
        entry.status = 'error';
        entry.error = 'This file is empty.';
      } else {
        this.pending.push({ id, file });
      }
      added.push(entry);
    }
    this.files = [...this.files, ...added];
    this.emit();
    this.pump();
    return ids;
  }

  /** Remove a file; if it is still parsing, its worker is stopped. */
  remove(id: string) {
    this.pending = this.pending.filter((p) => p.id !== id);
    const w = this.running.get(id);
    if (w) {
      w.terminate();
      this.running.delete(id);
    }
    this.files = this.files.filter((f) => f.id !== id);
    this.emit();
    this.pump();
  }

  clear() {
    for (const f of [...this.files]) this.remove(f.id);
  }

  private pump() {
    while (this.running.size < this.concurrency && this.pending.length) {
      const next = this.pending.shift()!;
      void this.start(next.id, next.file);
    }
  }

  private finish(id: string, patch: Partial<FileEntry>) {
    const w = this.running.get(id);
    w?.terminate();
    this.running.delete(id);
    this.update(id, patch);
    this.pump();
  }

  private async start(id: string, file: File) {
    const worker = this.opts.createWorker();
    this.running.set(id, worker);
    this.update(id, { status: 'parsing', progress: 0 });
    const received: NormRecord[] = [];
    // Structured clone gives every record its own copy of repeated strings.
    // Point them at one shared copy so the duplicates are collected young
    // instead of surviving (and being copied) through garbage collection.
    const shared = new Map<string, string>();
    const intern = (s: string) => {
      const hit = shared.get(s);
      if (hit !== undefined) return hit;
      shared.set(s, s);
      return s;
    };
    worker.onmessage = (e) => {
      if (this.running.get(id) !== worker) return; // removed meanwhile
      const m = e.data;
      if (m.type === 'progress') this.update(id, { progress: m.fraction });
      else if (m.type === 'records') {
        for (const r of m.records) {
          r.fileId = intern(r.fileId);
          r.fileName = intern(r.fileName);
          r.group = intern(r.group);
          if (r.fields) for (const f of r.fields) f[0] = intern(f[0]);
          received.push(r);
        }
      } else if (m.type === 'done') {
        const index = new PackedIndex(m.index);
        // Prepare the index while the page is idle so the first search is quick.
        const idle = (globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
        if (idle) idle(() => index.warm(), { timeout: 2000 });
        else setTimeout(() => index.warm(), 50);
        this.finish(id, {
          status: 'done',
          progress: 1,
          fileType: m.fileType,
          unit: m.unit,
          records: received,
          index,
          columns: m.columns,
          warnings: m.warnings,
        });
      } else if (m.type === 'error') this.finish(id, { status: 'error', error: m.message });
    };
    worker.onerror = (e) => {
      if (this.running.get(id) !== worker) return;
      this.finish(id, { status: 'error', error: `The file reader stopped unexpectedly${e.message ? ` (${e.message})` : ''}. Try adding the file again.` });
    };
    let buffer: ArrayBuffer;
    try {
      buffer = await this.readFile(file);
    } catch (err) {
      this.finish(id, { status: 'error', error: `This file couldn’t be opened (${(err as Error).message}).` });
      return;
    }
    if (this.running.get(id) !== worker) return;
    worker.postMessage({ type: 'parse', fileId: id, name: file.name, buffer }, [buffer]);
  }
}

export function createBrowserStore(): FileStore {
  return new FileStore({
    createWorker: () => new Worker(new URL('../parse/worker.ts', import.meta.url), { type: 'module', name: 'nametrace-parser' }) as unknown as WorkerLike,
  });
}
