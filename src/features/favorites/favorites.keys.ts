import type { Role } from '../../stores/auth.store';

export const favoritesKeys = {
  ids: (userId: string, role: Role | null) => ['favorites', 'ids', userId, role] as const,
  list: (userId: string, role: Role | null) => ['favorites', 'list', userId, role] as const,
  mutation: (userId: string, role: Role | null) => ['favorites', 'set', userId, role] as const,
};
