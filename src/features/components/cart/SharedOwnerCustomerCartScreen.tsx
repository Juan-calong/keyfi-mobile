import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  View,
  Pressable,
  Text,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { Screen } from "../../../ui/components/Screen";
import { Container } from "../../../ui/components/Container";
import { Empty, Loading, ErrorState } from "../../../ui/components/State";

import { CartHeader } from "./CartHeader";
import { CartBanner } from "./CartBanner";
import { CartCouponSection } from "./CartCouponSection";
import { CartSummarySection } from "./CartSummarySection";
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
  const WHITE = "#FFFFFF";

  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  // sobe o footer acima da tab bar
  const footerMarginBottom = Math.max(tabBarHeight - insets.bottom, 0);
  const footerPaddingBottom = Math.max(insets.bottom, 12);

  const EmptyCartBlock = () => (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
      }}
    >
      <View
        style={{
          width: 112,
          height: 112,
          borderRadius: 32,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <Image
          source={require("../../../assets/icons/cart.png")}
          style={{
            width: 80,
            height: 80,
            resizeMode: "contain",
            tintColor: "#B6923E",
          }}
        />
      </View>

      <Text
        style={{
          fontSize: 22,
          fontWeight: "800",
          color: "#1F1A14",
          marginBottom: 8,
          letterSpacing: 0.2,
        }}
      >
        Seu carrinho está vazio
      </Text>

      <Text
        style={{
          fontSize: 14,
          lineHeight: 22,
          color: "#7A6F63",
          textAlign: "center",
          maxWidth: 280,
          marginBottom: 24,
        }}
      />

      <Pressable
        onPress={onGoToShop}
        style={({ pressed }) => [
          {
            minWidth: 190,
            paddingHorizontal: 22,
            paddingVertical: 14,
            borderRadius: 16,
            backgroundColor: "#111111",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          },
          pressed && { opacity: 0.9, transform: [{ scale: 0.985 }] },
        ]}
      >
        <Text
          style={{
            color: "#FFFFFF",
            fontSize: 15,
            fontWeight: "800",
            letterSpacing: 0.3,
          }}
        >
          Voltar para loja
        </Text>
      </Pressable>
    </View>
  );

  return (
    <Screen style={{ backgroundColor: WHITE as any }}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      <SafeAreaView style={{ flex: 1, backgroundColor: WHITE }}>
        <Container style={{ flex: 1, backgroundColor: WHITE }}>
          <CartHeader
            title="Carrinho"
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
              <ScrollView
                style={s.productsScroll}
                contentContainerStyle={s.productsContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View>
                  <View style={s.divider} />

                  {rows.map((row, idx) => (
                    <View key={row.productId}>
                      <OwnerCustomerCartRow
                        row={row}
                        onOpenProduct={onOpenProduct}
                        onInc={onInc}
                        onDec={onDec}
                        onRemove={onRemoveItem}
                      />

                      <View
                        style={[
                          s.divider,
                          idx === rows.length - 1 ? s.dividerAfterLast : null,
                        ]}
                      />
                    </View>
                  ))}
                </View>

                <View style={{ height: 20 }} />
              </ScrollView>

              <View
                style={[
                  s.fixedBottomWrap,
                  {
                    marginBottom: footerMarginBottom,
                    paddingBottom: footerPaddingBottom,
                  },
                ]}
              >
                <CartCouponSection
                  promoInput={promoInput}
                  onChangePromoInput={onChangePromoInput}
                  onApplyCoupon={onApplyCoupon}
                  applyCouponPending={applyCouponPending}
                  appliedCoupon={appliedCoupon}
                  onRemoveCoupon={onRemoveCoupon}
                  disabled={rows.length === 0}
                  compact
                />

                <CartSummarySection summary={summary} compact />

                <View style={s.checkoutOnlyWrap}>
                  <Pressable
                    style={({ pressed }) => [
                      s.checkoutBtn,
                      (!canCheckout || checkoutPending) && { opacity: 0.55 },
                      pressed &&
                        canCheckout &&
                        !checkoutPending && { opacity: 0.85 },
                    ]}
                    disabled={!canCheckout || checkoutPending}
                    onPress={onCheckout}
                  >
                    <Text style={s.checkoutText}>
                      {checkoutPending ? "..." : "Finalizar compra"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        </Container>
      </SafeAreaView>
    </Screen>
  );
}