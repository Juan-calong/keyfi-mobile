import axios, { AxiosHeaders } from "axios";
import Config from "react-native-config";
import { useAuthStore } from "../../stores/auth.store";
import { apiLog, apiWarn } from "./logger";
import { endpoints } from "./endpoints";

console.log("[ ENV ] [ RAW ]", Config);
console.log("[ ENV ] [ API_BASE_URL ]", Config);

const baseURL = (Config.API_BASE_URL || "").trim();

if (!baseURL) {
  apiWarn("[ENV] API_BASE_URL está vazio. Verifique react-native-config e rebuild.");
} else {
  apiLog("[ENV] API_BASE_URL =", baseURL);
}

function isPublicRoute(url: string) {
  return (
    url === "/auth/login" ||
    url === "/auth/refresh" ||
    url === "/auth/logout" ||
    url === "/auth/register/seller" ||
    url === "/auth/register/salon" ||
    url === "/auth/register/customer" ||
    url === "/health" ||
    url === "/ready" ||
    url.startsWith("/docs")
  );
}

function reqId() {
  return `rn_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function tokenPreview(token: string | null | undefined) {
  if (!token) return null;
  if (token.length <= 20) return token;
  return `${token.slice(0, 12)}...${token.slice(-8)}`;
}

export function apiErrorMessage(e: any) {
  return (
    e?.response?.data?.error ||
    e?.response?.data?.message ||
    e?.message ||
    "Erro de rede"
  );
}

export const api = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: true,
});

let refreshPromise: Promise<void> | null = null;

function roleGuard(config: any, message: string) {
  const err: any = new Error(message);
  err.code = "ROLE_GUARD";
  err.config = config;
  return err;
}

type GuardRole = "SALON_OWNER" | "SELLER" | "ADMIN" | "CUSTOMER";

const DEFAULT_AREA_ACCESS: Record<"/seller/" | "/salon/" | "/admin/", GuardRole[]> = {
  "/seller/": ["SELLER", "SALON_OWNER", "ADMIN"],
  "/salon/": ["SALON_OWNER", "ADMIN"],
  "/admin/": ["ADMIN"],
};

const EXPLICIT_ROUTE_ACCESS = new Map<string, GuardRole[]>([
  [endpoints.referrals.applyInviteForCurrentUser, ["CUSTOMER", "SELLER", "SALON_OWNER", "ADMIN"]],
  [endpoints.referrals.setSalonReferrerOnce, ["SELLER", "SALON_OWNER", "ADMIN"]],
  [endpoints.referrals.sellerMe, ["SELLER", "ADMIN"]],
  [endpoints.referrals.salonMe, ["SALON_OWNER", "ADMIN"]],
]);

function normalizeGuardPath(url: unknown) {
  return String(url ?? "").split("?")[0].trim();
}

function hasAreaRoleAccess(path: string, role: string | null): boolean {
  const area = (Object.keys(DEFAULT_AREA_ACCESS) as Array<keyof typeof DEFAULT_AREA_ACCESS>).find(
    (prefix) => path.startsWith(prefix)
  );

  if (!area) return true;
  if (!role) return false;

  return DEFAULT_AREA_ACCESS[area].includes(role as GuardRole);
}

function hasExplicitRouteAccess(path: string, role: string | null): boolean {
  const allowed = EXPLICIT_ROUTE_ACCESS.get(path);
  if (!allowed) return true;
  if (!role) return false;

  return allowed.includes(role as GuardRole);
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  const role = useAuthStore.getState().activeRole;

  const url = String(config.url || "");
  const publicRoute = isPublicRoute(url);
  const rid = reqId();

    if (!publicRoute) {
  const guardPath = normalizeGuardPath(url);
  const hasExplicitRule = EXPLICIT_ROUTE_ACCESS.has(guardPath);

  if (hasExplicitRule) {
    if (!hasExplicitRouteAccess(guardPath, role)) {
      throw roleGuard(config, "Blocked route for this role");
    }
  } else {
    if (!hasAreaRoleAccess(guardPath, role)) {
      throw roleGuard(config, "Blocked restricted area for this role");
    }
  }
}

  if (config.headers instanceof AxiosHeaders) {
    config.headers.set("x-request-id", rid);
  } else {
    config.headers = (config.headers ?? {}) as any;
    (config.headers as any)["x-request-id"] = rid;
  }

  if (!publicRoute && token) {
    if (config.headers instanceof AxiosHeaders) {
      config.headers.set("Authorization", `Bearer ${token}`);
    } else {
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
  }

  const method = String(config.method || "get").toUpperCase();
  const needsIdem = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  if (!publicRoute && needsIdem) {
    const has =
      (config.headers instanceof AxiosHeaders && config.headers.has("Idempotency-Key")) ||
      (!(config.headers instanceof AxiosHeaders) &&
        ((config.headers as any)?.["Idempotency-Key"] ||
          (config.headers as any)?.["X-Idempotency-Key"]));

    if (!has) {
      const key = `rn_${rid}`;
      if (config.headers instanceof AxiosHeaders) {
        config.headers.set("Idempotency-Key", key);
        config.headers.set("X-Idempotency-Key", key);
      } else {
        (config.headers as any)["Idempotency-Key"] = key;
        (config.headers as any)["X-Idempotency-Key"] = key;
      }
    }
  }

  const authHeader =
    config.headers instanceof AxiosHeaders
      ? config.headers.get("Authorization")
      : (config.headers as any)?.Authorization;

  apiLog("[API][REQ]", {
    method,
    url,
    fullUrl: `${config.baseURL || ""}${url}`,
    public: publicRoute,
    role,
    hasTokenInStore: !!token,
    tokenPreview: tokenPreview(token),
    hasAuthorizationHeader: !!authHeader,
    authHeaderPreview:
      typeof authHeader === "string" ? `${authHeader.slice(0, 20)}...` : null,
    rid,
  });

  return config;
});

api.interceptors.response.use(
  (res) => {
    apiLog("[API][RES][OK]", {
      status: res.status,
      url: res.config?.url,
      fullUrl: `${res.config?.baseURL || ""}${res.config?.url || ""}`,
      data: res.data,
    });
    return res;
  },
  async (err) => {
    const status = err?.response?.status;
    const data = err?.response?.data;
    const config = err?.config;
    const path = String(config?.url || "");

    apiLog("[API][RES][ERROR]", {
      status,
      url: path,
      fullUrl: `${config?.baseURL || ""}${path}`,
      data,
      message: err?.message,
      code: err?.code,
      isAxiosError: !!err?.isAxiosError,
      hasResponse: !!err?.response,
      hasRequest: !!err?.request,
      retry: !!config?._retry,
    });

    if (status === 403) {
      apiLog("[API][403]", {
        path,
        action: "forbidden_no_recursive_sync",
      });

      return Promise.reject(err);
    }

    const isAuthRoute = path.startsWith("/auth/");
    const alreadyRetried = !!config?._retry;

    if (status === 401 && !isAuthRoute && !alreadyRetried) {
      (config as any)._retry = true;

      apiLog("[API][401]", {
        path,
        hasRefreshPromise: !!refreshPromise,
        action: "trying_refresh_with_queue",
      });

      try {
        if (!refreshPromise) {
          refreshPromise = useAuthStore
            .getState()
            .refreshSession()
            .catch(async (refreshErr: any) => {
              apiLog("[API][401][REFRESH_FAIL]", {
                message: refreshErr?.message,
                status: refreshErr?.response?.status,
                data: refreshErr?.response?.data,
              });

              await useAuthStore.getState().resetSession();
              throw refreshErr;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        await refreshPromise;

        apiLog("[API][401][REFRESH_OK]", {
          retrying: path,
        });

        return api(config);
      } catch (refreshErr) {
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(err);
  }
);