import { useMemo } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useFavoriteIds, useFavoriteSession } from './useFavoriteIds';
import { favoritesKeys } from './favorites.keys';
import { getFavoriteIds, getFavoritesPage } from './favorites.service';
import { favoriteSessionKey, useFavoritePending, waitForFavoriteIntents } from './favoriteMutations';

export function favoriteProductId(item: { id?: unknown; productId?: unknown; product?: { id?: unknown; productId?: unknown } | null }) {
  return String(item.productId ?? item.product?.id ?? item.product?.productId ?? item.id ?? '').trim();
}
export function useFavoritesList() {
  const client = useQueryClient();
  const { userId, role, generation, enabled } = useFavoriteSession();
  const ids = useFavoriteIds({ reconcileOnMount: true });
  const session = favoriteSessionKey(userId, role, generation);
  const pending = useFavoritePending(client, session);
  const query = useInfiniteQuery({
    queryKey: favoritesKeys.list(userId ?? '', role),
    initialPageParam: 1,
    queryFn: async ({ pageParam, signal }) => {
      await waitForFavoriteIntents(client, session, signal);
      const page = await getFavoritesPage(pageParam, 20, signal, generation);
      const currentIds = client.getQueryData<string[]>(favoritesKeys.ids(userId ?? '', role));
      if (currentIds && (page.total !== currentIds.length || page.items.some((item) => !currentIds.includes(favoriteProductId(item))))) {
        // The two endpoints are separate snapshots. Reconcile once when metadata
        // reveals a change, including a product becoming inactive between GETs.
        await waitForFavoriteIntents(client, session, signal);
        await client.fetchQuery({
          queryKey: favoritesKeys.ids(userId ?? '', role),
          queryFn: async ({ signal: idsSignal }) => {
            await waitForFavoriteIntents(client, session, idsSignal);
            return getFavoriteIds(idsSignal, generation);
          },
          staleTime: 0,
        });
      }
      return page;
    },
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
    enabled: enabled && ids.productIds !== undefined && pending === 0,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });
  const items = useMemo(() => {
    const seen = new Set<string>();
    return (enabled ? query.data?.pages ?? [] : []).flatMap((page) => page.items).filter((item) => {
      const id = favoriteProductId(item);
      if (!id || seen.has(id) || !ids.favoriteIdsSet.has(id)) { return false; }
      seen.add(id); return true;
    });
  }, [query.data, ids.favoriteIdsSet, enabled]);
  const total = ids.productIds?.length ?? 0;
  const isReconciling = pending > 0 || ids.isFetching || (query.isFetching && Boolean(query.data)) || (total > 0 && items.length === 0 && !query.isError);
  return {
    ...query, items, total, hasMore: Boolean(query.hasNextPage), isReconciling,
    isLoading: ids.isLoading || (query.isPending && enabled && pending === 0),
    isError: ids.isError || query.isError,
    fetchNextPage: () => {
      if (pending || query.isFetching || !query.hasNextPage) { return Promise.resolve(); }
      // A failed refetch leaves old offsets in cache. Rebuild them before append.
      if (query.isRefetchError) { return query.refetch({ cancelRefetch: false }); }
      return query.fetchNextPage({ cancelRefetch: false });
    },
    retry: async () => {
      await ids.refetch();
      return query.refetch();
    },
  };
}
