import React from 'react';
import { act } from 'react-test-renderer';
import { harness, setUser, deferred, flush } from '../testing/testUtils';
import { api } from '../../../core/api/client';
import { useFavoriteIds } from '../useFavoriteIds';
import { favoritesKeys } from '../favorites.keys';

it.each(['CUSTOMER', 'SALON_OWNER'] as const)('loads empty and one favorite for %s into shared membership', async (role) => {
  setUser('A', role);
  (api.get as jest.Mock).mockResolvedValueOnce({ data: { productIds: [] } }).mockResolvedValueOnce({ data: { productIds: ['p1'] } });
  const h = harness();
  let home!: ReturnType<typeof useFavoriteIds>;
  let shop!: ReturnType<typeof useFavoriteIds>;
  function Home() { home = useFavoriteIds(); return null; }
  function Shop() { shop = useFavoriteIds(); return null; }
  try {
    await h.mount(<><Home /><Shop /></>);
    expect(home.isFavorite('p1')).toBe(false);
    expect(home.productIds).toEqual([]);
    await actRefetch();
    expect(home.isFavorite('p1')).toBe(true);
    expect(shop.favoriteIdsSet).toBe(home.favoriteIdsSet);
    expect(h.client.getQueryData(favoritesKeys.ids('A', role))).toEqual(['p1']);
    expect(api.get).toHaveBeenCalledWith('/products/favorites/ids', expect.objectContaining({ signal: expect.anything() }));
  } finally { await h.cleanup(); }
  async function actRefetch() { await act(async () => { await home.refetch(); }); await flush(); }
});
it('keeps initial membership unknown until HTTP resolves and does not expose A to B', async () => {
  const h = harness();
  const a = deferred<{ data: { productIds: string[] } }>();
  const b = deferred<{ data: { productIds: string[] } }>();
  (api.get as jest.Mock).mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  let ids!: ReturnType<typeof useFavoriteIds>;
  function Probe() { ids = useFavoriteIds(); return null; }
  try {
    await h.mount(<Probe />);
    expect(ids.isFavorite('private-A')).toBeUndefined();
    a.resolve({ data: { productIds: ['private-A'] } }); await flush();
    expect(ids.isFavorite('private-A')).toBe(true);
    setUser('B'); await flush();
    expect(ids.isFavorite('private-A')).toBeUndefined();
    b.resolve({ data: { productIds: [] } }); await flush();
    expect(ids.isFavorite('private-A')).toBe(false);
  } finally { await h.cleanup(); }
});
it('does not turn malformed IDs into false membership', async () => {
  (api.get as jest.Mock).mockResolvedValue({ data: { items: [] } });
  const h = harness();
  let ids!: ReturnType<typeof useFavoriteIds>;
  function Probe() { ids = useFavoriteIds(); return null; }
  try { await h.mount(<Probe />); expect(ids.isError).toBe(true); expect(ids.isFavorite('p')).toBeUndefined(); }
  finally { await h.cleanup(); }
});
