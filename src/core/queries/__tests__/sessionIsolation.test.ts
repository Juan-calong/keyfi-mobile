import { encode } from 'base-64';
import { queryClient } from '../../../app/AppProviders';
import { useAuthStore } from '../../../stores/auth.store';
import { AuthService } from '../../api/services/auth.service';
import { clearToken, loadToken, loadTokenWithBiometrics, saveToken } from '../../security/keychain';
import { ProfilesService } from '../../api/services/profiles.service';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('@react-navigation/native', () => ({ NavigationContainer: 'NavigationContainer' }));
jest.mock('airbridge-react-native-sdk', () => ({ Airbridge: { setUserID: jest.fn(), clearUser: jest.fn() } }));
jest.mock('../../security/keychain', () => ({ clearToken: jest.fn(), saveToken: jest.fn(), loadToken: jest.fn(), loadTokenWithBiometrics: jest.fn(), disableBiometricLogin: jest.fn() }));
jest.mock('../../push/push.service', () => ({ removePushTokenFromBackend: jest.fn() }));
jest.mock('../../api/services/auth.service', () => ({ AuthService: { logout: jest.fn(), refresh: jest.fn(), login: jest.fn(), loginWithSocial: jest.fn() } }));
jest.mock('../../api/services/profiles.service', () => ({ ProfilesService: { me: jest.fn() } }));

function token(sub: string) { return `x.${encode(JSON.stringify({ sub, role: 'CUSTOMER' }))}.x`; }
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}
beforeEach(() => {
  queryClient.clear();
  queryClient.setDefaultOptions({ queries: { gcTime: 0, retry: false }, mutations: { gcTime: 0 } });
  useAuthStore.setState({ token: null, activeRole: null });
  jest.clearAllMocks();
  (saveToken as jest.Mock).mockReset();
  (ProfilesService.me as jest.Mock).mockResolvedValue({ role: 'CUSTOMER' });
});
afterEach(() => queryClient.clear());

it('hides A and cancels its request immediately while remote logout is pending, then isolates B', async () => {
  await useAuthStore.getState().setSession(token('A'));
  queryClient.setQueryData(['favorites', 'ids', 'A', 'CUSTOMER'], ['private-A']);
  const late = deferred<string[]>();
  let signal!: AbortSignal;
  const fetchA = queryClient.fetchQuery({ queryKey: ['private-A'], queryFn: (ctx) => { signal = ctx.signal; return late.promise; } }).catch(() => undefined);
  const remote = deferred<void>();
  (AuthService.logout as jest.Mock).mockReturnValue(remote.promise);
  const logout = useAuthStore.getState().logout();
  expect(useAuthStore.getState().token).toBeNull();
  expect(signal.aborted).toBe(true);
  expect(queryClient.getQueryData(['favorites', 'ids', 'A', 'CUSTOMER'])).toBeUndefined();
  await useAuthStore.getState().setSession(token('B'));
  expect(queryClient.getQueryData(['favorites', 'ids', 'B', 'CUSTOMER'])).toBeUndefined();
  late.resolve(['private-A']);
  remote.resolve();
  await Promise.all([fetchA, logout]);
  expect(useAuthStore.getState().token).toBe(token('B'));
  expect(queryClient.getQueryData(['private-A'])).toBeUndefined();
  await queryClient.fetchQuery({ queryKey: ['favorites', 'ids', 'B', 'CUSTOMER'], queryFn: async () => ['private-B'] });
  expect(queryClient.getQueryData(['favorites', 'ids', 'B', 'CUSTOMER'])).toEqual(['private-B']);
});

it('does not apply a refresh response from A after B logs in', async () => {
  await useAuthStore.getState().setSession(token('A'));
  const late = deferred<{ accessToken: string }>();
  (AuthService.refresh as jest.Mock).mockReturnValue(late.promise);
  const refresh = useAuthStore.getState().refreshSession().catch(() => undefined);
  await useAuthStore.getState().setSession(token('B'));
  late.resolve({ accessToken: token('A') });
  await refresh;
  expect(useAuthStore.getState().token).toBe(token('B'));
});

