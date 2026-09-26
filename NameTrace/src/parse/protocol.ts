import type { PackedIndexData } from '../match/tokenIndex';
import type { FileType, NormRecord, Unit } from '../model/types';

export type ToWorker = { type: 'parse'; fileId: string; name: string; buffer: ArrayBuffer };

/** Records cross the worker boundary in batches so no single message blocks the page. */
export const RECORD_BATCH = 2000;

export type FromWorker =
  | { type: 'progress'; fileId: string; fraction: number }
  | { type: 'records'; fileId: string; records: NormRecord[] }
  | {
      type: 'done';
      fileId: string;
      fileType: FileType;
      unit: Unit;
      index: PackedIndexData;
      warnings: string[];
    }
  | { type: 'error'; fileId: string; message: string };
