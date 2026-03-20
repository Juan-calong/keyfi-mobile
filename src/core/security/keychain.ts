import * as Keychain from "react-native-keychain";

const SERVICE = "keyfi.session";

export async function saveToken(token: string) {
  await Keychain.setGenericPassword("token", token, { service: SERVICE });
}

export async function loadToken(): Promise<string | null> {
  const creds = await Keychain.getGenericPassword({ service: SERVICE });
  return creds ? creds.password : null;
}

export async function clearToken() {
  await Keychain.resetGenericPassword({ service: SERVICE });
}