import React from 'react';
import { Linking } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Airbridge } from 'airbridge-react-native-sdk';
import App from '../../../../App';
import { api } from '../../api/client';
import * as invites from '../../airbridge/invite-link.service';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('airbridge-react-native-sdk', () => ({ Airbridge: { setOnDeeplinkReceived: jest.fn() } }));
jest.mock('../../api/client', () => ({ api: { post: jest.fn() } }));
jest.mock('../../../stores/auth.store', () => {
  const session = { hydrated: true, token: 'session', activeRole: 'CUSTOMER', hydrate: jest.fn() };
  const store = Object.assign((selector: any) => selector(session), { getState: () => session });
  return { useAuthStore: store };
});
jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: any) => children,
  CommonActions: { navigate: jest.fn() },
}));
jest.mock('@tanstack/react-query', () => ({ QueryClientProvider: ({ children }: any) => children }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaProvider: ({ children }: any) => children }));
jest.mock('../../../navigation/RootNavigator', () => ({ RootNavigator: () => null }));
jest.mock('../../../navigation/navigationRef', () => ({ navigationRef: { isReady: () => false } }));
jest.mock('../../queries/queryLifecycle', () => ({ bindQueryLifecycle: () => () => {} }));
jest.mock('../../queries/queryClient', () => ({ queryClient: { invalidateQueries: jest.fn() } }));
jest.mock('../../push/push.service', () => ({
  bindForegroundPushListener: () => () => {},
  bindPushOpenListener: () => () => {},
  bindPushTokenRefresh: () => () => {},
  bindNotifeePushOpenListener: () => () => {},
  handleInitialPushOpen: async () => {},
  registerPushTokenWithBackend: async () => {},
}));
jest.mock('../../notifications/notification-actions', () => ({
  clearPendingNotificationAction: jest.fn(),
  handleNotificationClick: jest.fn(),
  loadPendingNotificationAction: async () => null,
  normalizePayload: jest.fn(),
  savePendingNotificationAction: jest.fn(),
}));

const post = api.post as jest.Mock;
const successfulResponse = { data: { ok: true, applied: true } };
let root: ReactTestRenderer;
let airbridgeCallback: (url: string) => void;
let linkingCallback: (event: { url: string }) => void;

function deferred() {
  let resolve!: (value: typeof successfulResponse) => void;
  const promise = new Promise<typeof successfulResponse>((done) => { resolve = done; });
  return { promise, resolve };
}

function inviteUrl(type: 'SELLER' | 'SALON', token: string) {
  const param = type === 'SELLER' ? 'seller_ref' : 'salon_ref';
  return `keyfi://mp-connected?link_type=${type}_INVITE&${param}=${token}&v=1`;
}

async function deliver(callback: () => void) {
  await act(async () => { callback(); });
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  post.mockReset().mockResolvedValue(successfulResponse);
  jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
  jest.spyOn(Linking, 'addEventListener').mockImplementation((_type, callback: any) => {
    linkingCallback = callback;
    return { remove: jest.fn() };
  });
  (Airbridge.setOnDeeplinkReceived as jest.Mock).mockImplementation((callback) => { airbridgeCallback = callback; });
  await act(async () => { root = create(<App />); });
  jest.clearAllMocks();
});

afterEach(async () => {
  await act(async () => { root.unmount(); });
  jest.restoreAllMocks();
});

it.each(['SELLER', 'SALON'] as const)('processes concurrent Airbridge + Linking %s delivery only once', async (type) => {
  const save = jest.spyOn(invites, 'savePendingInvite');
  const gate = deferred();
  post.mockReturnValue(gate.promise);
  const url = inviteUrl(type, 'ABC12345');
  await deliver(() => { airbridgeCallback(url); linkingCallback({ url }); });
  const callsWhilePending = { saves: save.mock.calls.length, posts: post.mock.calls.length };
  await act(async () => { gate.resolve(successfulResponse); });
  expect(callsWhilePending).toEqual({ saves: 1, posts: 1 });
  expect(post).toHaveBeenCalledWith('/seller/referrals/apply', {
    linkType: `${type}_INVITE`,
    [type === 'SELLER' ? 'sellerReferralToken' : 'salonReferralToken']: 'ABC12345',
  });
});

