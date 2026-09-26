import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseBuffer, type ParsedDocument } from '../parse/dispatch';
import { nodeLoaders } from './nodeLoaders';

export const FIXTURES = join(import.meta.dirname, '../../fixtures');

export function fixtureBuffer(name: string): ArrayBuffer {
  const b = readFileSync(join(FIXTURES, name));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}

export async function parseFixture(name: string, onProgress: (f: number) => void = () => {}): Promise<ParsedDocument> {
  return parseBuffer(name, fixtureBuffer(name), { fileId: name, fileName: name, progress: onProgress }, nodeLoaders);
}
