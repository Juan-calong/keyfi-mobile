import React from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBreakpoints } from "../../../ui/responsive";
import { CartCouponSection } from "./CartCouponSection";
import { CartSummarySection } from "./CartSummarySection";
import type { CartPreviewResp } from "./cart.shared.types";
import { s } from "./cart.shared.styles";

type Props = {
  visible: boolean;
  onClose: () => void;
  promoInput: string;
  onChangePromoInput: (value: string) => void;
  onApplyCoupon: () => void;
  applyCouponPending: boolean;
  appliedCoupon?: string | null;
  onRemoveCoupon: () => void;
  summary?: CartPreviewResp["summary"];
};

export function CartSummarySheet({
  visible,
  onClose,
  promoInput,
  onChangePromoInput,
  onApplyCoupon,
  applyCouponPending,
  appliedCoupon,
  onRemoveCoupon,
  summary,
}: Props) {
  const insets = useSafeAreaInsets();
  const bp = useBreakpoints();
  const isTabletLandscape = bp.isTablet && bp.width > bp.height;
  const sheetWidthStyle = isTabletLandscape
    ? { maxWidth: 820, width: "100%", alignSelf: "center" as const }
    : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.sheetKeyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={s.sheetOverlay} onPress={onClose} />
        <View style={[s.sheetWrap, sheetWidthStyle, { paddingBottom: insets.bottom + 16 }]}>
          <View style={s.sheetHandle} />

          <View style={s.sheetHeaderRow}>
            <Text style={s.sheetTitle}>Resumo do pedido</Text>
            <Pressable onPress={onClose} style={s.sheetCloseHit}>
              <Text style={s.sheetCloseText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <CartCouponSection
              promoInput={promoInput}
              onChangePromoInput={onChangePromoInput}
              onApplyCoupon={onApplyCoupon}
              applyCouponPending={applyCouponPending}
              appliedCoupon={appliedCoupon}
              onRemoveCoupon={onRemoveCoupon}
              compact
            />

            <CartSummarySection summary={summary} />

            <Text style={s.sheetSecurityText}>Ambiente 100% seguro</Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
