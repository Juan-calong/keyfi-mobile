import { getPersistentCart, removePersistentCartItem } from "../cart.service";
import { api } from "../../client";

jest.mock("../../client", () => ({ api: { get: jest.fn(), delete: jest.fn() } }));

it("accepts an older cart response without unavailableItems", async () => {
  const cart = { items: [{ productId: "valid", qty: 2 }], totals: { total: 25 }, couponCode: "SAVE", coupon: { code: "SAVE" }, warnings: [{ code: "STOCK", message: "Low stock" }] };
  (api.get as jest.Mock).mockResolvedValue({ data: { ok: true, cart } });
  const result = await getPersistentCart();
  expect(result.cart.unavailableItems).toEqual([]);
  expect(result.cart.items).toEqual(cart.items);
  expect(result.cart.totals).toEqual(cart.totals);
  expect(result.cart.couponCode).toBe("SAVE");
  expect(result.cart.coupon).toEqual(cart.coupon);
  expect(result.cart.warnings).toEqual(cart.warnings);
});

it("deletes the exact product from /cart/items/:productId", async () => {
  (api.delete as jest.Mock).mockResolvedValue({ data: { ok: true, cart: {} } });
  await removePersistentCartItem("product-123");
  expect(api.delete).toHaveBeenCalledWith("/cart/items/product-123");
});
