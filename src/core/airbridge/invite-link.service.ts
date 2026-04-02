import AsyncStorage from "@react-native-async-storage/async-storage";

export const PENDING_INVITE_STORAGE_KEY = "@keyfi/pending_invite";

export type PendingInvite = {
  rawUrl: string;
  inviteType: "SELLER" | "SALON";
  token: string;
  receivedAt: string;
};

function safeDecode(value: string) {
  try {
    return decodeURIComponent(String(value || "").replace(/\+/g, " "));
  } catch {
    return String(value || "");
  }
}

function getQueryParam(url: string, key: string): string {
  const queryIndex = url.indexOf("?");
  if (queryIndex < 0) return "";

  const query = url.slice(queryIndex + 1);
  const pairs = query.split("&").filter(Boolean);

  for (const pair of pairs) {
    const eqIndex = pair.indexOf("=");
    const rawKey = eqIndex >= 0 ? pair.slice(0, eqIndex) : pair;
    const rawValue = eqIndex >= 0 ? pair.slice(eqIndex + 1) : "";

    if (safeDecode(rawKey) === key) {
      return safeDecode(rawValue).trim();
    }
  }

  return "";
}

export function parseInviteFromUrl(url: string): PendingInvite | null {
  const rawUrl = String(url || "").trim();
  if (!rawUrl) return null;

  const linkType = getQueryParam(rawUrl, "link_type");
  const sellerRef = getQueryParam(rawUrl, "seller_ref");
  const salonRef = getQueryParam(rawUrl, "salon_ref");
  const inviteType = getQueryParam(rawUrl, "invite_type").toLowerCase();
  const inviteRef = getQueryParam(rawUrl, "invite_ref");

  if (linkType === "SELLER_INVITE" && sellerRef) {
    return {
      rawUrl,
      inviteType: "SELLER",
      token: sellerRef,
      receivedAt: new Date().toISOString(),
    };
  }

  if (linkType === "SALON_INVITE" && salonRef) {
    return {
      rawUrl,
      inviteType: "SALON",
      token: salonRef,
      receivedAt: new Date().toISOString(),
    };
  }

  if (inviteType === "seller" && inviteRef) {
    return {
      rawUrl,
      inviteType: "SELLER",
      token: inviteRef,
      receivedAt: new Date().toISOString(),
    };
  }

  if (inviteType === "salon" && inviteRef) {
    return {
      rawUrl,
      inviteType: "SALON",
      token: inviteRef,
      receivedAt: new Date().toISOString(),
    };
  }

  return null;
}

export async function savePendingInvite(invite: PendingInvite) {
  await AsyncStorage.setItem(PENDING_INVITE_STORAGE_KEY, JSON.stringify(invite));
}

export async function getPendingInvite(): Promise<PendingInvite | null> {
  const raw = await AsyncStorage.getItem(PENDING_INVITE_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as PendingInvite;
  } catch {
    return null;
  }
}

export async function clearPendingInvite() {
  await AsyncStorage.removeItem(PENDING_INVITE_STORAGE_KEY);
}