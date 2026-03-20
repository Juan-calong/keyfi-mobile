import { create } from "zustand";
import { decode as atob } from "base-64";

import { useAuthStore } from "./auth.store";
import {
  DEFAULT_PREFS,
  loadSecurityPrefs,
  saveSecurityPrefs,
  type SecurityPrefs,
} from "../core/security/securityPrefs";
import {
  getBiometricAvailability,
  promptBiometricUnlock,
  type BiometryLabel,
} from "../core/security/biometric";
import {
  generatePinSalt,
  hashPin,
  isValidPin,
  normalizePin,
  verifyPin,
} from "../core/security/pin";

function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getUserIdFromToken(token: string | null) {
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  return typeof payload?.sub === "string" ? payload.sub : null;
}

type PersistedSecuritySnapshot = {
  biometricOwnerUserId: string | null;
  pinSalt: string | null;
  pinHash: string | null;
  pinOwnerUserId: string | null;
  relockOnBackground: boolean;
  relockAfterMs: number;
  lastBackgroundAt: number | null;
};

function buildSecurityPrefs(snapshot: PersistedSecuritySnapshot): SecurityPrefs {
  return {
    biometricEnabled: !!snapshot.biometricOwnerUserId,
    biometricOwnerUserId: snapshot.biometricOwnerUserId,

    pinEnabled: !!snapshot.pinSalt && !!snapshot.pinHash && !!snapshot.pinOwnerUserId,
    pinSalt: snapshot.pinSalt,
    pinHash: snapshot.pinHash,
    pinOwnerUserId: snapshot.pinOwnerUserId,

    relockOnBackground: snapshot.relockOnBackground,
    relockAfterMs: snapshot.relockAfterMs,

    lastBackgroundAt: snapshot.lastBackgroundAt,
  };
}

type SecurityState = {
  loaded: boolean;
  syncedUserId: string | null;

  biometricAvailable: boolean;
  biometryType: BiometryLabel;
  biometricEnabled: boolean;
  biometricOwnerUserId: string | null;

  pinEnabled: boolean;
  pinSalt: string | null;
  pinHash: string | null;
  pinOwnerUserId: string | null;
  failedPinAttempts: number;
  maxPinAttempts: number;

  relockOnBackground: boolean;
  relockAfterMs: number;

  appUnlocked: boolean;
  lastBackgroundAt: number | null;

  hydrate: () => Promise<void>;
  refreshAvailability: () => Promise<void>;
  syncForCurrentUser: (token: string | null) => Promise<void>;

  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => Promise<void>;

  setupPin: (pin: string) => Promise<{ ok: boolean; error?: string }>;
  disablePin: () => Promise<void>;
  unlockWithPin: (pin: string) => Promise<boolean>;

  lockApp: () => void;
  unlockApp: () => void;
  unlockWithBiometrics: () => Promise<boolean>;

  markBackgroundNow: () => Promise<void>;
  resetLocalProtection: () => Promise<void>;
};

