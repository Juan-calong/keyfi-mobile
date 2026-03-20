import { create } from "zustand";
import { clearToken, loadToken, saveToken } from "../core/security/keychain";
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

export type Role = "SALON_OWNER" | "SELLER" | "ADMIN" | "CUSTOMER" | "PENDING";

type AuthState = {
  token: string | null;
  activeRole: Role | null;
  hydrated: boolean;
  needsOnboarding: boolean;

  hydrate: () => Promise<void>;
  setRole: (role: Role) => void;
  setNeedsOnboarding: (v: boolean) => void;

  setSession: (token: string, role: Role) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
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

  hydrate: async () => {
    try {
      const token = await loadToken();

      console.log("[AUTH][HYDRATE]", {
        hasToken: !!token,
        tokenPreview: tokenPreview(token),
      });

      if (!token) {
        set({
          token: null,
          activeRole: null,
          needsOnboarding: false,
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

            set({
              token: null,
              activeRole: null,
              needsOnboarding: false,
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

          set({
            token: null,
            activeRole: null,
            needsOnboarding: false,
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

        set({
          token: null,
          activeRole: null,
          needsOnboarding: false,
          hydrated: true,
        });
      }
    } catch (e: any) {
      console.log("[AUTH][HYDRATE][FATAL_ERROR]", {
        message: e?.message,
      });

      await clearToken();

      set({
        token: null,
        activeRole: null,
        needsOnboarding: false,
        hydrated: true,
      });
    }
  },

  setRole: (activeRole) => set({ activeRole }),
  setNeedsOnboarding: (v) => set({ needsOnboarding: v }),

  setSession: async (token, role) => {
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
    });

    try {
      await get().syncMe();
    } catch (e: any) {
      console.log("[AUTH][SET_SESSION][SYNC_ME_ERROR]", {
        message: e?.message,
        status: e?.response?.status,
        data: e?.response?.data,
      });
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

      await get().setSession(token, data.user.role);
    } catch (e: any) {
      console.log("[AUTH][LOGIN][ERROR]", {
        message: e?.message,
        status: e?.response?.status,
        data: e?.response?.data,
      });
      throw e;
    }
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

    if (!token) return false;

    const me = await ProfilesService.me();

    console.log("[AUTH][SYNC_ME][ME]", me);

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
    set({
      token: null,
      activeRole: null,
      needsOnboarding: false,
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
    await get().resetSession();
  },
}));