// src/core/api/coupons.ts
import { api } from "./client";
import { endpoints } from "./endpoints";

export type CouponServer = { code: string; type: "PCT" | "FIXED"; value: string };

export type ValidateCouponsResponse = {
  ok: true;
  subtotalBase: string;
  discountProducts: string;
  subtotalAfterPromos: string;
  coupon: CouponServer | null;
  couponDiscount: string;
  total: string;
  items: Array<{
    productId: string;
    qty: number;
    product?: { id: string; name: string; sku?: string | null };
    unitPriceBase: string;
    unitPriceFinal: string;
    promo?: any | null;
  }>;
};

export type ValidateCouponBody = {
  couponCode?: string | null;
  items: Array<{ productId: string; qty: number }>;
};

export async function validateCoupon(body: ValidateCouponBody) {
  const { data } = await api.post(endpoints.coupons.validate, body);
  return data as ValidateCouponsResponse;
}
