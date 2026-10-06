import React from 'react';
import { act } from 'react-test-renderer';
import { AppState, type AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { harness, flush, deferred } from '../../../features/favorites/testing/testUtils';
import { api } from '../../api/client';
import { bindQueryLifecycle } from '../queryLifecycle';
import { useFavoriteIds } from '../../../features/favorites/useFavoriteIds';
import { useSetFavorite } from '../../../features/favorites/useSetFavorite';
import { favoritesKeys } from '../../../features/favorites/favorites.keys';

jest.mock('@react-native-community/netinfo', () => ({ addEventListener: jest.fn() }));
let appEvent!: (state: AppStateStatus) => void;
let netEvent!: (state: { isConnected: boolean | null; isInternetReachable: boolean | null }) => void;
let removeApp: jest.Mock;
let removeNet: jest.Mock;
beforeEach(() => {
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true, writable: true });
  removeApp = jest.fn(); removeNet = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, handler) => { appEvent = handler; return { remove: removeApp }; });
  (NetInfo.addEventListener as jest.Mock).mockImplementation((handler) => { netEvent = handler; return removeNet; });
});
afterEach(() => jest.restoreAllMocks());

it('binds only one global listener and cleans both subscriptions', () => {
  const first = bindQueryLifecycle(); const second = bindQueryLifecycle();
  expect(AppState.addEventListener).toHaveBeenCalledTimes(1);
  expect(NetInfo.addEventListener).toHaveBeenCalledTimes(1);
  first(); expect(removeApp).not.toHaveBeenCalled();
  second(); expect(removeApp).toHaveBeenCalledTimes(1); expect(removeNet).toHaveBeenCalledTimes(1);
});
it('background → foreground refetches stale IDs through focusManager', async () => {
  const h = harness();
  const cleanup = bindQueryLifecycle();
  let ids!: ReturnType<typeof useFavoriteIds>;
  function Probe() { ids = useFavoriteIds(); return null; }
  (api.get as jest.Mock).mockResolvedValue({ data: { productIds: [] } });
  try {
    await h.mount(<Probe />);
    act(() => appEvent('background')); expect(focusManager.isFocused()).toBe(false);
    await act(async () => { await h.client.invalidateQueries({ queryKey: favoritesKeys.ids('A', 'CUSTOMER'), refetchType: 'none' }); });
    (api.get as jest.Mock).mockResolvedValue({ data: { productIds: ['external'] } });
    act(() => appEvent('active')); await flush();
    expect(ids.isFavorite('external')).toBe(true);
  } finally { cleanup(); await h.cleanup(); }
});
it('offline → online resumes intention and reconciles an uncertain timeout using GET', async () => {
  const h = harness(); const cleanup = bindQueryLifecycle();
  let ids!: ReturnType<typeof useFavoriteIds>; let mutation!: ReturnType<typeof useSetFavorite>;
  function Probe() { ids = useFavoriteIds(); mutation = useSetFavorite('p'); return null; }
  (api.get as jest.Mock).mockResolvedValue({ data: { productIds: [] } });
  (api.put as jest.Mock).mockImplementation(async () => { (api.get as jest.Mock).mockResolvedValue({ data: { productIds: ['p'] } }); throw new Error('timeout'); });
  try {
    await h.mount(<Probe />);
    act(() => netEvent({ isConnected: false, isInternetReachable: false })); expect(onlineManager.isOnline()).toBe(false);
    let promise!: Promise<unknown>;
    act(() => { promise = mutation.mutateAsync({ productId: 'p', favorited: true }).catch(() => undefined); });
    await flush(); expect(ids.isFavorite('p')).toBe(true); expect(api.put).not.toHaveBeenCalled();
    act(() => netEvent({ isConnected: true, isInternetReachable: true }));
    await act(async () => { await promise; }); await flush();
    expect(ids.isFavorite('p')).toBe(true); expect(api.put).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledTimes(2);
  } finally { cleanup(); await h.cleanup(); }
});
it('focus/network GET cannot overwrite optimistic IDs while a mutation is pending', async () => {
  const h = harness(); const cleanup = bindQueryLifecycle();
  let ids!: ReturnType<typeof useFavoriteIds>; let mutation!: ReturnType<typeof useSetFavorite>;
  function Probe() { ids = useFavoriteIds(); mutation = useSetFavorite('p'); return null; }
  const response = deferred<{ data: { favorited: boolean } }>();
  (api.get as jest.Mock).mockResolvedValue({ data: { productIds: [] } });
  (api.put as jest.Mock).mockReturnValue(response.promise);
  try {
    await h.mount(<Probe />);
    let intent!: Promise<unknown>;
    act(() => { intent = mutation.mutateAsync({ productId: 'p', favorited: true }); }); await flush();
    act(() => { appEvent('background'); appEvent('active'); netEvent({ isConnected: false, isInternetReachable: false }); netEvent({ isConnected: true, isInternetReachable: true }); });
    await flush(); expect(ids.isFavorite('p')).toBe(true); expect(api.get).toHaveBeenCalledTimes(1);
    (api.get as jest.Mock).mockResolvedValue({ data: { productIds: ['p'] } });
    response.resolve({ data: { favorited: true } }); await act(async () => { await intent; }); await flush();
    expect(ids.isFavorite('p')).toBe(true);
  } finally { cleanup(); await h.cleanup(); }
});
