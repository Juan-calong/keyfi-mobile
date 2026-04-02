import * as Keychain from "react-native-keychain";

const SERVICE = "keyfi.security.prefs";

export type SecurityPrefs = {
  biometricEnabled: boolean;
  biometricOwnerUserId: string | null;

  // legado: mantido só para não quebrar partes antigas do app
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

function normalizeSecurityPrefs(raw: any): SecurityPrefs {
  return {
    biometricEnabled: !!raw?.biometricEnabled,
    biometricOwnerUserId:
      typeof raw?.biometricOwnerUserId === "string" &&
      raw.biometricOwnerUserId.trim().length > 0
        ? raw.biometricOwnerUserId
        : null,

    // PIN desativado de propósito
    pinEnabled: false,
    pinSalt: null,
    pinHash: null,
    pinOwnerUserId: null,

    relockOnBackground:
      typeof raw?.relockOnBackground === "boolean"
        ? raw.relockOnBackground
        : DEFAULT_PREFS.relockOnBackground,

    relockAfterMs:
      typeof raw?.relockAfterMs === "number" &&
      Number.isFinite(raw.relockAfterMs) &&
      raw.relockAfterMs >= 0
        ? raw.relockAfterMs
        : DEFAULT_PREFS.relockAfterMs,

    lastBackgroundAt:
      typeof raw?.lastBackgroundAt === "number" &&
      Number.isFinite(raw.lastBackgroundAt)
        ? raw.lastBackgroundAt
        : null,
  };
}

export async function loadSecurityPrefs(): Promise<SecurityPrefs> {
  try {
    const creds = await Keychain.getGenericPassword({ service: SERVICE });

    if (!creds || !creds.password) {
      return DEFAULT_PREFS;
    }

    const parsed = JSON.parse(creds.password);
    return normalizeSecurityPrefs(parsed);
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function saveSecurityPrefs(next: SecurityPrefs) {
  const safePrefs = normalizeSecurityPrefs(next);

  await Keychain.setGenericPassword("security", JSON.stringify(safePrefs), {
    service: SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function updateSecurityPrefs(
  patch: Partial<SecurityPrefs>
): Promise<SecurityPrefs> {
  const current = await loadSecurityPrefs();
  const next = normalizeSecurityPrefs({
    ...current,
    ...patch,
  });

  await saveSecurityPrefs(next);
  return next;
}

export async function clearSecurityPrefs() {
  await Keychain.resetGenericPassword({ service: SERVICE });
}