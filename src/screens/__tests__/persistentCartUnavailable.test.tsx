import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { CustomerCartScreen } from "../customer/CustomerCartScreen";
import { OwnerCartScreen } from "../owner/OwnerCartScreen";

const mockNavigate = jest.fn();
const mockPreview = jest.fn();
const mockRemove = jest.fn();
const mockRefetch = jest.fn();
let mockRole = "CUSTOMER";
const mockCartState: any = { current: null };
const mockAlerts: any[] = [];

jest.mock("@react-navigation/native", () => ({ useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }) }));
jest.mock("../../stores/auth.store", () => ({ useAuthStore: (selector: any) => selector({ token: "token", activeRole: mockRole }) }));
jest.mock("../../core/api/client", () => ({ api: { post: (...args: any[]) => mockPreview(...args) } }));
jest.mock("../../core/api/hooks/usePersistentCart", () => ({ usePersistentCart: () => mockCartState.current }));
jest.mock("../../features/components/cart/SharedOwnerCustomerCartScreen", () => ({ SharedOwnerCustomerCartScreen: () => null }));
jest.mock("../../ui/components/IosAlert", () => ({ IosAlert: (props: any) => { mockAlerts.push(props); return null; } }));
jest.mock("../../ui/components/IosConfirm", () => ({ IosConfirm: () => null }));

const screens = [
  ["CUSTOMER", CustomerCartScreen],
  ["SALON_OWNER", OwnerCartScreen],
] as const;

function fixture(unavailableItems?: Array<{ productId: string; reason: string }>) {
  const cart: any = {
    id: "cart", userId: "user", couponCode: null, coupon: null,
    items: [{ productId: "valid", qty: 1, name: "Valid", pricing: { unitBase: 10, unitFinal: 10, lineBase: 10, lineFinal: 10 } }],
    totals: { itemsCount: 1, uniqueItems: 1, subtotalBase: 10, subtotalAfterPromos: 10, couponDiscount: 0, total: 10 },
    updatedAt: "now",
    ...(unavailableItems === undefined ? {} : { unavailableItems }),
  };
  const idle = { isPending: false, mutate: jest.fn() };
  mockCartState.current = {
    cart, cartQuery: { isLoading: false, isError: false, data: { cart }, refetch: mockRefetch },
    addItemMutation: idle, setItemQtyMutation: idle,
    removeItemMutation: { isPending: false, mutate: mockRemove, mutateAsync: mockRemove },
    clearCartMutation: idle, applyCouponMutation: idle, removeCouponMutation: idle,
  };
}

async function mount(Screen: React.ComponentType): Promise<ReactTestRenderer> {
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<Screen />); });
  return tree;
}

function cartProps(tree: ReactTestRenderer): any {
  return tree.root.findByType(require("../../features/components/cart/SharedOwnerCustomerCartScreen").SharedOwnerCustomerCartScreen).props;
}

describe.each(screens)("%s unavailable cart", (role, Screen) => {
  beforeEach(() => { jest.clearAllMocks(); mockRole = role; mockAlerts.length = 0; mockPreview.mockResolvedValue({ data: { canCheckout: true, unavailable: [] } }); });

  it("accepts old responses without unavailableItems and keeps checkout available", async () => {
    fixture();
    const tree = await mount(Screen);
    expect(cartProps(tree).unavailableItems).toEqual([]);
    expect(cartProps(tree).canCheckout).toBe(true);
  });

  it("keeps normal checkout with an explicit empty unavailableItems list", async () => {
    fixture([]);
    const tree = await mount(Screen);
    expect(cartProps(tree).canCheckout).toBe(true);
    expect(cartProps(tree).rows).toHaveLength(1);
    expect(cartProps(tree).summary.total).toBe("10.00");
    await act(async () => { await cartProps(tree).onCheckout(); });
    expect(mockPreview).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalled();
  });

  it("blocks checkout and does not remove unavailable products automatically", async () => {
    fixture([{ productId: "bad", reason: "PRODUCT_INACTIVE" }]);
    const tree = await mount(Screen);
    expect(cartProps(tree).canCheckout).toBe(false);
    await act(async () => { await cartProps(tree).onCheckout(); });
    expect(mockPreview).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it("does not automatically remove items reported unavailable by preview", async () => {
    fixture([]);
    mockPreview.mockResolvedValue({ data: { canCheckout: false, unavailable: [{ productId: "bad", reason: "INACTIVE", qty: 1 }] } });
    const tree = await mount(Screen);
    await act(async () => { await cartProps(tree).onCheckout(); });
    expect(mockRemove).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockAlerts.at(-1).visible).toBe(true);
  });

  it("removes the selected unavailable item through the cart mutation", async () => {
    fixture([{ productId: "bad", reason: "PRODUCT_MISSING" }]);
    mockRemove.mockResolvedValue({ ok: true });
    mockRefetch.mockResolvedValue({});
    const tree = await mount(Screen);
    await act(async () => { await cartProps(tree).onRemoveUnavailableItem("bad"); });
    expect(mockRemove).toHaveBeenCalledWith("bad");
    expect(mockRefetch).not.toHaveBeenCalled();
  });

  it("ignores a second removal tap while the first DELETE is pending", async () => {
    fixture([{ productId: "bad", reason: "PRODUCT_INACTIVE" }]);
    let resolveDelete!: (value: unknown) => void;
    mockRemove.mockImplementation(() => new Promise((resolve) => { resolveDelete = resolve; }));
    mockRefetch.mockResolvedValue({});
    const tree = await mount(Screen);
    let first!: Promise<void>;
    let second!: Promise<void>;
    await act(async () => {
      first = cartProps(tree).onRemoveUnavailableItem("bad");
      second = cartProps(tree).onRemoveUnavailableItem("bad");
    });
    expect(mockRemove).toHaveBeenCalledTimes(1);
    await act(async () => { resolveDelete({ ok: true }); await Promise.all([first, second]); });
    expect(mockRefetch).not.toHaveBeenCalled();
  });

  it("retains an unavailable item and shows a friendly error when DELETE fails", async () => {
    fixture([{ productId: "bad", reason: "FORBIDDEN_FOR_ROLE" }]);
    mockRemove.mockRejectedValue(new Error("network failed"));
    const tree = await mount(Screen);
    await act(async () => { await cartProps(tree).onRemoveUnavailableItem("bad"); });
    expect(cartProps(tree).unavailableItems).toEqual([{ productId: "bad", reason: "FORBIDDEN_FOR_ROLE" }]);
    expect(mockAlerts.at(-1).visible).toBe(true);
    expect(mockRefetch).not.toHaveBeenCalled();
  });
});
