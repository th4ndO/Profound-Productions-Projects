import { describe, expect, it } from 'vitest';
import type { FromWorker, ToWorker } from '../parse/protocol';
import { FileStore, type WorkerLike } from './fileStore';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

class FakeWorker implements WorkerLike {
  static all: FakeWorker[] = [];
  onmessage: ((e: MessageEvent<FromWorker>) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  received: ToWorker | null = null;
  terminated = false;
  constructor() {
    FakeWorker.all.push(this);
  }
  postMessage(m: ToWorker) {
    this.received = m;
  }
  terminate() {
    this.terminated = true;
  }
  send(m: DistributiveOmit<FromWorker, 'fileId'>) {
    this.onmessage?.({ data: { fileId: this.received!.fileId, ...m } } as MessageEvent<FromWorker>);
  }
}

const file = (name: string, size = 10) => ({ name, size }) as File;
const tick = () => new Promise((r) => setTimeout(r, 0));

function setup(concurrency = 2) {
  FakeWorker.all = [];
  const store = new FileStore({ createWorker: () => new FakeWorker(), concurrency, readFile: async () => new ArrayBuffer(8) });
  let emits = 0;
  store.subscribe(() => emits++);
  return { store, emits: () => emits };
}

describe('FileStore', () => {
  it('runs at most N workers and starts the next when one finishes', async () => {
    const { store } = setup(2);
    store.add([file('a.pdf'), file('b.pdf'), file('c.pdf')]);
    await tick();
    expect(FakeWorker.all).toHaveLength(2);
    expect(store.getSnapshot().map((f) => f.status)).toEqual(['parsing', 'parsing', 'queued']);
    FakeWorker.all[0].send({ type: 'done', fileType: 'pdf', unit: { one: 'page', many: 'pages' }, index: { keys: '', starts: new Int32Array(1), postings: new Int32Array(0) }, columns: [], warnings: ['w'] });
    await tick();
    expect(FakeWorker.all).toHaveLength(3);
    expect(FakeWorker.all[0].terminated).toBe(true);
    const a = store.getSnapshot()[0];
    expect([a.status, a.progress, a.fileType, a.warnings]).toEqual(['done', 1, 'pdf', ['w']]);
  });

  it('reports progress and errors', async () => {
    const { store } = setup();
    store.add([file('a.pdf')]);
    await tick();
    FakeWorker.all[0].send({ type: 'progress', fraction: 0.5 });
    expect(store.getSnapshot()[0].progress).toBe(0.5);
    FakeWorker.all[0].send({ type: 'error', message: 'This PDF is password-protected.' });
    expect(store.getSnapshot()[0]).toMatchObject({ status: 'error', error: 'This PDF is password-protected.' });
  });

  it('cancels a parse when its file is removed', async () => {
    const { store } = setup(1);
    const [a, b] = store.add([file('a.pdf'), file('b.pdf')]);
    await tick();
    expect(FakeWorker.all).toHaveLength(1);
    store.remove(a);
    expect(FakeWorker.all[0].terminated).toBe(true);
    await tick();
    expect(FakeWorker.all).toHaveLength(2); // the queued file starts
    expect(store.getSnapshot().map((f) => f.id)).toEqual([b]);
    // Late messages from the removed worker are ignored.
    FakeWorker.all[0].onmessage?.({ data: { type: 'progress', fileId: a, fraction: 0.9 } } as MessageEvent<FromWorker>);
    expect(store.getSnapshot()).toHaveLength(1);
  });

  it('removing a queued file never starts it', async () => {
    const { store } = setup(1);
    const [, b] = store.add([file('a.pdf'), file('b.pdf')]);
    store.remove(b);
    await tick();
    expect(FakeWorker.all).toHaveLength(1);
  });

  it('rejects oversized and empty files without a worker', async () => {
    const { store } = setup();
    store.add([file('huge.pdf', 61 * 1024 * 1024), file('empty.txt', 0)]);
    await tick();
    expect(FakeWorker.all).toHaveLength(0);
    const [huge, empty] = store.getSnapshot();
    expect(huge.error).toMatch(/61\.0 MB.*up to 60 MB/);
    expect(empty.error).toBe('This file is empty.');
  });

  it('turns a worker crash into a file error', async () => {
    const { store } = setup();
    store.add([file('a.pdf')]);
    await tick();
    FakeWorker.all[0].onerror?.({ message: 'boom' } as ErrorEvent);
    expect(store.getSnapshot()[0].error).toMatch(/stopped unexpectedly \(boom\)/);
  });
});
