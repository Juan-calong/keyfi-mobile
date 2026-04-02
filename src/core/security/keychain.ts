import * as Keychain from "react-native-keychain";

const SESSION_SERVICE = "keyfi.session";
const BIO_META_SERVICE = "keyfi.biometric.meta";
const BIO_TOKEN_SERVICE = "keyfi.biometric.token";

export async function saveToken(token: string) {
  await Keychain.setGenericPassword("token", token, {
    service: SESSION_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function loadToken(): Promise<string | null> {
  const creds = await Keychain.getGenericPassword({
    service: SESSION_SERVICE,
  });

  return creds ? creds.password : null;
}

export async function clearToken() {
  await Keychain.resetGenericPassword({
    service: SESSION_SERVICE,
  });
}

export async function getBiometricStatus(): Promise<{
  available: boolean;
  enabled: boolean;
  biometryType: Keychain.BIOMETRY_TYPE | null;
  email: string | null;
}> {
  const biometryType = await Keychain.getSupportedBiometryType();

  if (!biometryType) {
    return {
      available: false,
      enabled: false,
      biometryType: null,
      email: null,
    };
  }

  const meta = await Keychain.getGenericPassword({
    service: BIO_META_SERVICE,
  });

  return {
    available: true,
    enabled: !!meta,
    biometryType,
    email: meta ? meta.username : null,
  };
}

export async function enableBiometricLogin(params: {
  email: string;
  token: string;
}) {
  const email = params.email.trim().toLowerCase();
  const token = params.token?.trim();

  if (!email) {
    throw new Error("Email inválido para ativar biometria.");
  }

  if (!token) {
    throw new Error("Token inválido para ativar biometria.");
  }

  await Keychain.setGenericPassword(email, "enabled", {
    service: BIO_META_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });

  const saved = await Keychain.setGenericPassword(email, token, {
    service: BIO_TOKEN_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
    authenticationPrompt: {
      title: "Ativar biometria",
      subtitle: "Use sua biometria para acessar sua conta",
      description: "Esse acesso ficará vinculado a este aparelho",
      cancel: "Cancelar",
    },
  });

  if (!saved) {
    throw new Error("Não foi possível ativar a biometria neste aparelho.");
  }
}

export async function loadTokenWithBiometrics(): Promise<{
  token: string;
  email: string | null;
} | null> {
  const creds = await Keychain.getGenericPassword({
    service: BIO_TOKEN_SERVICE,
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
    authenticationPrompt: {
      title: "Entrar com biometria",
      subtitle: "Confirme sua identidade",
      description: "Use Face ID ou digital para acessar sua conta",
      cancel: "Usar senha",
    },
  });

  if (!creds) return null;

  return {
    token: creds.password,
    email: creds.username ?? null,
  };
}

export async function disableBiometricLogin() {
  await Keychain.resetGenericPassword({
    service: BIO_META_SERVICE,
  });

  await Keychain.resetGenericPassword({
    service: BIO_TOKEN_SERVICE,
  });
}