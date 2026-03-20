import { api } from "../client";
import { endpoints } from "../endpoints";
import { apiLog } from "../logger";

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

export const AuthService = {
  login: async (email: string, password: string) => {
    const res = await api.post(endpoints.auth.login, { email, password });
    apiLog("[AUTH][LOGIN] user:", res.data?.user);
    return res.data;
  },

  refresh: async () => {
    const res = await api.post(endpoints.auth.refresh);
    apiLog("[AUTH][REFRESH] ok");
    return res.data;
  },

  logout: async () => {
    const res = await api.post(endpoints.auth.logout);
    apiLog("[AUTH][LOGOUT] ok");
    return res.data;
  },

  listSessions: async () => {
    const res = await api.get<{ ok: true; items: SessionItem[] }>(
      endpoints.auth.sessions
    );
    apiLog("[AUTH][SESSIONS] list ok");
    return res.data;
  },

  deleteSession: async (id: string) => {
    const res = await api.delete(endpoints.auth.sessionById(id));
    apiLog("[AUTH][SESSIONS] delete ok", id);
    return res.data;
  },

  deleteOtherSessions: async () => {
    const res = await api.delete(endpoints.auth.sessions);
    apiLog("[AUTH][SESSIONS] delete others ok");
    return res.data;
  },
};