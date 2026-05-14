import { api } from "../client";
import { endpoints } from "../endpoints";
import type { Role } from "../../../stores/auth.store";

export function isPersistentCartRole(role: Role | null | undefined): role is "CUSTOMER" | "SALON_OWNER" {
  return role === "CUSTOMER" || role === "SALON_OWNER";
}

export type PersistentCartCoupon = {
  code: string;
  type?: string;
  value?: string;
  amount?: string;
  [key: string]: unknown;
};

export type PersistentCartItem = {
  productId: string;
  qty: number;
  name: string;
  image: string | null;
  active: boolean;
  stock: number;
  pricing: {
    unitBase: number;
    unitFinal: number;
    lineBase: number;
    lineFinal: number;
    promoLabel?: string | null;
  };
};

export type PersistentCartTotals = {
  itemsCount: number;
  uniqueItems: number;
  subtotalBase: number;
  subtotalAfterPromos: number;
  couponDiscount: number;
  total: number;
};

export type PersistentCart = {
  id: string;
  userId: string;
  couponCode: string | null;
  coupon: PersistentCartCoupon | null;
  items: PersistentCartItem[];
  totals: PersistentCartTotals;
  warnings?: Array<{ code: string; message: string }>;
  updatedAt: string;
};

export type CartResponse = {
  ok: true;
  cart: PersistentCart;
};

export type AddCartItemPayload = {
  productId: string;
  qty: number;
};

export type SetCartItemQtyPayload = {
  qty: number;
};

export type ApplyCartCouponPayload = {
  code: string;
};

export async function getPersistentCart() {
  const { data } = await api.get<CartResponse>(endpoints.cart.byUser);
  return data;
}

export async function addPersistentCartItem(payload: AddCartItemPayload) {
  const { data } = await api.post<CartResponse>(endpoints.cart.addItem, payload);
  return data;
}

export async function setPersistentCartItemQty(productId: string, payload: SetCartItemQtyPayload) {
  const { data } = await api.patch<CartResponse>(endpoints.cart.setItemQty(productId), payload);
  return data;
}

export async function removePersistentCartItem(productId: string) {
  const { data } = await api.delete<CartResponse>(endpoints.cart.removeItem(productId));
  return data;
}

export async function clearPersistentCart() {
  const { data } = await api.delete<CartResponse>(endpoints.cart.clear);
  return data;
}

export async function applyPersistentCartCoupon(payload: ApplyCartCouponPayload) {
  const { data } = await api.post<CartResponse>(endpoints.cart.applyCoupon, payload);
  return data;
}

export async function removePersistentCartCoupon() {
  const { data } = await api.delete<CartResponse>(endpoints.cart.removeCoupon);
  return data;
}
