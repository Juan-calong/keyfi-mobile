import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getSessionGeneration } from '../../core/queries/sessionScope';
import { favoritesKeys } from './favorites.keys';
import { setProductFavorite } from './favorites.service';
import { useFavoriteSession } from './useFavoriteIds';
import { beginFavoriteIntent, favoriteSessionKey, finishFavoriteIntent, isLatestFavoriteIntent } from './favoriteMutations';

type DesiredFavorite = { productId: string; favorited: boolean };
type Intent = DesiredFavorite & { sequence: number; previous: boolean; cancellation: Promise<unknown> };
function updateIds(ids: string[], productId: string, favorited: boolean) {
  return favorited ? (ids.includes(productId) ? ids : [...ids, productId]) : ids.filter((id) => id !== productId);
}
export function useSetFavorite(productId: string) {
  const client = useQueryClient();
  const { userId, role, generation, enabled } = useFavoriteSession();
  const session = favoriteSessionKey(userId, role, generation);
  const idsKey = favoritesKeys.ids(userId ?? '', role);
  const listKey = favoritesKeys.list(userId ?? '', role);
  const valid = () => enabled && generation === getSessionGeneration();
  const latest = (intent: Intent) => valid() && isLatestFavoriteIntent(client, session, intent.productId, intent.sequence);
  const mutation = useMutation({
    mutationKey: favoritesKeys.mutation(userId ?? '', role),
    scope: { id: `${session}:${productId}` },
    retry: false,
    mutationFn: (intent: Intent) => {
      if (!valid()) { throw new Error('SESSION_SUPERSEDED'); }
      return setProductFavorite(intent.productId, intent.favorited, generation);
    },
    onMutate: async (intent) => { await intent.cancellation; return intent; },
    onSuccess: (data, intent) => {
      if (latest(intent)) { client.setQueryData<string[]>(idsKey, (ids) => ids ? updateIds(ids, intent.productId, data.favorited) : ids); }
    },
    onError: (_error, intent) => {
      if (latest(intent)) { client.setQueryData<string[]>(idsKey, (ids) => ids ? updateIds(ids, intent.productId, intent.previous) : ids); }
    },
    onSettled: async (_data, _error, _intent) => {
      const idle = finishFavoriteIntent(client, session);
      if (!valid()) { return; }
      // Mark both stale on every settle; defer GET until all optimistic intents finish.
      await Promise.all([
        client.invalidateQueries({ queryKey: idsKey, refetchType: idle ? 'active' : 'none' }),
        client.invalidateQueries({ queryKey: listKey, refetchType: idle ? 'active' : 'none' }),
      ]);
    },
  });
  const prepare = (input: DesiredFavorite): Intent => {
    const ids = client.getQueryData<string[]>(idsKey);
    if (!valid() || !ids || input.productId !== productId) { throw new Error('Favorite membership unavailable'); }
    const previous = ids.includes(productId);
    const sequence = beginFavoriteIntent(client, session, productId);
    const cancellation = Promise.all([client.cancelQueries({ queryKey: idsKey }), client.cancelQueries({ queryKey: listKey })]);
    // Prepare synchronously so two clicks in the same frame see the latest intent.
    // onMutate waits for cancellation before any HTTP can start.
    client.setQueryData(idsKey, updateIds(ids, productId, input.favorited));
    return { ...input, previous, sequence, cancellation };
  };
  const mutateAsync = (input: DesiredFavorite) => mutation.mutateAsync(prepare(input));
  return {
    ...mutation,
    mutateAsync,
    mutate: (input: DesiredFavorite) => { mutateAsync(input).catch(() => { /* Error state and reconciliation are handled above. */ }); },
    toggle: () => mutateAsync({ productId, favorited: !client.getQueryData<string[]>(idsKey)?.includes(productId) }),
  };
}
