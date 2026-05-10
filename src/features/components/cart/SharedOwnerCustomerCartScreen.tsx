import React from "react";
import {
  StatusBar,
  View,
  Pressable,
  Text,
  Image,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { Screen } from "../../../ui/components/Screen";
import { Container } from "../../../ui/components/Container";
import { Loading, ErrorState } from "../../../ui/components/State";

import { CartHeader } from "./CartHeader";
import { CartBanner } from "./CartBanner";
import { CartCheckoutBar } from "./CartCheckoutBar";
import { CartSummarySheet } from "./CartSummarySheet";
import { OwnerCustomerCartRow } from "./OwnerCustomerCartRow";
import { s } from "./cart.shared.styles";
import type {
  BannerState,
  CartPreviewItem,
  CartPreviewResp,
} from "./cart.shared.types";

type Props = {
  cartItemsLength: number;
  rows: CartPreviewItem[];
  summary?: CartPreviewResp["summary"];

  isFirstLoad: boolean;
  showError: boolean;
  onRetry: () => void;

  banner: BannerState;
  onDismissBanner: () => void;

  onBack: () => void;
  onClearCart: () => void;

  promoInput: string;
  onChangePromoInput: (value: string) => void;
  onApplyCoupon: () => void;
  applyCouponPending: boolean;
  appliedCoupon?: string | null;
  onRemoveCoupon: () => void;

  onOpenProduct: (productId: string) => void;
  onInc: (productId: string) => void;
  onDec: (productId: string) => void;
  onRemoveItem: (productId: string) => void;

  canCheckout: boolean;
  checkoutPending: boolean;
  onCheckout: () => void;

  onGoToShop: () => void;
};

export function SharedOwnerCustomerCartScreen({
  cartItemsLength,
  rows,
  summary,
  isFirstLoad,
  showError,
  onRetry,
  banner,
  onDismissBanner,
  onBack,
  onClearCart,
  promoInput,
  onChangePromoInput,
  onApplyCoupon,
  applyCouponPending,
  appliedCoupon,
  onRemoveCoupon,
  onOpenProduct,
  onInc,
  onDec,
  onRemoveItem,
  canCheckout,
  checkoutPending,
  onCheckout,
  onGoToShop,
}: Props) {
  const BG = "#F5F5F7";

  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const [summaryVisible, setSummaryVisible] = React.useState(false);
  const [footerHeight, setFooterHeight] = React.useState(0);

  // sobe o footer acima da tab bar
  const footerMarginBottom = Math.max(tabBarHeight - insets.bottom, 0);
  const footerPaddingBottom = Math.max(insets.bottom, 10);
  const listBottomPadding = footerHeight + footerMarginBottom + 20;

  const EmptyCartBlock = () => (
    <View style={s.emptyWrap}>
      <View style={s.emptyIconWrap}>
        <Image
          source={require("../../../assets/icons/cart.png")}
          style={s.emptyIcon}
        />
      </View>

      <Text style={s.emptyTitle}>Seu carrinho está vazio</Text>

      <Text style={s.emptySubtitle}>
        Adicione produtos para continuar sua compra com segurança e praticidade.
      </Text>

      <Pressable onPress={onGoToShop} style={({ pressed }) => [s.emptyBtn, pressed && { opacity: 0.9 }]}> 
        <Text style={s.emptyBtnText}>Voltar para loja</Text>
      </Pressable>
    </View>
  );

  return (
    <Screen style={{ backgroundColor: BG as any }}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <Container style={{ flex: 1, backgroundColor: BG }}>
          <CartHeader
            title="Carrinho"
            itemCount={cartItemsLength}
            onBack={onBack}
            rightText={cartItemsLength ? "Limpar" : ""}
            onRightPress={onClearCart}
          />

          <CartBanner banner={banner} onClose={onDismissBanner} />

          {cartItemsLength === 0 ? (
            <EmptyCartBlock />
          ) : isFirstLoad ? (
            <Loading />
          ) : showError ? (
            <ErrorState onRetry={onRetry} />
          ) : rows.length === 0 ? (
            <EmptyCartBlock />
          ) : (
            <View style={{ flex: 1 }}>
              <FlatList
                data={rows}
                keyExtractor={(item) => item.productId}
                renderItem={({ item }) => (
                  <OwnerCustomerCartRow
                    row={item}
                    onOpenProduct={onOpenProduct}
                    onInc={onInc}
                    onDec={onDec}
                    onRemove={onRemoveItem}
                  />
                )}
                style={s.productsScroll}
                contentContainerStyle={[s.productsContent, { paddingBottom: listBottomPadding }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              />

              <View
                onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
                style={[
                  s.fixedBottomWrap,
                  {
                    marginBottom: footerMarginBottom,
                    paddingBottom: footerPaddingBottom,
                  },
                ]}
              >
                <CartCheckoutBar
                  summary={summary}
                  canCheckout={canCheckout}
                  checkoutPending={checkoutPending}
                  onCheckout={onCheckout}
                  onOpenSummary={() => setSummaryVisible(true)}
                />
              </View>
                <CartSummarySheet
                visible={summaryVisible}
                onClose={() => setSummaryVisible(false)}
                promoInput={promoInput}
                onChangePromoInput={onChangePromoInput}
                onApplyCoupon={onApplyCoupon}
                applyCouponPending={applyCouponPending}
                appliedCoupon={appliedCoupon}
                onRemoveCoupon={onRemoveCoupon}
                summary={summary}
              />
            </View>
          )}
      </Container>
    </Screen>
  );
}