import { create } from "zustand";
import { Airbridge } from "airbridge-react-native-sdk";
import {
  clearToken,
  loadToken,
  saveToken,
  getBiometricStatus,
  enableBiometricLogin as saveBiometricToken,
  loadTokenWithBiometrics,
  disableBiometricLogin,
} from "../core/security/keychain";
import { AuthService, type SocialLoginPayload } from "../core/api/services/auth.service";
import { ProfilesService } from "../core/api/services/profiles.service";
import { decode as atob } from "base-64";
import { removePushTokenFromBackend } from "../core/push/push.service";
import { useCartStore } from "./cart.store";
import { queryClient } from "../app/AppProviders";

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
    // Intencional: falha silenciosa para não bloquear fluxo de autenticação.
    return null;
  }
}


function isJwtExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;

  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now;
}

function resolveAirbridgeUserId(me: any): string | null {
  const userId =
    me?.id ??
    me?.userId ??
    me?.user?.id ??
    me?.profile?.id ??
    null;

  if (userId == null) return null;

  const normalized = String(userId).trim();
  return normalized || null;
}

function syncAirbridgeUserSafe(me: any) {
  try {
    const userId = resolveAirbridgeUserId(me);

    if (!userId) {
      return;
    }

    Airbridge.setUserID(userId);
  } catch {
    // Intencional: falha silenciosa para não bloquear fluxo de autenticação.
  }
}

function clearAirbridgeUserSafe() {
  try {
    Airbridge.clearUser();
  } catch {
    // Não bloqueia logout/reset se Airbridge falhar.
  }
}

function getTokenUserId(token: string | null | undefined): string | null {
  if (!token) return null;
  const sub = decodeJwtPayload(token)?.sub;
  if (sub == null) return null;
  const normalized = String(sub).trim();
  return normalized || null;
}

function clearSessionScopedClientState() {
  useCartStore.getState().clear();
  queryClient.clear();
}

function getErrorStatus(e: any): number | null {
  const status = e?.response?.status;
  return typeof status === "number" ? status : null;
}

function getErrorCode(e: any): string {
  return String(
    e?.response?.data?.code ??
      e?.response?.data?.error ??
      e?.code ??
      ""
  )
    .trim()
    .toUpperCase();
}

function getErrorMessage(e: any): string {
  return String(
    e?.response?.data?.message ?? e?.message ?? ""
  )
    .trim()
    .toUpperCase();
}

function isDefinitiveAuthFailure(e: any): boolean {
  const status = getErrorStatus(e);
  const code = getErrorCode(e);
  const message = getErrorMessage(e);

  if (status === 401 || status === 403) {
    return true;
  }

  const authErrorTokens = [
    "TOKEN_INVALID",
    "TOKEN_EXPIRED",
    "INVALID_TOKEN",
    "EXPIRED_TOKEN",
    "SESSION_INVALID",
    "SESSION_EXPIRED",
    "INVALID_SESSION",
    "UNAUTHORIZED",
    "FORBIDDEN",
  ];

  return authErrorTokens.some(
    (token) => code.includes(token) || message.includes(token)
  );
}

export type Role =
  | "SALON_OWNER"
  | "SELLER"
  | "ADMIN"
  | "CUSTOMER"
  | "PENDING";