it('clears private cached queries when role changes', async () => {
  await useAuthStore.getState().setSession(token('A'));
  queryClient.setQueryData(['private-data'], ['customer-only']);
  useAuthStore.getState().setRole('SALON_OWNER');
  expect(queryClient.getQueryData(['private-data'])).toBeUndefined();
});

it('does not apply a late persisted login A over B', async () => {
  const persisted = deferred<void>();
  (saveToken as jest.Mock).mockReturnValueOnce(persisted.promise);
  const loginA = useAuthStore.getState().setSession(token('A')).catch(() => undefined);
  await Promise.resolve(); await Promise.resolve();
  const loginB = useAuthStore.getState().setSession(token('B'));
  persisted.resolve(); await Promise.all([loginA, loginB]);
  expect(useAuthStore.getState().token).toBe(token('B'));
});
it('does not hydrate A from storage over a new B session', async () => {
  const stored = deferred<string>();
  (loadToken as jest.Mock).mockReturnValue(stored.promise);
  const hydration = useAuthStore.getState().hydrate();
  await useAuthStore.getState().setSession(token('B'));
  stored.resolve(token('A')); await hydration;
  expect(useAuthStore.getState().token).toBe(token('B'));
});
it('does not apply late biometric A over a new B session', async () => {
  const stored = deferred<{ token: string }>();
  (loadTokenWithBiometrics as jest.Mock).mockReturnValue(stored.promise);
  const biometric = useAuthStore.getState().loginWithBiometrics().catch(() => undefined);
  await useAuthStore.getState().setSession(token('B'));
  stored.resolve({ token: token('A') }); await biometric;
  expect(useAuthStore.getState().token).toBe(token('B'));
});
it('keeps B as the last persisted token when storage write A finishes late', async () => {
  let persisted: string | null = null;
  const late = deferred<void>();
  (saveToken as jest.Mock).mockImplementation(async (value: string) => {
    if (value === token('A')) { await late.promise; }
    persisted = value;
  });
  const loginA = useAuthStore.getState().setSession(token('A')).catch(() => undefined);
  await Promise.resolve(); await Promise.resolve();
  const loginB = useAuthStore.getState().setSession(token('B'));
  await Promise.resolve(); await Promise.resolve();
  late.resolve(); await Promise.all([loginA, loginB]);
  expect(persisted).toBe(token('B'));
  expect(useAuthStore.getState().token).toBe(token('B'));
});

it('clears persisted credentials without waiting for remote logout', async () => {
  await useAuthStore.getState().setSession(token('A'));
  const remote = deferred<void>();
  (AuthService.logout as jest.Mock).mockReturnValue(remote.promise);
  const logout = useAuthStore.getState().logout();
  await Promise.resolve(); await Promise.resolve();
  expect(clearToken).toHaveBeenCalled();
  remote.resolve(); await logout;
});
it('finishes hydration when me updates the role', async () => {
  useAuthStore.setState({ hydrated: false });
  (loadToken as jest.Mock).mockResolvedValue(token('A'));
  (ProfilesService.me as jest.Mock).mockResolvedValue({ role: 'SALON_OWNER' });
  await useAuthStore.getState().hydrate();
  expect(useAuthStore.getState().hydrated).toBe(true);
  expect(useAuthStore.getState().activeRole).toBe('SALON_OWNER');
});
it('reset invalidates a login that has not yet published its persisted token', async () => {
  const pending = deferred<void>();
  (saveToken as jest.Mock).mockReturnValueOnce(pending.promise);
  const login = useAuthStore.getState().setSession(token('A')).catch(() => undefined);
  await Promise.resolve(); await Promise.resolve();
  const reset = useAuthStore.getState().resetSession().catch(() => undefined);
  pending.resolve(); await Promise.all([login, reset]);
  expect(useAuthStore.getState().token).toBeNull();
});

it('does not apply an HTTP login A after logout and a new B session', async () => {
  const late = deferred<{ accessToken: string }>();
  (AuthService.login as jest.Mock).mockReturnValue(late.promise);
  const login = useAuthStore.getState().login('A@example.test', 'password').catch(() => undefined);
  await useAuthStore.getState().logout();
  await useAuthStore.getState().setSession(token('B'));
  late.resolve({ accessToken: token('A') }); await login;
  expect(useAuthStore.getState().token).toBe(token('B'));
});
