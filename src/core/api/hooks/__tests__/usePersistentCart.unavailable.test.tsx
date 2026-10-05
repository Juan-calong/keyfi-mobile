import React from "react";
import { act, create } from "react-test-renderer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { defaultScheduler, notifyManager } from "@tanstack/query-core";
import { usePersistentCart } from "../usePersistentCart";
import { getPersistentCart, removePersistentCartItem } from "../../services/cart.service";

jest.mock("../../services/cart.service", () => ({
  isPersistentCartRole: (role: string) => role === "CUSTOMER" || role === "SALON_OWNER",
  getPersistentCart: jest.fn(),
  removePersistentCartItem: jest.fn(),
  addPersistentCartItem: jest.fn(),
  setPersistentCartItemQty: jest.fn(),
  clearPersistentCart: jest.fn(),
  applyPersistentCartCoupon: jest.fn(),
  removePersistentCartCoupon: jest.fn(),
}));

beforeEach(() => notifyManager.setScheduler((callback) => callback()));
afterEach(() => notifyManager.setScheduler(defaultScheduler));

it.each(["CUSTOMER", "SALON_OWNER"] as const)("refetches %s cart after removing an unavailable item", async (role) => {
  const first = { ok: true, cart: { items: [], unavailableItems: [{ productId: "bad", reason: "PRODUCT_INACTIVE" }] } };
  const second = { ok: true, cart: { items: [], unavailableItems: [] } };
  (getPersistentCart as jest.Mock).mockReset().mockResolvedValue(second);
  (removePersistentCartItem as jest.Mock).mockReset().mockResolvedValue(second);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: 0 }, mutations: { gcTime: 0 } } });
  client.setQueryData(["persistent-cart", role, "anonymous"], first);
  let cartHook!: ReturnType<typeof usePersistentCart>;
  function Probe() {
    cartHook = usePersistentCart({ token: "token", activeRole: role });
    return null;
  }
  let tree!: ReturnType<typeof create>;
  await act(async () => { tree = create(<QueryClientProvider client={client}><Probe /></QueryClientProvider>); });
  expect(cartHook.cart.unavailableItems).toEqual(first.cart.unavailableItems);
  await act(async () => { await cartHook.removeItemMutation.mutateAsync("bad"); });
  expect(removePersistentCartItem).toHaveBeenCalledWith("bad");
  expect(getPersistentCart).toHaveBeenCalledTimes(1);
  expect(cartHook.cart.unavailableItems).toEqual([]);
  await act(async () => { tree.unmount(); });
  client.clear();
});
