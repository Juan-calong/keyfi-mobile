import * as Keychain from "react-native-keychain";

const SERVICE = "keyfi.security.prefs";

export type SecurityPrefs = {
  biometricEnabled: boolean;
  biometricOwnerUserId: string | null;

  pinEnabled: boolean;
  pinSalt: string | null;
  pinHash: string | null;
  pinOwnerUserId: string | null;

  relockOnBackground: boolean;
  relockAfterMs: number;

  lastBackgroundAt: number | null;
};

export const DEFAULT_PREFS: SecurityPrefs = {
  biometricEnabled: false,
  biometricOwnerUserId: null,

  pinEnabled: false,
  pinSalt: null,
  pinHash: null,
  pinOwnerUserId: null,

  relockOnBackground: true,
  relockAfterMs: 15_000,

  lastBackgroundAt: null,
};

export async function loadSecurityPrefs(): Promise<SecurityPrefs> {
  try {
    const creds = await Keychain.getGenericPassword({ service: SERVICE });

    if (creds === false) {
      return DEFAULT_PREFS;
    }

    if (!creds.password) {
      return DEFAULT_PREFS;
    }

    const parsed = JSON.parse(creds.password);

    return {
      biometricEnabled: !!parsed?.biometricEnabled,
      biometricOwnerUserId:
        typeof parsed?.biometricOwnerUserId === "string"
          ? parsed.biometricOwnerUserId
          : null,

      pinEnabled: !!parsed?.pinEnabled,
      pinSalt: typeof parsed?.pinSalt === "string" ? parsed.pinSalt : null,
      pinHash: typeof parsed?.pinHash === "string" ? parsed.pinHash : null,
      pinOwnerUserId:
        typeof parsed?.pinOwnerUserId === "string" ? parsed.pinOwnerUserId : null,

      relockOnBackground:
        typeof parsed?.relockOnBackground === "boolean"
          ? parsed.relockOnBackground
          : DEFAULT_PREFS.relockOnBackground,

      relockAfterMs:
        typeof parsed?.relockAfterMs === "number"
          ? parsed.relockAfterMs
          : DEFAULT_PREFS.relockAfterMs,

      lastBackgroundAt:
        typeof parsed?.lastBackgroundAt === "number"
          ? parsed.lastBackgroundAt
          : null,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function saveSecurityPrefs(next: SecurityPrefs) {
  await Keychain.setGenericPassword("security", JSON.stringify(next), {
    service: SERVICE,
  });
}

export async function clearSecurityPrefs() {
  await Keychain.resetGenericPassword({ service: SERVICE });
}