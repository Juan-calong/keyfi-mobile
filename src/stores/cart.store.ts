import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type CartMap = Record<string, number>;
type DraftMap = Record<string, number>;
export type CartItem = { productId: string; qty: number };

export type CouponServer = { code: string; type: "PCT" | "FIXED"; value: string };

export type CartPricing = {
  ok: true;
  subtotalBase: number;
  discountProducts: number;
  subtotalAfterPromos: number;
  coupon: { code: string; type: "PCT" | "FIXED"; value: number } | null;
  couponDiscount: number;
  total: number;
};

type CartState = {
  qtyById: CartMap;

  draftById: DraftMap;

  couponCode: string;

  pricing: CartPricing | null;

  setQty: (productId: string, qty: number) => void;
  inc: (productId: string, by?: number) => void;
  dec: (productId: string, by?: number) => void;
  remove: (productId: string) => void;
  clear: () => void;

  draftSetQty: (productId: string, qty: number) => void;
  draftInc: (productId: string, by?: number) => void;
  draftDec: (productId: string, by?: number) => void;
  draftRemove: (productId: string) => void;
  clearDraft: () => void;

  setCouponCode: (code: string) => void;
  clearCoupon: () => void;
  setPricing: (raw: any) => void; // normaliza o retorno do /coupons/validate
  invalidatePricing: () => void;

  cartItemsCount: () => number;
  draftItemsCount: () => number;
  draftDistinctCount: () => number;

  commitDraft: () => void;
};

function safeInt(n: any, fallback = 0) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.floor(v);
}

function clampQty(qty: any) {
  return Math.max(0, safeInt(qty, 0));
}

function num(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normCode(v: any) {
  return String(v || "").trim().toUpperCase();
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      qtyById: {},
      draftById: {},

      couponCode: "",
      pricing: null,

      invalidatePricing: () => set({ pricing: null }),

      // ===== Carrinho real =====
      setQty: (productId, qty) =>
        set((s) => {
          const next = { ...(s.qtyById || {}) };
          next[productId] = clampQty(qty);
          return { qtyById: next, pricing: null };
        }),

      inc: (productId, by = 1) =>
        set((s) => {
          const next = { ...(s.qtyById || {}) };
          const cur = clampQty(next[productId] ?? 0);
          const add = Math.max(1, safeInt(by, 1));
          next[productId] = cur + add;
          return { qtyById: next, pricing: null };
        }),

      dec: (productId, by = 1) =>
        set((s) => {
          const next = { ...(s.qtyById || {}) };
          const cur = clampQty(next[productId] ?? 0);
          const sub = Math.max(1, safeInt(by, 1));
          next[productId] = Math.max(0, cur - sub);
          return { qtyById: next, pricing: null };
        }),

      remove: (productId) =>
        set((s) => {
          const next = { ...(s.qtyById || {}) };
          next[productId] = 0;
          return { qtyById: next, pricing: null };
        }),

      clear: () => set({ qtyById: {}, pricing: null, couponCode: "" }),

      // ===== Draft (seleção) =====
      draftSetQty: (productId, qty) =>
        set((s) => {
          const next = { ...(s.draftById || {}) };
          next[productId] = clampQty(qty);
          return { draftById: next };
        }),

      draftInc: (productId, by = 1) =>
        set((s) => {
          const next = { ...(s.draftById || {}) };
          const cur = clampQty(next[productId] ?? 0);
          const add = Math.max(1, safeInt(by, 1));
          next[productId] = cur + add;
          return { draftById: next };
        }),

      draftDec: (productId, by = 1) =>
        set((s) => {
          const next = { ...(s.draftById || {}) };
          const cur = clampQty(next[productId] ?? 0);
          const sub = Math.max(1, safeInt(by, 1));
          next[productId] = Math.max(0, cur - sub);
          return { draftById: next };
        }),

      draftRemove: (productId) =>
        set((s) => {
          const next = { ...(s.draftById || {}) };
          next[productId] = 0;
          return { draftById: next };
        }),

      clearDraft: () => set({ draftById: {} }),

      // ===== Coupon/Pricing actions =====
      setCouponCode: (code) => set({ couponCode: normCode(code) }),

      clearCoupon: () => set({ couponCode: "", pricing: null }),

      setPricing: (raw) => {
        const coupon = raw?.coupon
          ? { code: normCode(raw.coupon.code), type: raw.coupon.type, value: num(raw.coupon.value) }
          : null;

        const pricing: CartPricing = {
          ok: true,
          subtotalBase: num(raw?.subtotalBase),
          discountProducts: num(raw?.discountProducts),
          subtotalAfterPromos: num(raw?.subtotalAfterPromos),
          coupon,
          couponDiscount: num(raw?.couponDiscount),
          total: num(raw?.total),
        };

        set({
          pricing,
          couponCode: coupon?.code || "",
        });
      },

      // ===== Helpers =====
      cartItemsCount: () => {
        let sum = 0;
        for (const qty of Object.values(get().qtyById || {})) sum += clampQty(qty);
        return sum;
      },

      draftItemsCount: () => {
        let sum = 0;
        for (const qty of Object.values(get().draftById || {})) sum += clampQty(qty);
        return sum;
      },

      draftDistinctCount: () => {
        let c = 0;
        for (const qty of Object.values(get().draftById || {})) if (clampQty(qty) > 0) c += 1;
        return c;
      },

      commitDraft: () => {
        const draft = get().draftById || {};
        if (!Object.keys(draft).length) return;

        set((s) => {
          const nextCart: CartMap = { ...(s.qtyById || {}) };

          for (const [productId, qty] of Object.entries(draft)) {
            const q = clampQty(qty);
            if (q <= 0) continue;
            const cur = clampQty(nextCart[productId] ?? 0);
            nextCart[productId] = cur + q;
          }

          return { qtyById: nextCart, draftById: {}, pricing: null };
        });
      },
    }),
    {
      name: "keyfi-cart",
      storage: createJSONStorage(() => AsyncStorage),

      // ✅ persiste só o carrinho real + cupom; pricing e draft não
      partialize: (state) => ({
        qtyById: state.qtyById || {},
        couponCode: state.couponCode || "",
      }),

      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const fixed: CartMap = {};
        for (const [k, v] of Object.entries((state.qtyById || {}) as CartMap)) {
          const q = clampQty(v);
          if (q > 0) fixed[k] = q;
        }
        state.qtyById = fixed;
        state.draftById = {};
        state.pricing = null; // ✅ sempre stale ao reabrir
        state.couponCode = normCode(state.couponCode);
      },
    }
  )
);
