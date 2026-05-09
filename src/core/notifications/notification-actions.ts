import AsyncStorage from "@react-native-async-storage/async-storage";
import { CUSTOMER_SCREENS } from "../../navigation/customer.routes";
import { OWNER_SCREENS } from "../../navigation/owner.routes";
const PENDING_NOTIFICATION_ACTION_KEY = "@keyfi/pending-notification-action";

export type NotificationAudience = "CUSTOMER" | "OWNER";

type HandleNotificationOptions = {
  audience?: NotificationAudience;
};

const AUDIENCE_SCREENS = {
  CUSTOMER: CUSTOMER_SCREENS,
  OWNER: OWNER_SCREENS,
} as const;

function canUsePayloadScreen(payloadScreen: string | undefined, audience: NotificationAudience) {
  if (!payloadScreen) return false;
  return Object.values(AUDIENCE_SCREENS[audience]).includes(payloadScreen as any);
}

function resolveAudience(payload: NotificationPayload, audience?: NotificationAudience): NotificationAudience | null {
  if (audience) return audience;
  if (canUsePayloadScreen(payload.screen, "OWNER")) return "OWNER";
  if (canUsePayloadScreen(payload.screen, "CUSTOMER")) return "CUSTOMER";
  return null;
}

export type NotificationAction =
  | "OPEN_PRODUCT_REVIEW"
  | "OPEN_PRODUCT"
  | "OPEN_ORDER"
  | "OPEN_ORDER_REVIEW";

export type NotificationPayload = {
  action?: string;
  productId?: string;
  orderId?: string;
  orderItemId?: string;
  source?: string;
  screen?: string;
};

export type PendingNotificationAction = {
  action: NotificationAction;
  productId?: string;
  orderId?: string;
  orderItemId?: string;
  source?: string;
};

export function normalizePayload(raw: any): NotificationPayload {
  const data =
    raw?.data ??
    raw?.notification?.data ??
    raw?.detail?.notification?.data ??
    raw?.detail?.data ??
    raw ?? {};

  const actionFromPress =
    typeof raw?.detail?.pressAction?.id === "string" ? raw.detail.pressAction.id : undefined;

  return {
      action:
      typeof data.action === "string"
        ? data.action
        : typeof data.type === "string"
          ? data.type
          : actionFromPress,
    productId: typeof data.productId === "string" ? data.productId : undefined,
    orderId: typeof data.orderId === "string" ? data.orderId : undefined,
    orderItemId: typeof data.orderItemId === "string" ? data.orderItemId : undefined,
    source: typeof data.source === "string" ? data.source : undefined,
    screen: typeof data.screen === "string" ? data.screen : undefined,
  };
}

export function toPendingNotificationAction(raw: any): PendingNotificationAction | null {
  const payload = normalizePayload(raw);
  const action = payload.action;

  if (
    action !== "OPEN_PRODUCT_REVIEW" &&
    action !== "OPEN_PRODUCT" &&
    action !== "OPEN_ORDER" &&
    action !== "OPEN_ORDER_REVIEW"
  ) {
    return null;
  }

  return {
    action,
    productId: payload.productId,
    orderId: payload.orderId,
    orderItemId: payload.orderItemId,
    source: payload.source,
  };
}

export async function savePendingNotificationAction(raw: any): Promise<boolean> {
  const pending = toPendingNotificationAction(raw);
  if (!pending) return false;

  await AsyncStorage.setItem(PENDING_NOTIFICATION_ACTION_KEY, JSON.stringify(pending));
  return true;
}

export async function loadPendingNotificationAction(): Promise<PendingNotificationAction | null> {
  const raw = await AsyncStorage.getItem(PENDING_NOTIFICATION_ACTION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    if (
      parsed.action !== "OPEN_PRODUCT_REVIEW" &&
      parsed.action !== "OPEN_PRODUCT" &&
      parsed.action !== "OPEN_ORDER" &&
      parsed.action !== "OPEN_ORDER_REVIEW"
    ) {
      return null;
    }

    return parsed as PendingNotificationAction;
  } catch {
    return null;
  }
}

export async function clearPendingNotificationAction() {
  await AsyncStorage.removeItem(PENDING_NOTIFICATION_ACTION_KEY);
}

export function handleNotificationClick(
  raw: any,
  navigate: (screen: string, params?: any) => void,
  options?: HandleNotificationOptions
) {
  const payload = normalizePayload(raw);
  const audience = resolveAudience(payload, options?.audience);
  if (!audience) return false;
  const screens = AUDIENCE_SCREENS[audience];

  if (payload.action === "OPEN_PRODUCT_REVIEW" || payload.action === "OPEN_PRODUCT") {
    if (payload.productId) {
      navigate(screens.ProductDetails, {
        productId: payload.productId,
        intent: payload.action === "OPEN_PRODUCT_REVIEW" ? "REVIEW" : undefined,
        orderId: payload.orderId,
        orderItemId: payload.orderItemId,
        source: payload.source,
      });
      return true;
    }

    if (payload.orderId) {
      navigate(screens.OrderDetails, { orderId: payload.orderId });      return true;
    }
  }

  if (payload.action === "OPEN_ORDER" || payload.action === "OPEN_ORDER_REVIEW") {
    if (payload.orderId) {
      navigate(screens.OrderDetails, { orderId: payload.orderId });
      return true;
    }
  }

  if (canUsePayloadScreen(payload.screen, audience)) {
    navigate(payload.screen as string, {
      ...(payload.orderId ? { orderId: payload.orderId } : {}),
      ...(payload.productId ? { productId: payload.productId } : {}),
    });
    return true;
  }

  return false;
}
