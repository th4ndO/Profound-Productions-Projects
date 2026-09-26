import type { FieldPair } from '../model/types';
import { type ParseContext, type ParseOutput, ParseError, RecordSink, decodeText } from './common';

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

const isObj = (v: Json): v is { [k: string]: Json } => typeof v === 'object' && v !== null && !Array.isArray(v);
const isScalar = (v: Json) => v === null || typeof v !== 'object';

function key(path: string, k: string): string {
  const safe = /^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k);
  if (!path) return safe;
  return /^[A-Za-z_$]/.test(safe) ? `${path}.${safe}` : `${path}[${safe}]`;
}

function scalarText(v: Json): string {
  return v === null ? '' : String(v);
}

/**
 * JSON: every object inside an array becomes one record with nested keys
 * flattened to dot paths. Scalars that sit directly on an object outside an
 * array become one record for that object's level.
 */
export function parseJson(buf: ArrayBuffer, ctx: ParseContext): ParseOutput {
  let data: Json;
  try {
    data = JSON.parse(decodeText(buf).replace(/^﻿/, ''));
  } catch (e) {
    throw new ParseError(`This JSON file couldn’t be read: ${(e as Error).message}. Check that it is valid JSON.`);
  }
  const sink = new RecordSink(ctx);
  const groupOf = (path: string) => (path ? path.split(/[.[]/)[0] || path : 'Top level');

  /** Flatten an array item: scalars and nested objects. Arrays of objects are returned to walk after it. */
  const flatten = (obj: { [k: string]: Json }, prefix: string, itemPath: string, out: FieldPair[], later: [Json[], string][]) => {
    for (const [k, v] of Object.entries(obj)) {
      const label = prefix ? `${prefix}.${k}` : k;
      if (isScalar(v)) out.push([label, scalarText(v)]);
      else if (isObj(v)) flatten(v, label, key(itemPath, k), out, later);
      else if (v.every(isScalar)) out.push([label, v.map(scalarText).filter(Boolean).join(', ')]);
      else later.push([v, key(itemPath, k)]);
    }
  };

  const walkArray = (arr: Json[], path: string) => {
    const scalars: FieldPair[] = [];
    arr.forEach((item, i) => {
      if (isScalar(item)) scalars.push([`[${i}]`, scalarText(item)]);
    });
    if (scalars.length) sink.row(groupOf(path), path || 'Top level', scalars);
    arr.forEach((item, i) => {
      const p = `${path}[${i}]`;
      if (isObj(item)) {
        const fields: FieldPair[] = [];
        const later: [Json[], string][] = [];
        flatten(item, '', p, fields, later);
        sink.row(groupOf(path), p, fields);
        for (const [a, ap] of later) walkArray(a, ap);
      } else if (Array.isArray(item)) walkArray(item, p);
    });
  };

  /** Objects outside arrays: this level's scalars form one record, then children follow. */
  const walkObject = (obj: { [k: string]: Json }, path: string) => {
    const scalars = Object.entries(obj).filter(([, v]) => isScalar(v)).map(([k, v]) => [k, scalarText(v)] as FieldPair);
    if (scalars.length) sink.row(groupOf(path), path || 'Top level', scalars);
    for (const [k, v] of Object.entries(obj)) {
      if (isObj(v)) walkObject(v, key(path, k));
      else if (Array.isArray(v)) walkArray(v, key(path, k));
    }
  };

  if (Array.isArray(data)) walkArray(data, '');
  else if (isObj(data)) walkObject(data, '');
  else sink.text('Top level', 'Top level', scalarText(data));
  ctx.progress(1);
  return { records: sink.records, warnings: sink.records.length ? [] : ['This JSON file has no values to search.'] };
}
