import { decode } from 'base-64';
import { queryClient } from './queryClient';

let generation = 0;
export const getSessionGeneration = () => generation;
export function advanceSessionGeneration() {
  generation += 1;
  // Cancellation starts synchronously; clear removes observers' old private data.
  queryClient.cancelQueries();
  queryClient.clear();
  return generation;
}
export function getTokenUserId(token?: string | null): string | null {
  try {
    const part = token?.split('.')[1];
    if (!part) { return null; }
    const base = part.replace(/-/g, '+').replace(/_/g, '/');
    const sub = JSON.parse(decode(base + '='.repeat((4 - base.length % 4) % 4))).sub;
    return sub == null ? null : String(sub).trim() || null;
  } catch { return null; }
}
export function assertSessionGeneration(expected: number) {
  if (expected !== generation) { throw new Error('SESSION_SUPERSEDED'); }
}
