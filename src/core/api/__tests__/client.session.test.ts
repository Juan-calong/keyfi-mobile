import { AxiosError, AxiosHeaders } from 'axios';
import { api } from '../client';
import { advanceSessionGeneration } from '../../queries/sessionScope';
import { useAuthStore } from '../../../stores/auth.store';

jest.mock('react-native-config', () => ({ API_BASE_URL: 'https://example.test' }));
jest.mock('../../../stores/auth.store', () => ({ useAuthStore: { getState: jest.fn() } }));
it('does not refresh or retry an old private HTTP request under B credentials', async () => {
  let rejectA!: (error: unknown) => void;
  const refreshSession = jest.fn();
  const resetSession = jest.fn();
  (useAuthStore.getState as jest.Mock).mockReturnValue({ token: 'A', activeRole: 'CUSTOMER', refreshSession, resetSession });
  api.defaults.adapter = (config) => new Promise((_resolve, reject) => {
    rejectA = () => reject(new AxiosError('Unauthorized', '401', config, {}, { status: 401, statusText: '', config, headers: new AxiosHeaders(), data: {} }));
  });
  const request = api.get('/products/favorites/ids').catch((e) => e);
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  advanceSessionGeneration();
  (useAuthStore.getState as jest.Mock).mockReturnValue({ token: 'B', activeRole: 'CUSTOMER', refreshSession, resetSession });
  rejectA(null);
  await request;
  expect(refreshSession).not.toHaveBeenCalled();
  expect(resetSession).not.toHaveBeenCalled();
});
it('retries a same-session private request using the renewed access token', async () => {
  const session = { token: 'expired', activeRole: 'CUSTOMER', refreshSession: jest.fn(), resetSession: jest.fn() };
  session.refreshSession.mockImplementation(async () => { session.token = 'renewed'; });
  (useAuthStore.getState as jest.Mock).mockImplementation(() => session);
  const headers: unknown[] = [];
  api.defaults.adapter = async (config) => {
    headers.push(config.headers.get('Authorization'));
    if (config.headers.get('Authorization') === 'Bearer expired') {
      throw new AxiosError('Unauthorized', '401', config, {}, { status: 401, statusText: '', config, headers: new AxiosHeaders(), data: {} });
    }
    return { status: 200, statusText: 'OK', config, headers: new AxiosHeaders(), data: { productIds: ['p'] } };
  };
  const result = await api.get('/products/favorites/ids').catch((e) => e);
  expect(result.data).toEqual({ productIds: ['p'] });
  expect(headers).toEqual(['Bearer expired', 'Bearer renewed']);
});
it('keeps explicit logout cleanup credentials and never refreshes another user for that cleanup', async () => {
  const refreshSession = jest.fn(); const resetSession = jest.fn();
  (useAuthStore.getState as jest.Mock).mockReturnValue({ token: 'B', activeRole: 'CUSTOMER', refreshSession, resetSession });
  let authorization: unknown;
  api.defaults.adapter = async (config) => {
    authorization = config.headers.get('Authorization');
    throw new AxiosError('Unauthorized', '401', config, {}, { status: 401, statusText: '', config, headers: new AxiosHeaders(), data: {} });
  };
  const config = { headers: { Authorization: 'Bearer A' }, _preserveAuthorization: true, _skipAuthRefresh: true };
  await api.post('/devices/push-token/remove', { token: 'device' }, config).catch(() => undefined);
  expect(authorization).toBe('Bearer A'); expect(refreshSession).not.toHaveBeenCalled();
});
