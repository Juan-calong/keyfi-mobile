import { Alert, Linking } from 'react-native';
import { openWhatsAppSupport } from '../support.service';

const expectedUrl =
  'https://wa.me/5511996827356?text=Ol%C3%A1%2C%20preciso%20de%20suporte%20com%20a%20KeyFi.';

afterEach(() => jest.restoreAllMocks());

it('opens the HTTPS WhatsApp contact with the international phone and encoded message', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await openWhatsAppSupport();
  expect(open).toHaveBeenCalledTimes(1);
  expect(open).toHaveBeenCalledWith(expectedUrl);
  const url = open.mock.calls[0][0];
  expect(url.split('?')[0]).toBe('https://wa.me/5511996827356');
  expect(decodeURIComponent(url.split('?text=')[1])).toBe(
    'Olá, preciso de suporte com a KeyFi.',
  );
  expect(alert).not.toHaveBeenCalled();
});

it('handles a rejected Linking call and shows a user alert without rejecting', async () => {
  jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('No URL handler'));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await expect(openWhatsAppSupport()).resolves.toBeUndefined();
  expect(alert).toHaveBeenCalledWith(
    'Suporte',
    'Não foi possível abrir o suporte. Tente novamente mais tarde.',
  );
});

it('handles a synchronous Linking failure without crashing', async () => {
  jest.spyOn(Linking, 'openURL').mockImplementation(() => {
    throw new Error('Native failure');
  });
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await expect(openWhatsAppSupport()).resolves.toBeUndefined();
  expect(alert).toHaveBeenCalledTimes(1);
});
