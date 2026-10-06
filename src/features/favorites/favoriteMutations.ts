import { useSyncExternalStore } from 'react';
import type { QueryClient } from '@tanstack/react-query';

type PendingState = { count: number; sequence: number; latest: Map<string, number>; listeners: Set<() => void> };
const clients = new WeakMap<QueryClient, Map<string, PendingState>>();
function state(client: QueryClient, session: string): PendingState {
  let sessions = clients.get(client);
  if (!sessions) { sessions = new Map(); clients.set(client, sessions); }
  let pending = sessions.get(session);
  if (!pending) { pending = { count: 0, sequence: 0, latest: new Map(), listeners: new Set() }; sessions.set(session, pending); }
  return pending;
}
export const favoriteSessionKey = (userId: string | null, role: string | null, generation: number) => JSON.stringify([generation, userId, role]);
export function beginFavoriteIntent(client: QueryClient, session: string, productId: string) {
  const pending = state(client, session);
  const sequence = ++pending.sequence;
  pending.latest.set(productId, sequence);
  pending.count += 1;
  pending.listeners.forEach((listener) => listener());
  return sequence;
}
export function isLatestFavoriteIntent(client: QueryClient, session: string, productId: string, sequence: number) {
  return state(client, session).latest.get(productId) === sequence;
}
export function finishFavoriteIntent(client: QueryClient, session: string) {
  const pending = state(client, session);
  pending.count -= 1;
  if (!pending.count) { pending.latest.clear(); }
  pending.listeners.forEach((listener) => listener());
  return pending.count === 0;
}
export function useFavoritePending(client: QueryClient, session: string) {
  return useSyncExternalStore(
    (listener) => { const pending = state(client, session); pending.listeners.add(listener); return () => { pending.listeners.delete(listener); }; },
    () => state(client, session).count,
  );
}
export async function waitForFavoriteIntents(client: QueryClient, session: string, signal: AbortSignal) {
  if (signal.aborted) { throw new Error('Favorite query cancelled'); }
  const pending = state(client, session);
  if (!pending.count) { return; }
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => { pending.listeners.delete(check); signal.removeEventListener('abort', abort); };
    const check = () => { if (!pending.count) { cleanup(); resolve(); } };
    const abort = () => { cleanup(); reject(new Error('Favorite query cancelled')); };
    pending.listeners.add(check); signal.addEventListener('abort', abort, { once: true });
  });
}