type AuthState = {
  token: string | null;
  activeRole: Role | null;
  hydrated: boolean;
  needsOnboarding: boolean;

  needsBiometricSetup: boolean;
  pendingBiometricEmail: string | null;

  hydrate: () => Promise<void>;
  setRole: (role: Role) => void;
  setNeedsOnboarding: (v: boolean) => void;

  setSession: (token: string, role?: Role | null) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithSocial: (payload: SocialLoginPayload) => Promise<any>;
  loginWithBiometrics: () => Promise<void>;

  queueBiometricSetup: (email: string) => Promise<void>;
  skipBiometricSetup: () => void;
  enableBiometricsForCurrentSession: (email?: string) => Promise<void>;
  disableBiometricsForCurrentSession: () => Promise<void>;

  refreshSession: () => Promise<void>;
  syncMe: () => Promise<boolean>;

  resetSession: () => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  activeRole: null,
  hydrated: false,
  needsOnboarding: false,

  needsBiometricSetup: false,
  pendingBiometricEmail: null,

  hydrate: async () => {
    try {
      const token = await loadToken();

      if (!token) {
        clearAirbridgeUserSafe();

        set({
          token: null,
          activeRole: null,
          needsOnboarding: false,
          needsBiometricSetup: false,
          pendingBiometricEmail: null,
          hydrated: true,
        });
        return;
      }

      if (isJwtExpired(token)) {

        try {
          await get().refreshSession();

          try {
            await get().syncMe();
          } catch {
            await clearToken();
            clearAirbridgeUserSafe();

            set({
              token: null,
              activeRole: null,
              needsOnboarding: false,
              needsBiometricSetup: false,
              pendingBiometricEmail: null,
              hydrated: true,
            });
            return;
          }

          set({
            hydrated: true,
          });
          return;
        } catch {
          await clearToken();
          clearAirbridgeUserSafe();

          set({
            token: null,
            activeRole: null,
            needsOnboarding: false,
            needsBiometricSetup: false,
            pendingBiometricEmail: null,
            hydrated: true,
          });
          return;
        }
      }

      const payload = decodeJwtPayload(token);
      const role = (payload?.role as Role) ?? null;
      const onboardingStatus = String(payload?.onboardingStatus || "");

      clearSessionScopedClientState();

      set({
        token,
        activeRole: role,
        needsOnboarding: onboardingStatus === "INCOMPLETE",
        needsBiometricSetup: false,
        pendingBiometricEmail: null,
        hydrated: false,
      });

      try {
        await get().syncMe();

        set({
          hydrated: true,
        });
      } catch {
        await clearToken();
        clearAirbridgeUserSafe();

        set({
          token: null,
          activeRole: null,
          needsOnboarding: false,
          needsBiometricSetup: false,
          pendingBiometricEmail: null,
          hydrated: true,
        });
      }
    } catch {
      await clearToken();
      clearAirbridgeUserSafe();

      set({
        token: null,
        activeRole: null,
        needsOnboarding: false,
        needsBiometricSetup: false,
        pendingBiometricEmail: null,
        hydrated: true,
      });
    }
  },

  setRole: (activeRole) => set({ activeRole }),
  setNeedsOnboarding: (v) => set({ needsOnboarding: v }),

  setSession: async (token, role = null) => {
    const previousToken = get().token;
    const previousUserId = getTokenUserId(previousToken);
    const nextUserId = getTokenUserId(token);
    const shouldClearScopedState =
      previousUserId !== nextUserId || (!previousUserId && !!nextUserId);

    if (shouldClearScopedState) {
      clearSessionScopedClientState();
    }
    await saveToken(token);

    const payload = decodeJwtPayload(token);

    const resolvedRole = ((payload?.role as Role) ?? role) || null;
    const onboardingStatus = String(payload?.onboardingStatus || "");

    set({
      token,
      activeRole: resolvedRole,
      needsOnboarding: onboardingStatus === "INCOMPLETE",
      needsBiometricSetup: false,
      pendingBiometricEmail: null,
    });

    try {
      await get().syncMe();
    } catch {
      clearAirbridgeUserSafe();
    }
  },

  login: async (email, password) => {

    try {
      const data = await AuthService.login(email, password);
      const token = data.accessToken ?? data.token;
      if (!token) throw new Error("Login não retornou token.");

      await get().setSession(token, data?.user?.role ?? null);
      await get().queueBiometricSetup(email);
    } catch (e: any) {
      throw e;
    }
  },

    loginWithSocial: async (payload) => {
    const data = await AuthService.loginWithSocial(payload);
    const token = data?.accessToken ?? data?.token;

    if (!token) throw new Error("Login social não retornou token.");

    await get().setSession(token, data?.user?.role ?? null);
    return data;
  },

  loginWithBiometrics: async () => {
    const clearBiometricSession = async () => {
      await clearToken();
      await disableBiometricLogin();
      clearAirbridgeUserSafe();

      set({
        token: null,
        activeRole: null,
        needsOnboarding: false,
        needsBiometricSetup: false,
        pendingBiometricEmail: null,
      });
    };

      const clearActiveSessionOnly = async () => {
      await clearToken();
      clearAirbridgeUserSafe();
      set({
        token: null,
        activeRole: null,
        needsOnboarding: false,
        needsBiometricSetup: false,
        pendingBiometricEmail: null,
      });
    };

    const creds = await loadTokenWithBiometrics();
    let token = creds?.token?.trim();

    if (!token) {
      await clearBiometricSession();
      throw new Error(
        "Não foi possível acessar sua biometria. Entre com email e senha novamente."
      );
    }

    const applyTokenToState = async (nextToken: string) => {
      const payload = decodeJwtPayload(nextToken);
      const role = (payload?.role as Role) ?? null;
      const onboardingStatus = String(payload?.onboardingStatus || "");

      await saveToken(nextToken);

      set({
        token: nextToken,
        activeRole: role,
        needsOnboarding: onboardingStatus === "INCOMPLETE",
        needsBiometricSetup: false,
        pendingBiometricEmail: null,
      });
      };
      await applyTokenToState(token);

    if (isJwtExpired(token)) {
      try {
        await get().refreshSession();
        token = get().token?.trim();

        if (!token || isJwtExpired(token)) {
          throw new Error("Refresh não renovou a sessão biométrica.");
        }

        if (creds?.email) {
          await saveBiometricToken({
            email: creds.email,
            token,
          });
        }
      } catch (e: any) {
        const status = getErrorStatus(e);
        const code = getErrorCode(e);
        const message = String(e?.message ?? "");

        console.warn("[BIOMETRIC_LOGIN][REFRESH_FAILED]", {
          status,
          code,
          message,
        });

        if (isDefinitiveAuthFailure(e)) {
          await clearBiometricSession();
          throw new Error(
            "Sua sessão biométrica expirou. Entre com email e senha novamente."
          );
        }

        await clearActiveSessionOnly();
        throw new Error(
          "Não foi possível validar sua sessão agora. Verifique sua conexão e tente novamente."
        );
        }
      }

    try {
      await get().syncMe();
    } catch (e: any) {
      const status = getErrorStatus(e);
      const code = getErrorCode(e);
      const message = String(e?.message ?? "");

      console.warn("[BIOMETRIC_LOGIN][SYNC_FAILED]", {
        status,
        code,
        message,
      });

      if (isDefinitiveAuthFailure(e)) {
        await clearBiometricSession();
        throw new Error(
          "Sua sessão biométrica expirou. Entre com email e senha novamente."
        );
      }

      await clearActiveSessionOnly();
      throw new Error(
        "Não foi possível validar sua sessão agora. Verifique sua conexão e tente novamente."
      );
    }
  },

  queueBiometricSetup: async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      set({
        needsBiometricSetup: false,
        pendingBiometricEmail: null,
      });
      return;
    }

    try {
      const status = await getBiometricStatus();

      if (!status.available || status.enabled) {
        set({
          needsBiometricSetup: false,
          pendingBiometricEmail: null,
        });
        return;
      }

      set({
        needsBiometricSetup: true,
        pendingBiometricEmail: normalizedEmail,
      });
    } catch {
      set({
        needsBiometricSetup: false,
        pendingBiometricEmail: null,
      });
    }
  },

  skipBiometricSetup: () => {
    set({
      needsBiometricSetup: false,
      pendingBiometricEmail: null,
    });
  },

  enableBiometricsForCurrentSession: async (email?: string) => {
    const fallbackEmail = get().pendingBiometricEmail ?? "";
    const normalizedEmail = String(email ?? fallbackEmail).trim().toLowerCase();

    if (!normalizedEmail) {
      throw new Error("Email inválido para ativar biometria.");
    }

    let token = get().token;

    if (!token) {
      throw new Error("Não existe sessão ativa para vincular a biometria.");
    }

    if (isJwtExpired(token)) {

      await get().refreshSession();
      token = get().token;

      if (!token) {
        throw new Error("Não foi possível renovar a sessão para ativar biometria.");
      }
    }

    await saveBiometricToken({
      email: normalizedEmail,
      token,
    });

    set({
      needsBiometricSetup: false,
      pendingBiometricEmail: null,
    });

  },

  disableBiometricsForCurrentSession: async () => {
    await disableBiometricLogin();

    set({
      needsBiometricSetup: false,
      pendingBiometricEmail: null,
    });

  },

  refreshSession: async () => {

    const data = await AuthService.refresh();
    if (!data?.accessToken) {
      throw new Error("Refresh não retornou accessToken.");
    }

    const payload = decodeJwtPayload(data.accessToken);

    const role = (payload?.role as Role) ?? null;
    const onboardingStatus = String(payload?.onboardingStatus || "");

    if (!role) {
      throw new Error("Refresh retornou token sem role.");
    }

    await saveToken(data.accessToken);

    set({
      token: data.accessToken,
      activeRole: role,
      needsOnboarding: onboardingStatus === "INCOMPLETE",
    });
  },

  syncMe: async () => {
    const token = get().token;
    if (!token) {
      clearAirbridgeUserSafe();
      return false;
    }

    const me = await ProfilesService.me();

    syncAirbridgeUserSafe(me);

    const nextRole = (me?.role as Role) ?? null;
    const nextNeedsOnboarding =
      String(me?.onboardingStatus || "") === "INCOMPLETE";

    const prevRole = get().activeRole;
    const prevNeeds = get().needsOnboarding;

    set({
      activeRole: nextRole,
      needsOnboarding: nextNeedsOnboarding,
    });

    return prevRole !== nextRole || prevNeeds !== nextNeedsOnboarding;
  },

  resetSession: async () => {
    clearSessionScopedClientState();
    await clearToken();
    clearAirbridgeUserSafe();

    set({
      token: null,
      activeRole: null,
      needsOnboarding: false,
      needsBiometricSetup: false,
      pendingBiometricEmail: null,
    });
  },

  logout: async () => {
    try {
      await AuthService.logout();
    } catch {
      // A limpeza local não depende do logout remoto.
    } finally {
      try {
        await removePushTokenFromBackend();
      } catch {
        // Uma falha ao remover o token push não pode manter a sessão local ativa.
      }

      try {
        await disableBiometricLogin();
      } catch {
        // A limpeza do token de sessão continua obrigatória.
      }

      await get().resetSession();
    }
  },
}));
