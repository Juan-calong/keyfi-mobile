import React from "react";
import { act, create } from "react-test-renderer";
import { SharedOwnerCustomerCartScreen } from "../SharedOwnerCustomerCartScreen";

jest.mock("react-native", () => ({
  View: "View", Text: "Text", Pressable: "Pressable", Image: "Image",
  StatusBar: "StatusBar", ActivityIndicator: "ActivityIndicator",
  FlatList: ({ ListHeaderComponent }: { ListHeaderComponent?: React.ReactNode }) => ListHeaderComponent ?? null,
  Platform: { OS: "ios", select: (options: Record<string, unknown>) => options.ios }, StyleSheet: { create: (styles: unknown) => styles, absoluteFill: {}, hairlineWidth: 1 },
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("@react-navigation/bottom-tabs", () => ({ useBottomTabBarHeight: () => 0 }));
jest.mock("../../../../ui/components/Screen", () => ({ Screen: ({ children }: { children: React.ReactNode }) => children }));
jest.mock("../../../../ui/components/Container", () => ({ Container: ({ children }: { children: React.ReactNode }) => children }));
jest.mock("../../../../ui/components/State", () => ({ Loading: () => null, ErrorState: () => null }));
jest.mock("../CartHeader", () => ({ CartHeader: () => null }));
jest.mock("../CartBanner", () => ({ CartBanner: () => null }));
jest.mock("../CartCheckoutBar", () => ({ CartCheckoutBar: () => null }));
jest.mock("../CartSummarySheet", () => ({ CartSummarySheet: () => null }));
jest.mock("../OwnerCustomerCartRow", () => ({ OwnerCustomerCartRow: () => null }));

it("shows an unavailable-only cart instead of an empty cart", async () => {
  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(<SharedOwnerCustomerCartScreen
      cartItemsLength={0}
      rows={[]}
      unavailableItems={[{ productId: "private-id", reason: "PRODUCT_INACTIVE" }]}
      removingUnavailableProductId={null}
      onRemoveUnavailableItem={jest.fn()}
      isFirstLoad={false}
      showError={false}
      onRetry={jest.fn()}
      banner={null}
      onDismissBanner={jest.fn()}
      onBack={jest.fn()}
      onClearCart={jest.fn()}
      promoInput=""
      onChangePromoInput={jest.fn()}
      onApplyCoupon={jest.fn()}
      applyCouponPending={false}
      onRemoveCoupon={jest.fn()}
      onOpenProduct={jest.fn()}
      onInc={jest.fn()}
      onDec={jest.fn()}
      onRemoveItem={jest.fn()}
      canCheckout={false}
      checkoutPending={false}
      onCheckout={jest.fn()}
      onGoToShop={jest.fn()}
    />);
  });
  const text = tree.root.findAllByType(require("react-native").Text).map((node) => node.children.join(" ")).join(" ");
  expect(text).toContain("Produtos indisponíveis");
  expect(text).toContain("Remova estes produtos para continuar a compra.");
  expect(text).not.toContain("Seu carrinho está vazio");
  expect(text).not.toContain("private-id");
});
