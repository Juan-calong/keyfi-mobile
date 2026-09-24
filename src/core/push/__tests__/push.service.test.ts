import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';
import { api } from '../../api/client';
import { bindPushTokenRefresh, registerPushTokenWithBackend } from '../push.service';

jest.mock('@react-native-firebase/messaging', () => {
  const instance = {
    requestPermission: jest.fn(),
    registerDeviceForRemoteMessages: jest.fn(),
    getToken: jest.fn(),
    onTokenRefresh: jest.fn(),
  };
  const factory = () => instance;
  factory.AuthorizationStatus = { AUTHORIZED: 1, PROVISIONAL: 2 };
  return { __esModule: true, default: factory };
});
jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: { requestPermission: jest.fn(), createChannel: jest.fn() },
  AndroidImportance: { HIGH: 4 },
  EventType: {},
}));
jest.mock('../../api/client', () => ({ api: { post: jest.fn() } }));

const firebase = messaging() as jest.Mocked<ReturnType<typeof messaging>>;
const local = notifee as jest.Mocked<typeof notifee>;
const post = api.post as jest.Mock;
const fakeToken = 'fcm-secret-token-that-must-never-appear-in-logs';

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
  (firebase.requestPermission as jest.Mock).mockResolvedValue(1);
  (firebase.registerDeviceForRemoteMessages as jest.Mock).mockResolvedValue(undefined);
  (firebase.getToken as jest.Mock).mockResolvedValue(fakeToken);
  (local.requestPermission as jest.Mock).mockResolvedValue({});
  post.mockResolvedValue({});
});

test.each([
  ['permission', () => (firebase.requestPermission as jest.Mock).mockRejectedValue(new Error(fakeToken))],
  ['register_remote_messages', () => (firebase.registerDeviceForRemoteMessages as jest.Mock).mockRejectedValue(new Error(fakeToken))],
  ['get_fcm_token', () => (firebase.getToken as jest.Mock).mockRejectedValue(new Error(fakeToken))],
  ['backend_registration', () => post.mockRejectedValue({ name: 'AxiosError', code: 'ERR_NETWORK', message: fakeToken, config: { headers: { Authorization: fakeToken } } })],
])('logs safe %s failure and keeps registration best effort', async (stage, fail) => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    fail();
    await expect(registerPushTokenWithBackend()).resolves.toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.objectContaining({
      event: 'push_registration_failed', platform: 'ios', stage,
    }));
    expect(JSON.stringify(warn.mock.calls)).not.toContain(fakeToken);
  } finally {
    warn.mockRestore();
  }
});

test('keeps a hyphenated RNFirebase code without logging sensitive error data', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    (firebase.registerDeviceForRemoteMessages as jest.Mock).mockRejectedValue({
      name: 'NativeFirebaseError',
      code: 'messaging/unknown-error',
      message: fakeToken,
      config: { headers: { Authorization: fakeToken } },
    });

    await expect(registerPushTokenWithBackend()).resolves.toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.objectContaining({
      event: 'push_registration_failed',
      platform: 'ios',
      stage: 'register_remote_messages',
      errorName: 'NativeFirebaseError',
      errorCode: 'messaging/unknown-error',
    }));
    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).not.toContain(fakeToken);
    expect(logged).not.toContain('Authorization');
    expect(logged).not.toContain('config');
  } finally {
    warn.mockRestore();
  }
});

test('reports denied permission without requesting a remote token', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    (firebase.requestPermission as jest.Mock).mockResolvedValue(0);
    await expect(registerPushTokenWithBackend()).resolves.toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.objectContaining({
      event: 'push_registration_failed', stage: 'permission', errorCode: 'permission_denied',
    }));
    expect(firebase.getToken).not.toHaveBeenCalled();
  } finally {
    warn.mockRestore();
  }
});

test('registers token with backend without logging it', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    await expect(registerPushTokenWithBackend()).resolves.toBe(fakeToken);
    expect(post).toHaveBeenCalledWith('/devices/push-token', { token: fakeToken, platform: 'IOS' });
    expect(warn).not.toHaveBeenCalled();
  } finally {
    warn.mockRestore();
  }
});

test('token refresh reports backend failure without logging the token', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    let onRefresh: (token: string) => Promise<void> = async () => {};
    (firebase.onTokenRefresh as jest.Mock).mockImplementation((callback) => {
      onRefresh = callback;
      return () => {};
    });
    post.mockRejectedValue({ name: 'AxiosError', code: 'ERR_NETWORK', message: fakeToken });
    bindPushTokenRefresh();
    await onRefresh(fakeToken);
    expect(warn).toHaveBeenCalledWith(expect.objectContaining({
      event: 'push_registration_failed', stage: 'backend_registration',
    }));
    expect(JSON.stringify(warn.mock.calls)).not.toContain(fakeToken);
  } finally {
    warn.mockRestore();
  }
});
