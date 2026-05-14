import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Role } from "../../../stores/auth.store";
import {
  addPersistentCartItem,
  applyPersistentCartCoupon,
  clearPersistentCart,
  getPersistentCart,
  isPersistentCartRole,
  removePersistentCartCoupon,
  removePersistentCartItem,
  setPersistentCartItemQty,
  type AddCartItemPayload,
  type ApplyCartCouponPayload,
  type PersistentCart,
  type SetCartItemQtyPayload,
} from "../services/cart.service";

type UsePersistentCartParams = {
  token?: string | null;
  activeRole?: Role | null;
  userId?: string | null;
};

export const EMPTY_PERSISTENT_CART: PersistentCart = {
  id: "",
  userId: "",
  couponCode: null,
  coupon: null,
  items: [],
  totals: {
    itemsCount: 0,
    uniqueItems: 0,
    subtotalBase: 0,
    subtotalAfterPromos: 0,
    couponDiscount: 0,
    total: 0,
  },
  warnings: [],
  updatedAt: "",
};

export function usePersistentCart({ token, activeRole, userId }: UsePersistentCartParams = {}) {
  const queryClient = useQueryClient();
  const enabled = Boolean(token) && isPersistentCartRole(activeRole);
  const queryKey = useMemo(
    () => ["persistent-cart", activeRole ?? "unknown", userId ?? "anonymous"] as const,
    [activeRole, userId]
  );

  const cartQuery = useQuery({
    queryKey,
    queryFn: getPersistentCart,
    enabled,
  });

  const invalidateCart = () => queryClient.invalidateQueries({ queryKey });

  const addItemMutation = useMutation({
    mutationFn: (payload: AddCartItemPayload) => addPersistentCartItem(payload),
    onSuccess: invalidateCart,
  });

  const setItemQtyMutation = useMutation({
    mutationFn: ({ productId, payload }: { productId: string; payload: SetCartItemQtyPayload }) =>
      setPersistentCartItemQty(productId, payload),
    onSuccess: invalidateCart,
  });

  const removeItemMutation = useMutation({
    mutationFn: (productId: string) => removePersistentCartItem(productId),
    onSuccess: invalidateCart,
  });

  const clearCartMutation = useMutation({
    mutationFn: clearPersistentCart,
    onSuccess: invalidateCart,
  });

  const applyCouponMutation = useMutation({
    mutationFn: (payload: ApplyCartCouponPayload) => applyPersistentCartCoupon(payload),
    onSuccess: invalidateCart,
  });

  const removeCouponMutation = useMutation({
    mutationFn: removePersistentCartCoupon,
    onSuccess: invalidateCart,
  });

  return {
    enabled,
    queryKey,
    cartQuery,
    cart: cartQuery.data?.cart ?? EMPTY_PERSISTENT_CART,
    addItemMutation,
    setItemQtyMutation,
    removeItemMutation,
    clearCartMutation,
    applyCouponMutation,
    removeCouponMutation,
  };
}
