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
import { AuthService } from "../core/api/services/auth.service";
import { ProfilesService } from "../core/api/services/profiles.service";
import { decode as atob } from "base-64";
import { removePushTokenFromBackend } from "../core/push/push.service";

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

function tokenPreview(token: string | null | undefined) {
  if (!token) return null;
  if (token.length <= 20) return token;
  return `${token.slice(0, 12)}...${token.slice(-8)}`;
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
      console.log("[AIRBRIDGE][AUTH][SYNC_USER][SKIP_NO_USER_ID]");
      return;
    }

    Airbridge.setUserID(userId);

    console.log("[AIRBRIDGE][AUTH][SYNC_USER][DONE]", {
      userId,
    });
  } catch (e: any) {
    console.log("[AIRBRIDGE][AUTH][SYNC_USER][ERROR]", {
      message: e?.message,
    });
  }
}

function clearAirbridgeUserSafe() {
  try {
    Airbridge.clearUser();

    console.log("[AIRBRIDGE][AUTH][CLEAR_USER][DONE]");
  } catch (e: any) {
    console.log("[AIRBRIDGE][AUTH][CLEAR_USER][ERROR]", {
      message: e?.message,
    });
  }
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

      console.log("[AUTH][HYDRATE]", {
        hasToken: !!token,
        tokenPreview: tokenPreview(token),
      });

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
        console.log("[AUTH][HYDRATE] access token expirado, tentando refresh");

        try {
          await get().refreshSession();

          try {
            await get().syncMe();
          } catch (e: any) {
            console.log("[AUTH][HYDRATE][SYNC_ME_AFTER_REFRESH_ERROR]", {
              message: e?.message,
              status: e?.response?.status,
              data: e?.response?.data,
            });

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
        } catch (e: any) {
          console.log("[AUTH][HYDRATE][REFRESH_FAIL]", {
            message: e?.message,
            status: e?.response?.status,
            data: e?.response?.data,
          });

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
      console.log("[AUTH][HYDRATE][JWT_PAYLOAD]", payload);

      const role = (payload?.role as Role) ?? null;
      const onboardingStatus = String(payload?.onboardingStatus || "");

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
      } catch (e: any) {
        console.log("[AUTH][HYDRATE][SYNC_ME_ERROR]", {
          message: e?.message,
          status: e?.response?.status,
          data: e?.response?.data,
        });

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
    } catch (e: any) {
      console.log("[AUTH][HYDRATE][FATAL_ERROR]", {
        message: e?.message,
      });

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
    console.log("[AUTH][SET_SESSION]", {
      role,
      tokenPreview: tokenPreview(token),
    });

    await saveToken(token);

    const payload = decodeJwtPayload(token);
    console.log("[AUTH][SET_SESSION][JWT_PAYLOAD]", payload);

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
    } catch (e: any) {
      console.log("[AUTH][SET_SESSION][SYNC_ME_ERROR]", {
        message: e?.message,
        status: e?.response?.status,
        data: e?.response?.data,
      });

      clearAirbridgeUserSafe();
    }
  },

  login: async (email, password) => {
    console.log("[AUTH][LOGIN][START]", { email });

    try {
      const data = await AuthService.login(email, password);
      const token = data.accessToken ?? data.token;

      console.log("[AUTH][LOGIN][RESPONSE]", {
        hasAccessToken: !!data?.accessToken,
        hasToken: !!data?.token,
        userRole: data?.user?.role,
      });

      if (!token) throw new Error("Login não retornou token.");

      await get().setSession(token, data?.user?.role ?? null);
    } catch (e: any) {
      console.log("[AUTH][LOGIN][ERROR]", {
        message: e?.message,
        status: e?.response?.status,
        data: e?.response?.data,
      });
      throw e;
    }
  },

  loginWithBiometrics: async () => {
    console.log("[AUTH][BIO][LOGIN][START]");

    try {
      const creds = await loadTokenWithBiometrics();
      const token = creds?.token;

      if (!token) {
        throw new Error("Biometria não está habilitada neste aparelho.");
      }

      const payload = decodeJwtPayload(token);
      const role = (payload?.role as Role) ?? null;
      const onboardingStatus = String(payload?.onboardingStatus || "");

      set({
        token,
        activeRole: role,
        needsOnboarding: onboardingStatus === "INCOMPLETE",
        needsBiometricSetup: false,
        pendingBiometricEmail: null,
      });

      await saveToken(token);

      if (isJwtExpired(token)) {
        console.log("[AUTH][BIO][LOGIN] token expirado, tentando refresh");

        try {
          await get().refreshSession();
        } catch (e: any) {
          console.log("[AUTH][BIO][LOGIN][REFRESH_FAIL]", {
            message: e?.message,
            status: e?.response?.status,
            data: e?.response?.data,
          });

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

          throw new Error(
            "Sua sessão biométrica expirou. Entre com email e senha novamente."
          );
        }
      }

      try {
        await get().syncMe();
      } catch (e: any) {
        console.log("[AUTH][BIO][LOGIN][SYNC_ME_ERROR]", {
          message: e?.message,
          status: e?.response?.status,
          data: e?.response?.data,
        });

        await clearToken();
        clearAirbridgeUserSafe();

        set({
          token: null,
          activeRole: null,
          needsOnboarding: false,
          needsBiometricSetup: false,
          pendingBiometricEmail: null,
        });

        throw e;
      }
    } catch (e: any) {
      console.log("[AUTH][BIO][LOGIN][ERROR]", {
        message: e?.message,
        status: e?.response?.status,
        data: e?.response?.data,
      });
      throw e;
    }
  },

  queueBiometricSetup: async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      console.log("[AUTH][BIO][QUEUE_SETUP] email inválido");
      set({
        needsBiometricSetup: false,
        pendingBiometricEmail: null,
      });
      return;
    }

    try {
      const status = await getBiometricStatus();

      console.log("[AUTH][BIO][QUEUE_SETUP][STATUS]", status);

      if (!status.available || status.enabled) {
        console.log("[AUTH][BIO][QUEUE_SETUP] não vai mostrar tela", {
          reason: !status.available
            ? "biometria_indisponivel"
            : "biometria_ja_ativada",
        });

        set({
          needsBiometricSetup: false,
          pendingBiometricEmail: null,
        });
        return;
      }

      console.log("[AUTH][BIO][QUEUE_SETUP] vai mostrar tela de setup", {
        email: normalizedEmail,
      });

      set({
        needsBiometricSetup: true,
        pendingBiometricEmail: normalizedEmail,
      });
    } catch (e: any) {
      console.log("[AUTH][BIO][QUEUE_SETUP][ERROR]", {
        message: e?.message,
      });

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

    console.log("[AUTH][BIO][ENABLE][START]", { email: normalizedEmail });

    if (!normalizedEmail) {
      throw new Error("Email inválido para ativar biometria.");
    }

    let token = get().token;

    if (!token) {
      throw new Error("Não existe sessão ativa para vincular a biometria.");
    }

    if (isJwtExpired(token)) {
      console.log("[AUTH][BIO][ENABLE] token expirado, tentando refresh");

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

    console.log("[AUTH][BIO][ENABLE][DONE]");
  },

  disableBiometricsForCurrentSession: async () => {
    console.log("[AUTH][BIO][DISABLE][START]");
    await disableBiometricLogin();

    set({
      needsBiometricSetup: false,
      pendingBiometricEmail: null,
    });

    console.log("[AUTH][BIO][DISABLE][DONE]");
  },

  refreshSession: async () => {
    console.log("[AUTH][REFRESH][START]");

    const data = await AuthService.refresh();

    console.log("[AUTH][REFRESH][RESPONSE]", {
      hasAccessToken: !!data?.accessToken,
    });

    if (!data?.accessToken) {
      throw new Error("Refresh não retornou accessToken.");
    }

    const payload = decodeJwtPayload(data.accessToken);
    console.log("[AUTH][REFRESH][JWT_PAYLOAD]", payload);

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

    console.log("[AUTH][SYNC_ME][START]", {
      hasToken: !!token,
      tokenPreview: tokenPreview(token),
      activeRole: get().activeRole,
    });

    if (!token) {
      clearAirbridgeUserSafe();
      return false;
    }

    const me = await ProfilesService.me();

    console.log("[AUTH][SYNC_ME][ME]", me);

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
    console.log("[AUTH][RESET_SESSION]");
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
    console.log("[AUTH][LOGOUT][START]");
    try {
      await AuthService.logout();
    } catch (e: any) {
      console.log("[AUTH][LOGOUT][ERROR]", {
        message: e?.message,
        status: e?.response?.status,
      });
    }

    await removePushTokenFromBackend();
    await disableBiometricLogin();
    await get().resetSession();
  },
}));