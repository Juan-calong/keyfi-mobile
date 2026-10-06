import type { AxiosRequestConfig } from 'axios';
import { api } from '../../core/api/client';
import { endpoints } from '../../core/api/endpoints';
import { assertSessionGeneration } from '../../core/queries/sessionScope';
import type { FavoriteItemBase } from './components/SharedFavoritesScreen';

export type FavoritePage = { items: FavoriteItemBase[]; page: number; limit: number; total: number; hasMore: boolean };
export async function getFavoriteIds(signal: AbortSignal, generation: number): Promise<string[]> {
  assertSessionGeneration(generation);
  const { data } = await api.get(endpoints.products.favoriteIds, { signal });
  assertSessionGeneration(generation);
  if (!Array.isArray(data?.productIds) || data.productIds.some((id: unknown) => typeof id !== 'string' || !id.trim())) {
    throw new Error('Invalid favorite IDs response');
  }
  return [...new Set<string>(data.productIds)];
}
export async function getFavoritesPage(page: number, limit: number, signal: AbortSignal, generation: number): Promise<FavoritePage> {
  assertSessionGeneration(generation);
  const { data } = await api.get<FavoritePage>(endpoints.products.favorites, { params: { page, limit }, signal });
  assertSessionGeneration(generation);
  if (!Array.isArray(data?.items) || data.page !== page || data.limit !== limit ||
      !Number.isInteger(data.total) || data.total < 0 || typeof data.hasMore !== 'boolean') {
    throw new Error('Invalid favorites page response');
  }
  return data;
}
export async function setProductFavorite(productId: string, favorited: boolean, generation: number): Promise<{ favorited: boolean }> {
  assertSessionGeneration(generation);
  const config: AxiosRequestConfig & { _sessionGeneration: number } = { _sessionGeneration: generation };
  const { data } = favorited
    ? await api.put(endpoints.products.favorite(productId), undefined, config)
    : await api.delete(endpoints.products.favorite(productId), config);
  assertSessionGeneration(generation);
  if (typeof data?.favorited !== 'boolean') { throw new Error('Invalid favorite mutation response'); }
  return data;
}
