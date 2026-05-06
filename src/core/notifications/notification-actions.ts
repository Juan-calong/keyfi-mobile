import { CUSTOMER_SCREENS } from "../../navigation/customer.routes";

export type NotificationAction =
  | "OPEN_PRODUCT_REVIEW"
  | "OPEN_PRODUCT"
  | "OPEN_ORDER"
  | "OPEN_ORDER_REVIEW";

type NotificationPayload = {
  action?: string;
  productId?: string;
  orderId?: string;
  orderItemId?: string;
  source?: string;
  screen?: string;
};

function normalizePayload(raw: any): NotificationPayload {
  const data = raw?.data ?? raw ?? {};
  return {
    action: typeof data.action === "string" ? data.action : undefined,
    productId: typeof data.productId === "string" ? data.productId : undefined,
    orderId: typeof data.orderId === "string" ? data.orderId : undefined,
    orderItemId: typeof data.orderItemId === "string" ? data.orderItemId : undefined,
    source: typeof data.source === "string" ? data.source : undefined,
    screen: typeof data.screen === "string" ? data.screen : undefined,
  };
}

export function handleNotificationClick(raw: any, navigate: (screen: string, params?: any) => void) {
  const payload = normalizePayload(raw);

  if (payload.action === "OPEN_PRODUCT_REVIEW" || payload.action === "OPEN_PRODUCT") {
    if (payload.productId) {
      navigate(CUSTOMER_SCREENS.ProductDetails, {
        productId: payload.productId,
        intent: payload.action === "OPEN_PRODUCT_REVIEW" ? "REVIEW" : undefined,
        orderId: payload.orderId,
        orderItemId: payload.orderItemId,
        source: payload.source,
      });
      return true;
    }

    if (payload.orderId) {
      navigate(CUSTOMER_SCREENS.OrderDetails, { orderId: payload.orderId });
      return true;
    }
  }

  if (payload.action === "OPEN_ORDER" || payload.action === "OPEN_ORDER_REVIEW") {
    if (payload.orderId) {
      navigate(CUSTOMER_SCREENS.OrderDetails, { orderId: payload.orderId });
      return true;
    }
  }

  if (payload.screen === CUSTOMER_SCREENS.OrderDetails && payload.orderId) {
    navigate(CUSTOMER_SCREENS.OrderDetails, { orderId: payload.orderId });
    return true;
  }

  return false;
}
