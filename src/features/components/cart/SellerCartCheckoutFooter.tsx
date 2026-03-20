import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { formatBRL, toNumberBR } from "./cart.shared.utils";

type SellerSummary = {
  subtotalBase?: string | number;
  discountProducts?: string | number;
  subtotalAfterPromos?: string | number;
  couponDiscount?: string | number;
  shipping?: string | number;
  total?: string | number;
};

type WarningItem = {
  code: string;
  message: string;
};

type Props = {
  s: any;
  warnings?: WarningItem[];
  coupon: string;
  onChangeCoupon: (value: string) => void;
  onApplyCoupon: () => void;
  isApplyingCoupon: boolean;
  appliedCoupon?: string;
  onClearCoupon: () => void;
  summary?: SellerSummary;
  canCheckout?: boolean;
  isSending?: boolean;
  onCheckout: () => void;
};

function SummaryRow({
  s,
  label,
  value,
  bold,
}: {
  s: any;
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Text
        style={[
          { color: "rgba(0,0,0,0.7)", fontWeight: "700" },
          bold && { color: "#000000", fontWeight: "900" },
        ]}
      >
        {label}
      </Text>

      <Text style={[{ color: "#000000", fontWeight: "800" }, bold && { fontWeight: "900" }]}>
        {value}
      </Text>
    </View>
  );
}

export function SellerCartCheckoutFooter({
  s,
  warnings = [],
  coupon,
  onChangeCoupon,
  onApplyCoupon,
  isApplyingCoupon,
  appliedCoupon,
  onClearCoupon,
  summary,
  canCheckout,
  isSending,
  onCheckout,
}: Props) {
  return (
    <View style={s.footer}>
      <View style={s.footerRule} />

      {warnings.length > 0 ? (
        <View style={{ marginBottom: 10, gap: 6 }}>
          {warnings.map((w, idx) => (
            <Text key={`${w.code}-${idx}`} style={s.warningText}>
              {w.message}
            </Text>
          ))}
        </View>
      ) : null}

      <Text style={s.sectionTitle}>Promo code</Text>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
        <TextInput
          value={coupon}
          onChangeText={onChangeCoupon}
          placeholder="Promo code"
          placeholderTextColor="rgba(0,0,0,0.45)"
          autoCapitalize="characters"
          style={s.couponInput}
          returnKeyType="done"
          onSubmitEditing={onApplyCoupon}
        />

        <Pressable
          onPress={onApplyCoupon}
          disabled={isApplyingCoupon}
          style={({ pressed }) => [
            s.couponBtn,
            (pressed || isApplyingCoupon) && { opacity: 0.7 },
          ]}
        >
          <Text style={s.couponBtnText}>
            {isApplyingCoupon ? "..." : "Apply"}
          </Text>
        </Pressable>
      </View>

      {appliedCoupon ? (
        <View style={s.appliedRow}>
          <Text style={s.promoApplied}>Applied: {appliedCoupon}</Text>

          <Pressable onPress={onClearCoupon} hitSlop={10} style={s.clearCouponHit}>
            <Text style={s.clearCouponText}>Remove</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={{ height: 12 }} />

      <Text style={s.sectionTitle}>Order Summary</Text>

      <View style={{ marginTop: 8, gap: 8 }}>
        <SummaryRow
          s={s}
          label="Subtotal base"
          value={formatBRL(toNumberBR(summary?.subtotalBase || 0))}
        />
        <SummaryRow
          s={s}
          label="Desconto produtos"
          value={formatBRL(toNumberBR(summary?.discountProducts || 0))}
        />
        <SummaryRow
          s={s}
          label="Subtotal após promo"
          value={formatBRL(toNumberBR(summary?.subtotalAfterPromos || 0))}
        />
        <SummaryRow
          s={s}
          label="Cupom"
          value={formatBRL(toNumberBR(summary?.couponDiscount || 0))}
        />
        <SummaryRow
          s={s}
          label="Shipping"
          value={formatBRL(toNumberBR(summary?.shipping || 0))}
        />
        <View style={s.sep} />
        <SummaryRow
          s={s}
          label="Total"
          value={formatBRL(toNumberBR(summary?.total || 0))}
          bold
        />
      </View>

      <View style={{ height: 12 }} />

      <Pressable
        onPress={onCheckout}
        disabled={isSending || !canCheckout}
        style={({ pressed }) => [
          s.checkoutBtn,
          (pressed || isSending || !canCheckout) && { opacity: 0.7 },
        ]}
      >
        <Text style={s.checkoutText}>
          {isSending ? "Enviando..." : "Enviar para o salão"}
        </Text>
      </Pressable>
    </View>
  );
}