import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/auth.store';
import { getTokenUserId, getSessionGeneration } from '../../core/queries/sessionScope';
import { favoritesKeys } from './favorites.keys';
import { getFavoriteIds } from './favorites.service';
import { favoriteSessionKey, useFavoritePending, waitForFavoriteIntents } from './favoriteMutations';

const sets = new WeakMap<string[], ReadonlySet<string>>();
const emptySet: ReadonlySet<string> = new Set();
export function useFavoriteSession() {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.activeRole);
  const userId = getTokenUserId(token);
  return { userId, role, generation: getSessionGeneration(), enabled: Boolean(token && userId && (role === 'CUSTOMER' || role === 'SALON_OWNER')) };
}
export function useFavoriteIds({ reconcileOnMount = false }: { reconcileOnMount?: boolean } = {}) {
  const { userId, role, generation, enabled } = useFavoriteSession();
  const client = useQueryClient();
  const session = favoriteSessionKey(userId, role, generation);
  const pending = useFavoritePending(client, session);
  const query = useQuery({
    queryKey: favoritesKeys.ids(userId ?? '', role),
    queryFn: async ({ signal }) => { await waitForFavoriteIntents(client, session, signal); return getFavoriteIds(signal, generation); },
    enabled: enabled && pending === 0,
    staleTime: 30_000,
    refetchOnMount: reconcileOnMount ? 'always' : true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  const productIds = enabled ? query.data : undefined;
  let favoriteIdsSet = productIds ? sets.get(productIds) : emptySet;
  if (productIds && !favoriteIdsSet) { favoriteIdsSet = new Set(productIds); sets.set(productIds, favoriteIdsSet); }
  return {
    ...query, productIds, favoriteIdsSet: favoriteIdsSet ?? emptySet,
    isFavorite: (productId: string): boolean | undefined => productIds === undefined ? undefined : favoriteIdsSet?.has(productId),
    isLoading: enabled && productIds === undefined && !query.isError,
  };
}
