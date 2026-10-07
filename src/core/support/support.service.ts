import { Alert, Linking } from 'react-native';

export const SUPPORT_PHONE = '5511996827356';
export const SUPPORT_MESSAGE = 'Olá, preciso de suporte com a KeyFi.';
export const WHATSAPP_SUPPORT_URL = `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(
  SUPPORT_MESSAGE,
)}`;

export async function openWhatsAppSupport(): Promise<void> {
  try {
    await Linking.openURL(WHATSAPP_SUPPORT_URL);
  } catch {
    Alert.alert(
      'Suporte',
      'Não foi possível abrir o suporte. Tente novamente mais tarde.',
    );
  }
}