it('uses parsed type + token even when raw URLs differ', async () => {
  const save = jest.spyOn(invites, 'savePendingInvite');
  const gate = deferred();
  post.mockReturnValue(gate.promise);
  await deliver(() => {
    airbridgeCallback(inviteUrl('SELLER', 'ABC12345'));
    linkingCallback({ url: 'keyfi://mp-connected?invite_ref=ABC12345&invite_type=seller&extra=1' });
  });
  const counts = [save.mock.calls.length, post.mock.calls.length];
  await act(async () => { gate.resolve(successfulResponse); });
  expect(counts).toEqual([1, 1]);
});

it('processes different concurrent tokens with their own POST payloads', async () => {
  const gate = deferred();
  post.mockReturnValue(gate.promise);
  await deliver(() => {
    airbridgeCallback(inviteUrl('SELLER', 'ABC12345'));
    linkingCallback({ url: inviteUrl('SELLER', 'XYZ12345') });
  });
  await act(async () => { gate.resolve(successfulResponse); });
  expect(post.mock.calls).toEqual([
    ['/seller/referrals/apply', { linkType: 'SELLER_INVITE', sellerReferralToken: 'ABC12345' }],
    ['/seller/referrals/apply', { linkType: 'SELLER_INVITE', sellerReferralToken: 'XYZ12345' }],
  ]);
});

it('keeps SELLER and SALON with the same token as different keys', async () => {
  const gate = deferred();
  post.mockReturnValue(gate.promise);
  await deliver(() => {
    airbridgeCallback(inviteUrl('SELLER', 'ABC12345'));
    linkingCallback({ url: inviteUrl('SALON', 'ABC12345') });
  });
  await act(async () => { gate.resolve(successfulResponse); });
  expect(post.mock.calls).toEqual([
    ['/seller/referrals/apply', { linkType: 'SELLER_INVITE', sellerReferralToken: 'ABC12345' }],
    ['/seller/referrals/apply', { linkType: 'SALON_INVITE', salonReferralToken: 'ABC12345' }],
  ]);
});

it('allows retry after the first POST rejects', async () => {
  post.mockRejectedValueOnce(new Error('offline'));
  const url = inviteUrl('SELLER', 'ABC12345');
  await deliver(() => { airbridgeCallback(url); });
  await deliver(() => { linkingCallback({ url }); });
  expect(post).toHaveBeenCalledTimes(2);
});

it('allows retry after saving the pending invite rejects', async () => {
  const save = jest.spyOn(invites, 'savePendingInvite').mockRejectedValueOnce(new Error('storage unavailable'));
  const url = inviteUrl('SALON', 'ABC12345');
  await deliver(() => { airbridgeCallback(url); });
  await deliver(() => { linkingCallback({ url }); });
  expect(save).toHaveBeenCalledTimes(2);
  expect(post).toHaveBeenCalledTimes(1);
});

it('allows the same URL again after successful processing finishes', async () => {
  const url = inviteUrl('SELLER', 'ABC12345');
  await deliver(() => { airbridgeCallback(url); });
  await deliver(() => { linkingCallback({ url }); });
  expect(post).toHaveBeenCalledTimes(2);
});

it('does not merge keys by uppercasing the parser token', async () => {
  const save = jest.spyOn(invites, 'savePendingInvite');
  const gate = deferred();
  post.mockReturnValue(gate.promise);
  await deliver(() => {
    airbridgeCallback(inviteUrl('SELLER', 'abc12345'));
    linkingCallback({ url: inviteUrl('SELLER', 'ABC12345') });
  });
  const savedTokens = save.mock.calls.map(([invite]) => invite.token);
  await act(async () => { gate.resolve(successfulResponse); });
  expect(savedTokens).toEqual(['abc12345', 'ABC12345']);
  expect(post).toHaveBeenCalledTimes(2);
});

it('does not clear a different pending invite when an earlier POST succeeds', async () => {
  const first = deferred();
  const second = deferred();
  post.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  await deliver(() => {
    airbridgeCallback(inviteUrl('SELLER', 'ABC12345'));
    linkingCallback({ url: inviteUrl('SALON', 'XYZ12345') });
  });
  await act(async () => { first.resolve(successfulResponse); });
  const remainingPending = await invites.getPendingInvite();
  await act(async () => { second.resolve({ data: { ok: true, applied: false } }); });
  expect(remainingPending).toMatchObject({ inviteType: 'SALON', token: 'XYZ12345' });
});

it('allows retry after the API returns applied false', async () => {
  post.mockResolvedValueOnce({ data: { ok: true, applied: false } });
  const url = inviteUrl('SALON', 'ABC12345');
  await deliver(() => { airbridgeCallback(url); });
  await deliver(() => { linkingCallback({ url }); });
  expect(post).toHaveBeenCalledTimes(2);
});
