/** Folded token → ascending positions of the records containing it. */
export interface TokenIndex {
  get(key: string): ArrayLike<number> | undefined;
  has(key: string): boolean;
  /** All keys, for fuzzy scans. */
  readonly keyList: readonly string[];
  readonly size: number;
}

export class MapIndex implements TokenIndex {
  private list: string[] | null = null;
  constructor(readonly map: Map<string, number[]>) {}
  get(key: string) {
    return this.map.get(key);
  }
  has(key: string) {
    return this.map.has(key);
  }
  get keyList() {
    return (this.list ??= [...this.map.keys()]);
  }
  get size() {
    return this.map.size;
  }
}

/**
 * A flat form of the index that crosses the worker boundary cheaply: one
 * string and two typed arrays (transferable, so not copied), instead of a
 * Map with hundreds of thousands of entries.
 */
export interface PackedIndexData {
  keys: string;
  starts: Int32Array;
  postings: Int32Array;
}

const SEP = '\u0001';

export function packIndex(index: MapIndex): PackedIndexData {
  const keys = index.keyList;
  let total = 0;
  for (const k of keys) total += index.map.get(k)!.length;
  const starts = new Int32Array(keys.length + 1);
  const postings = new Int32Array(total);
  let pos = 0;
  keys.forEach((k, i) => {
    starts[i] = pos;
    const list = index.map.get(k)!;
    postings.set(list, pos);
    pos += list.length;
  });
  starts[keys.length] = pos;
  return { keys: keys.join(SEP), starts, postings };
}

export class PackedIndex implements TokenIndex {
  readonly keyList: string[];
  private lookup: Map<string, number> | null = null;
  constructor(private data: PackedIndexData) {
    this.keyList = data.keys ? data.keys.split(SEP) : [];
  }
  private pos(key: string): number | undefined {
    if (!this.lookup) {
      this.lookup = new Map();
      this.keyList.forEach((k, i) => this.lookup!.set(k, i));
    }
    return this.lookup.get(key);
  }
  get(key: string) {
    const i = this.pos(key);
    return i === undefined ? undefined : this.data.postings.subarray(this.data.starts[i], this.data.starts[i + 1]);
  }
  has(key: string) {
    return this.pos(key) !== undefined;
  }
  get size() {
    return this.keyList.length;
  }
}