export const useSecurityStore = create<SecurityState>((set, get) => ({
  loaded: false,
  syncedUserId: null,

  biometricAvailable: false,
  biometryType: null,
  biometricEnabled: false,
  biometricOwnerUserId: null,

  pinEnabled: false,
  pinSalt: null,
  pinHash: null,
  pinOwnerUserId: null,
  failedPinAttempts: 0,
  maxPinAttempts: 5,

  relockOnBackground: DEFAULT_PREFS.relockOnBackground,
  relockAfterMs: DEFAULT_PREFS.relockAfterMs,

  appUnlocked: true,
  lastBackgroundAt: null,

  hydrate: async () => {
    const prefs = await loadSecurityPrefs();
    const availability = await getBiometricAvailability();

    set({
      loaded: true,
      syncedUserId: null,

      biometricAvailable: availability.available,
      biometryType: availability.biometryType,

      // carregamos os dados brutos
      // mas só ativamos para o usuário certo no syncForCurrentUser
      biometricEnabled: false,
      biometricOwnerUserId: prefs.biometricOwnerUserId ?? null,

      pinEnabled: false,
      pinSalt: prefs.pinSalt ?? null,
      pinHash: prefs.pinHash ?? null,
      pinOwnerUserId: prefs.pinOwnerUserId ?? null,

      failedPinAttempts: 0,

      relockOnBackground: prefs.relockOnBackground,
      relockAfterMs: prefs.relockAfterMs,

      appUnlocked: true,
      lastBackgroundAt: prefs.lastBackgroundAt ?? null,
    });
  },

  refreshAvailability: async () => {
    const availability = await getBiometricAvailability();

    if (!availability.available && get().biometricOwnerUserId) {
      const nextPrefs = buildSecurityPrefs({
        biometricOwnerUserId: null,
        pinSalt: get().pinSalt,
        pinHash: get().pinHash,
        pinOwnerUserId: get().pinOwnerUserId,
        relockOnBackground: get().relockOnBackground,
        relockAfterMs: get().relockAfterMs,
        lastBackgroundAt: get().lastBackgroundAt,
      });

      await saveSecurityPrefs(nextPrefs);

      set({
        biometricAvailable: false,
        biometryType: null,
        biometricEnabled: false,
        biometricOwnerUserId: null,
      });

      return;
    }

    set({
      biometricAvailable: availability.available,
      biometryType: availability.biometryType,
    });
  },

  syncForCurrentUser: async (token) => {
    const currentUserId = getUserIdFromToken(token);

    if (!token || !currentUserId) {
      set({
        syncedUserId: null,
        biometricEnabled: false,
        pinEnabled: false,
        failedPinAttempts: 0,
        appUnlocked: true,
      });
      return;
    }

    const canUseBiometric =
      !!get().biometricAvailable &&
      !!get().biometricOwnerUserId &&
      get().biometricOwnerUserId === currentUserId;

    const canUsePin =
      !!get().pinSalt &&
      !!get().pinHash &&
      !!get().pinOwnerUserId &&
      get().pinOwnerUserId === currentUserId;

    set({
      syncedUserId: currentUserId,
      biometricEnabled: canUseBiometric,
      pinEnabled: canUsePin,
      failedPinAttempts: 0,
      appUnlocked: true,
    });
  },

  enableBiometric: async () => {
    const availability = await getBiometricAvailability();

    if (!availability.available) {
      set({
        biometricAvailable: false,
        biometryType: null,
      });
      return false;
    }

    const token = useAuthStore.getState().token;
    const userId = getUserIdFromToken(token);

    if (!userId) {
      return false;
    }

    const ok = await promptBiometricUnlock();
    if (!ok) return false;

    const nextPrefs = buildSecurityPrefs({
      biometricOwnerUserId: userId,
      pinSalt: get().pinSalt,
      pinHash: get().pinHash,
      pinOwnerUserId: get().pinOwnerUserId,
      relockOnBackground: get().relockOnBackground,
      relockAfterMs: get().relockAfterMs,
      lastBackgroundAt: null,
    });

    await saveSecurityPrefs(nextPrefs);

    set({
      biometricAvailable: true,
      biometryType: availability.biometryType,
      biometricEnabled: true,
      biometricOwnerUserId: userId,
      syncedUserId: userId,
      appUnlocked: true,
      lastBackgroundAt: null,
    });

    return true;
  },

  disableBiometric: async () => {
    const nextPrefs = buildSecurityPrefs({
      biometricOwnerUserId: null,
      pinSalt: get().pinSalt,
      pinHash: get().pinHash,
      pinOwnerUserId: get().pinOwnerUserId,
      relockOnBackground: get().relockOnBackground,
      relockAfterMs: get().relockAfterMs,
      lastBackgroundAt: null,
    });

    await saveSecurityPrefs(nextPrefs);

    set({
      biometricEnabled: false,
      biometricOwnerUserId: null,
      appUnlocked: true,
      failedPinAttempts: 0,
      lastBackgroundAt: null,
    });
  },

  setupPin: async (pin) => {
    const normalized = normalizePin(pin);

    if (!isValidPin(normalized)) {
      return { ok: false, error: "O PIN deve ter 6 dígitos." };
    }

    const token = useAuthStore.getState().token;
    const userId = getUserIdFromToken(token);

    if (!userId) {
      return { ok: false, error: "Sessão inválida para configurar PIN." };
    }

    const salt = generatePinSalt();
    const hashed = hashPin(normalized, salt);

    const nextPrefs = buildSecurityPrefs({
      biometricOwnerUserId: get().biometricOwnerUserId,
      pinSalt: salt,
      pinHash: hashed,
      pinOwnerUserId: userId,
      relockOnBackground: get().relockOnBackground,
      relockAfterMs: get().relockAfterMs,
      lastBackgroundAt: null,
    });

    await saveSecurityPrefs(nextPrefs);

    set({
      pinEnabled: true,
      pinSalt: salt,
      pinHash: hashed,
      pinOwnerUserId: userId,
      syncedUserId: userId,
      failedPinAttempts: 0,
      appUnlocked: true,
      lastBackgroundAt: null,
    });

    return { ok: true };
  },

  disablePin: async () => {
    const nextPrefs = buildSecurityPrefs({
      biometricOwnerUserId: get().biometricOwnerUserId,
      pinSalt: null,
      pinHash: null,
      pinOwnerUserId: null,
      relockOnBackground: get().relockOnBackground,
      relockAfterMs: get().relockAfterMs,
      lastBackgroundAt: null,
    });

    await saveSecurityPrefs(nextPrefs);

    set({
      pinEnabled: false,
      pinSalt: null,
      pinHash: null,
      pinOwnerUserId: null,
      failedPinAttempts: 0,
      appUnlocked: true,
      lastBackgroundAt: null,
    });
  },

  lockApp: () =>
    set({
      appUnlocked: false,
      failedPinAttempts: 0,
    }),

  unlockApp: () =>
    set({
      appUnlocked: true,
      failedPinAttempts: 0,
    }),

  unlockWithBiometrics: async () => {
    if (!get().biometricEnabled) {
      return false;
    }

    const ok = await promptBiometricUnlock();
    if (!ok) {
      return false;
    }

    const nextPrefs = buildSecurityPrefs({
      biometricOwnerUserId: get().biometricOwnerUserId,
      pinSalt: get().pinSalt,
      pinHash: get().pinHash,
      pinOwnerUserId: get().pinOwnerUserId,
      relockOnBackground: get().relockOnBackground,
      relockAfterMs: get().relockAfterMs,
      lastBackgroundAt: null,
    });

    set({
      appUnlocked: true,
      failedPinAttempts: 0,
      lastBackgroundAt: null,
    });

    await saveSecurityPrefs(nextPrefs);

    return true;
  },

  unlockWithPin: async (pin) => {
    const normalized = normalizePin(pin);

    if (!isValidPin(normalized)) {
      return false;
    }

    const token = useAuthStore.getState().token;
    const userId = getUserIdFromToken(token);

    if (!userId) return false;
    if (!get().pinEnabled) return false;
    if (!get().pinSalt || !get().pinHash) return false;
    if (get().pinOwnerUserId !== userId) return false;

    const ok = verifyPin(normalized, get().pinSalt!, get().pinHash!);

    if (ok) {
      const nextPrefs = buildSecurityPrefs({
        biometricOwnerUserId: get().biometricOwnerUserId,
        pinSalt: get().pinSalt,
        pinHash: get().pinHash,
        pinOwnerUserId: get().pinOwnerUserId,
        relockOnBackground: get().relockOnBackground,
        relockAfterMs: get().relockAfterMs,
        lastBackgroundAt: null,
      });

      set({
        appUnlocked: true,
        failedPinAttempts: 0,
        lastBackgroundAt: null,
      });

      await saveSecurityPrefs(nextPrefs);
      return true;
    }

    const nextAttempts = get().failedPinAttempts + 1;

    set({
      failedPinAttempts: nextAttempts,
    });

    if (nextAttempts >= get().maxPinAttempts) {
      await useAuthStore.getState().logout();
      set({
        appUnlocked: true,
        failedPinAttempts: 0,
        lastBackgroundAt: null,
      });
    }

    return false;
  },

  markBackgroundNow: async () => {
    const now = Date.now();

    const nextPrefs = buildSecurityPrefs({
      biometricOwnerUserId: get().biometricOwnerUserId,
      pinSalt: get().pinSalt,
      pinHash: get().pinHash,
      pinOwnerUserId: get().pinOwnerUserId,
      relockOnBackground: get().relockOnBackground,
      relockAfterMs: get().relockAfterMs,
      lastBackgroundAt: now,
    });

    set({
      lastBackgroundAt: now,
    });

    await saveSecurityPrefs(nextPrefs);
  },

  resetLocalProtection: async () => {
    const nextPrefs = buildSecurityPrefs({
      biometricOwnerUserId: get().biometricOwnerUserId,
      pinSalt: get().pinSalt,
      pinHash: get().pinHash,
      pinOwnerUserId: get().pinOwnerUserId,
      relockOnBackground: get().relockOnBackground,
      relockAfterMs: get().relockAfterMs,
      lastBackgroundAt: null,
    });

    set({
      appUnlocked: true,
      failedPinAttempts: 0,
      lastBackgroundAt: null,
    });

    await saveSecurityPrefs(nextPrefs);
  },
}));