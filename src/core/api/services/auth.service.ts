import { api } from "../client";
import { endpoints } from "../endpoints";

export type SessionItem = {
  id: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  userAgent: string | null;
  ip: string | null;
  isCurrent: boolean;
  isActive: boolean;
};

export type SocialProvider = "GOOGLE" | "APPLE";

export type SocialLoginPayload = {
  provider: SocialProvider;
  idToken?: string;
  identityToken?: string;
};

export const AuthService = {
  login: async (email: string, password: string) => {
    const res = await api.post(endpoints.auth.login, { email, password });
    return res.data;
  },

    loginWithSocial: async (payload: SocialLoginPayload) => {
    const res = await api.post(endpoints.auth.social, payload);
    return res.data;
  },

  refresh: async () => {
    const res = await api.post(endpoints.auth.refresh);
    return res.data;
  },

  logout: async () => {
    const res = await api.post(endpoints.auth.logout);
    return res.data;
  },

  listSessions: async () => {
    const res = await api.get<{ ok: true; items: SessionItem[] }>(
      endpoints.auth.sessions
    );
    return res.data;
  },

  deleteSession: async (id: string) => {
    const res = await api.delete(endpoints.auth.sessionById(id));
    return res.data;
  },

  deleteOtherSessions: async () => {
    const res = await api.delete(endpoints.auth.sessions);
    return res.data;
  },
};