import type { SearchHit } from '../model/types';
import type { Summary } from './summary';

// Export buttons arrive in phase 5.
export function ExportBar(_: { hits: SearchHit[]; query: string; summary: Summary | null }) {
  return null;
}
