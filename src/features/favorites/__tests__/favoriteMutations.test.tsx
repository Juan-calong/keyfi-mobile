import React from 'react';
import { act } from 'react-test-renderer';
import { onlineManager } from '@tanstack/react-query';
import { harness, deferred, flush, setUser } from '../testing/testUtils';
import { api } from '../../../core/api/client';
import { useFavoriteIds } from '../useFavoriteIds';
import { useSetFavorite } from '../useSetFavorite';
import { favoritesKeys } from '../favorites.keys';

async function setup(initial: string[] = [], role: 'CUSTOMER' | 'SALON_OWNER' = 'CUSTOMER') {
  setUser('A', role);
  const h = harness();
  let serverIds = initial;
  (api.get as jest.Mock).mockImplementation(async () => ({ data: { productIds: serverIds } }));
  h.client.setQueryData(favoritesKeys.ids('A', role), initial);
  let home!: ReturnType<typeof useFavoriteIds>;
  let details!: ReturnType<typeof useFavoriteIds>;
  let first!: ReturnType<typeof useSetFavorite>;
  let second!: ReturnType<typeof useSetFavorite>;
  function Home() { home = useFavoriteIds(); first = useSetFavorite('p'); return null; }
  function Details() { details = useFavoriteIds(); second = useSetFavorite('p'); return null; }
  await h.mount(<><Home /><Details /></>);
  return { ...h, home: () => home, details: () => details, first: () => first, second: () => second, server: (ids: string[]) => { serverIds = ids; } };
}
it.each(['CUSTOMER', 'SALON_OWNER'] as const)('optimistically favorites from zero and confirms PUT for %s in both observers', async (role) => {
  const h = await setup([], role);
  const http = deferred<{ data: { favorited: boolean } }>();
  (api.put as jest.Mock).mockReturnValue(http.promise);
  try {
    let mutation!: Promise<unknown>;
    act(() => { mutation = h.first().mutateAsync({ productId: 'p', favorited: true }); });
    expect(h.client.getQueryData(favoritesKeys.ids('A', role))).toEqual(['p']);
    await flush();
    expect(h.home().isFavorite('p')).toBe(true);
    expect(h.details().isFavorite('p')).toBe(true);
    expect(api.put).toHaveBeenCalledWith('/products/p/favorite', undefined, expect.anything());
    h.server(['p']); http.resolve({ data: { favorited: true } });
    await act(async () => { await mutation; });
    expect(h.details().isFavorite('p')).toBe(true);
  } finally { await h.cleanup(); }
});
it('confirms DELETE and updates both observers', async () => {
  const h = await setup(['p']);
  (api.delete as jest.Mock).mockImplementation(async () => { h.server([]); return { data: { favorited: false } }; });
  try {
    await act(async () => { await h.first().mutateAsync({ productId: 'p', favorited: false }); });
    expect(h.home().isFavorite('p')).toBe(false);
    expect(h.details().isFavorite('p')).toBe(false);
    expect(api.delete).toHaveBeenCalledWith('/products/p/favorite', expect.anything());
  } finally { await h.cleanup(); }
});
it.each([true, false])('rolls back a failed desired state %s and reconciles GET', async (favorited) => {
  const h = await setup(favorited ? [] : ['p']);
  const http = deferred<never>();
  ((favorited ? api.put : api.delete) as jest.Mock).mockReturnValue(http.promise);
  try {
    let mutation!: Promise<unknown>;
    act(() => { mutation = h.first().mutateAsync({ productId: 'p', favorited }).catch(() => undefined); });
    expect(h.client.getQueryData(favoritesKeys.ids('A', 'CUSTOMER'))).toEqual(favorited ? ['p'] : []);
    await flush(); http.reject(new Error('HTTP 500'));
    await act(async () => { await mutation; });
    expect(h.home().isFavorite('p')).toBe(!favorited);
    expect(api.get).toHaveBeenCalled();
  } finally { await h.cleanup(); }
});
it('reconciles timeout when server applied PUT but response was lost', async () => {
  const h = await setup();
  (api.put as jest.Mock).mockImplementation(async () => { h.server(['p']); throw new Error('timeout'); });
  try {
    await act(async () => { await h.first().mutateAsync({ productId: 'p', favorited: true }).catch(() => undefined); });
    expect(h.home().isFavorite('p')).toBe(true);
  } finally { await h.cleanup(); }
});
it.each(['success', 'error'])('serializes same-product double tap across Home/Details and protects later intent from older %s', async (result) => {
  const h = await setup();
  const put = deferred<{ data: { favorited: boolean } }>();
  const del = deferred<{ data: { favorited: boolean } }>();
  (api.put as jest.Mock).mockReturnValue(put.promise);
  (api.delete as jest.Mock).mockReturnValue(del.promise);
  try {
    let one!: Promise<unknown>; let two!: Promise<unknown>;
    act(() => {
      one = h.first().toggle().catch(() => undefined);
      two = h.second().toggle();
    });
    expect(h.client.getQueryData(favoritesKeys.ids('A', 'CUSTOMER'))).toEqual([]);
    await flush(); expect(api.put).toHaveBeenCalledTimes(1); expect(api.delete).not.toHaveBeenCalled();
    if (result === 'success') { put.resolve({ data: { favorited: true } }); } else { put.reject(new Error('fail')); }
    await flush();
    expect(h.home().isFavorite('p')).toBe(false);
    expect(api.delete).toHaveBeenCalledTimes(1);
    expect(api.get).not.toHaveBeenCalled();
    del.resolve({ data: { favorited: false } });
    await act(async () => { await Promise.all([one, two]); });
    expect(h.details().isFavorite('p')).toBe(false);
  } finally { await h.cleanup(); }
});
it('ignores late mutation A after B mounts', async () => {
  const h = await setup();
  const put = deferred<{ data: { favorited: boolean } }>();
  (api.put as jest.Mock).mockReturnValue(put.promise);
  try {
    let mutation!: Promise<unknown>;
    act(() => { mutation = h.first().mutateAsync({ productId: 'p', favorited: true }).catch(() => undefined); });
    await flush(); setUser('B'); await flush();
    put.resolve({ data: { favorited: true } });
    await act(async () => { await mutation; });
    expect(h.client.getQueryData(favoritesKeys.ids('B', 'CUSTOMER'))).toEqual([]);
    expect(h.details().isFavorite('p')).toBe(false);
  } finally { await h.cleanup(); }
});
it('does not send offline mutation A with session B credentials on reconnect', async () => {
  const h = await setup();
  onlineManager.setOnline(false);
  try {
    let mutation!: Promise<unknown>;
    act(() => { mutation = h.first().mutateAsync({ productId: 'p', favorited: true }).catch(() => undefined); });
    await flush(); expect(api.put).not.toHaveBeenCalled();
    setUser('B'); await flush(); onlineManager.setOnline(true);
    await act(async () => { await mutation; });
    expect(api.put).not.toHaveBeenCalled();
    expect(h.details().isFavorite('p')).toBe(false);
  } finally { await h.cleanup(); }
});
it('rollback of p preserves a concurrent optimistic update of q', async () => {
  const h = await setup();
  let other!: ReturnType<typeof useSetFavorite>;
  function Shop() { other = useSetFavorite('q'); return null; }
  const p = deferred<{ data: { favorited: boolean } }>();
  const q = deferred<{ data: { favorited: boolean } }>();
  (api.put as jest.Mock).mockImplementation((url) => url.includes('/p/') ? p.promise : q.promise);
  try {
    await h.mount(<Shop />);
    let one!: Promise<unknown>; let two!: Promise<unknown>;
    act(() => { one = h.first().mutateAsync({ productId: 'p', favorited: true }).catch(() => undefined); two = other.mutateAsync({ productId: 'q', favorited: true }); });
    await flush(); p.reject(new Error('failure')); await flush();
    expect(h.client.getQueryData(favoritesKeys.ids('A', 'CUSTOMER'))).toEqual(['q']);
    h.server(['q']); q.resolve({ data: { favorited: true } });
    await act(async () => { await Promise.all([one, two]); }); await flush();
    expect(h.client.getQueryData(favoritesKeys.ids('A', 'CUSTOMER'))).toEqual(['q']);
  } finally { await h.cleanup(); }
});
it('cancels a manual GET requested during pending optimism before it can overwrite IDs', async () => {
  const h = await setup();
  const put = deferred<{ data: { favorited: boolean } }>();
  (api.put as jest.Mock).mockReturnValue(put.promise);
  try {
    let mutation!: Promise<unknown>;
    act(() => { mutation = h.first().mutateAsync({ productId: 'p', favorited: true }); });
    await flush();
    let manual!: Promise<unknown>;
    act(() => { manual = h.home().refetch(); }); await flush();
    expect(h.home().isFavorite('p')).toBe(true); expect(api.get).not.toHaveBeenCalled();
    h.server(['p']); put.resolve({ data: { favorited: true } });
    await act(async () => { await Promise.all([mutation, manual]); }); await flush();
    expect(h.details().isFavorite('p')).toBe(true);
  } finally { await h.cleanup(); }
});
