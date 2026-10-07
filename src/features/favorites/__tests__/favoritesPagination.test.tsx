import React from 'react';
import { act } from 'react-test-renderer';
import { harness, deferred, flush, setUser } from '../testing/testUtils';
import { api } from '../../../core/api/client';
import { favoritesKeys } from '../favorites.keys';
import { useFavoritesList } from '../useFavoritesList';
import { useFavoriteIds } from '../useFavoriteIds';
import { useSetFavorite } from '../useSetFavorite';
import { CustomerFavoritesScreen } from '../../../screens/customer/CustomerFavoritesScreen';
import { OwnerFavoritesScreen } from '../../../screens/owner/OwnerFavoritesScreen';
import { SharedFavoritesScreen } from '../components/SharedFavoritesScreen';
import { ProductFavoriteButton } from '../../components/product-details/ProductFavoriteButton';

jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }), SafeAreaView: 'SafeAreaView' }));
jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');
jest.mock('react-native-linear-gradient', () => 'LinearGradient');

const ids = (count: number) => Array.from({ length: count }, (_, i) => `p${i}`);
function backend(initial: string[]) {
  let server = initial;
  (api.get as jest.Mock).mockImplementation(async (url, config) => {
    if (url.endsWith('/ids')) { return { data: { productIds: server } }; }
    const { page, limit } = config.params;
    return { data: { items: server.slice((page - 1) * limit, page * limit).map((id) => ({ id, name: id, price: 10 })), page, limit, total: server.length, hasMore: page * limit < server.length } };
  });
  return { change: (next: string[]) => { server = next; } };
}
it.each(['CUSTOMER', 'SALON_OWNER'] as const)('paginates 0, 1, 20, 21 and 100 favorites for %s', async (role) => {
  for (const count of [0, 1, 20, 21, 100]) {
    setUser('A', role);
    backend(ids(count));
    const h = harness();
    let list!: ReturnType<typeof useFavoritesList>;
    function Probe() { list = useFavoritesList(); return null; }
    try {
      await h.mount(<Probe />); await flush();
      expect(list.items).toHaveLength(Math.min(count, 20));
      expect(list.total).toBe(count);
      while (list.hasMore) { await act(async () => { await list.fetchNextPage(); }); await flush(); }
      expect(list.items.map((item) => item.id)).toEqual(ids(count));
      expect(list.hasMore).toBe(false);
    } finally { await h.cleanup(); }
  }
});
// Cold Jest transforms for the first rendered FavoritesScreen take about 6 seconds.
it.each(['CUSTOMER', 'SALON_OWNER'] as const)('FavoritesScreen removes immediately for %s and keeps total/hasMore coherent', async (role) => {
  setUser('A', role);
  const server = backend(ids(21));
  const h = harness();
  h.client.setQueryData(favoritesKeys.ids('A', role), ids(21));
  const http = deferred<{ data: { favorited: boolean } }>();
  (api.delete as jest.Mock).mockReturnValue(http.promise);
  const Screen = role === 'CUSTOMER' ? CustomerFavoritesScreen : OwnerFavoritesScreen;
  try {
    const tree = await h.mount(<Screen />); await flush();
    const button = tree.root.findAllByType(ProductFavoriteButton).find((b) => b.props.productId === 'p0')!;
    act(() => { button.findByProps({ accessibilityRole: 'button' }).props.onPress({ stopPropagation: jest.fn() }); });
    await flush();
    expect(tree.root.findByType(SharedFavoritesScreen).props.items.some((item: { id: string }) => item.id === 'p0')).toBe(false);
    expect(tree.root.findByType(SharedFavoritesScreen).props.total).toBe(20);
    server.change(ids(21).slice(1)); http.resolve({ data: { favorited: false } }); await flush(); await flush();
    const props = tree.root.findByType(SharedFavoritesScreen).props;
    expect(props.items).toHaveLength(20);
    expect(props.items[19].id).toBe('p20');
    expect(props.hasMore).toBe(false);
  } finally { await h.cleanup(); }
}, 15000);
it('shows reconciliation when Favorites opens immediately after favoriting instead of false empty', async () => {
  const server = backend([]);
  const h = harness();
  h.client.setQueryData(favoritesKeys.ids('A', 'CUSTOMER'), []);
  let mutation!: ReturnType<typeof useSetFavorite>;
  function Home() { useFavoriteIds(); mutation = useSetFavorite('new'); return null; }
  const http = deferred<{ data: { favorited: boolean } }>();
  (api.put as jest.Mock).mockReturnValue(http.promise);
  try {
    await h.mount(<Home />);
    let intent!: Promise<unknown>;
    act(() => { intent = mutation.mutateAsync({ productId: 'new', favorited: true }); });
    const tree = await h.mount(<CustomerFavoritesScreen />);
    expect(tree.root.findByType(SharedFavoritesScreen).props.isReconciling).toBe(true);
    expect(tree.root.findByType(SharedFavoritesScreen).props.total).toBe(1);
    server.change(['new']); http.resolve({ data: { favorited: true } });
    await act(async () => { await intent; }); await flush();
    expect(tree.root.findByType(SharedFavoritesScreen).props.items.map((item: { id: string }) => item.id)).toEqual(['new']);
    expect(tree.root.findByType(SharedFavoritesScreen).props.isReconciling).toBe(false);
  } finally { await h.cleanup(); }
});
it('removes inactive products after IDs reconcile', async () => {
  const server = backend(['inactive']);
  const h = harness();
  let list!: ReturnType<typeof useFavoritesList>;
  function Probe() { list = useFavoritesList(); return null; }
  try {
    await h.mount(<Probe />); await flush(); expect(list.items).toHaveLength(1);
    server.change([]); await act(async () => { await list.retry(); }); await flush();
    expect(list.items).toEqual([]); expect(list.total).toBe(0);
  } finally { await h.cleanup(); }
});
it('retains loaded cards on a next-page error and retries without skipping products', async () => {
  const server = backend(ids(21));
  const serve = (api.get as jest.Mock).getMockImplementation()!;
  let failPage = true;
  (api.get as jest.Mock).mockImplementation((url, config) => {
    if (config?.params?.page === 2 && failPage) { return Promise.reject(new Error('network')); }
    return serve(url, config);
  });
  const h = harness(); let list!: ReturnType<typeof useFavoritesList>;
  function Probe() { list = useFavoritesList(); return null; }
  try {
    await h.mount(<Probe />); await flush();
    await act(async () => { await list.fetchNextPage(); }); await flush();
    expect(list.isError).toBe(true); expect(list.items).toHaveLength(20); expect(list.hasMore).toBe(true);
    failPage = false; server.change(ids(21));
    await act(async () => { await list.fetchNextPage(); }); await flush();
    expect(list.items.map((item) => item.id)).toEqual(ids(21)); expect(list.isError).toBe(false);
  } finally { await h.cleanup(); }
});
it('B sees no private cards of A before or after its HTTP response', async () => {
  backend(['private-A']);
  const h = harness(); let list!: ReturnType<typeof useFavoritesList>;
  function Probe() { list = useFavoritesList(); return null; }
  const bIds = deferred<{ data: { productIds: string[] } }>();
  try {
    await h.mount(<Probe />); await flush(); expect(list.items[0].id).toBe('private-A');
    (api.get as jest.Mock).mockReturnValueOnce(bIds.promise);
    setUser('B'); await flush();
    expect(list.items).toEqual([]); expect(list.total).toBe(0);
    backend([]); bIds.resolve({ data: { productIds: [] } }); await flush();
    expect(list.items).toEqual([]); expect(list.total).toBe(0);
  } finally { await h.cleanup(); }
});
it('recovers page offsets after a failed removal reconciliation before loading more', async () => {
  const server = backend(ids(21));
  const serve = (api.get as jest.Mock).getMockImplementation()!;
  let failFirstPage = false;
  (api.get as jest.Mock).mockImplementation((url, config) => {
    if (config?.params?.page === 1 && failFirstPage) { return Promise.reject(new Error('reconciliation failed')); }
    return serve(url, config);
  });
  const h = harness(); let list!: ReturnType<typeof useFavoritesList>; let remove!: ReturnType<typeof useSetFavorite>;
  function Probe() { list = useFavoritesList(); remove = useSetFavorite('p0'); return null; }
  (api.delete as jest.Mock).mockImplementation(async () => {
    server.change(ids(21).slice(1)); failFirstPage = true; return { data: { favorited: false } };
  });
  try {
    await h.mount(<Probe />); await flush();
    await act(async () => { await remove.mutateAsync({ productId: 'p0', favorited: false }); }); await flush();
    expect(list.isRefetchError).toBe(true); expect(list.items).toHaveLength(19);
    failFirstPage = false;
    await act(async () => { await list.fetchNextPage(); }); await flush();
    expect(list.items.map((item) => item.id)).toEqual(ids(21).slice(1));
    expect(list.hasMore).toBe(false); expect(list.isError).toBe(false);
  } finally { await h.cleanup(); }
});
it('reconciles IDs when a product becomes inactive between the IDs and metadata responses', async () => {
  let idsReads = 0;
  (api.get as jest.Mock).mockImplementation(async (url, config) => {
    if (url.endsWith('/ids')) { idsReads += 1; return { data: { productIds: idsReads === 1 ? ['inactive'] : [] } }; }
    return { data: { items: [], page: config.params.page, limit: config.params.limit, total: 0, hasMore: false } };
  });
  const h = harness(); let list!: ReturnType<typeof useFavoritesList>;
  function Probe() { list = useFavoritesList(); return null; }
  try {
    await h.mount(<Probe />); await flush();
    expect(list.total).toBe(0); expect(list.isReconciling).toBe(false); expect(list.items).toEqual([]);
  } finally { await h.cleanup(); }
});
