import React from "react";
import { Text, View } from "react-native";
import { s } from "./cart.shared.styles";
import { formatBRL, toNumberBR } from "./cart.shared.utils";
import type { CartPreviewResp } from "./cart.shared.types";

type Props = {
  summary?: CartPreviewResp["summary"];
  compact?: boolean;
};

export function CartSummarySection({ summary, compact = false }: Props) {
  const subtotalBaseN = toNumberBR(summary?.subtotalBase ?? "0");
  const discountProductsN = toNumberBR(summary?.discountProducts ?? "0");
  const couponDiscountN = toNumberBR(summary?.couponDiscount ?? "0");
  const shippingN = toNumberBR(summary?.shipping ?? "0");
  const totalN = toNumberBR(summary?.total ?? "0");

  const subtotalBase = formatBRL(subtotalBaseN);
  const discountProducts = formatBRL(discountProductsN);
  const couponDiscount = formatBRL(couponDiscountN);
  const shipping = formatBRL(shippingN);
  const total = formatBRL(totalN);

  return (
    <View style={[s.section, compact && s.sectionCompact]}>
      <Text style={s.sectionLabel}>Resumo do pedido</Text>

      <View style={s.summaryCard}>

        <View style={s.summaryRow}>
          <Text style={s.summaryKey}>Subtotal</Text>
          <Text style={s.summaryVal}>{subtotalBase}</Text>
        </View>

        <View style={s.summaryRow}>
          <Text style={s.summaryKey}>Desconto em produtos</Text>
          <Text style={[s.summaryVal, discountProductsN > 0 && s.summaryPositive]}>
            {discountProductsN > 0 ? `−${discountProducts}` : discountProducts}
          </Text>
        </View>


        <View style={s.summaryRow}>
          <Text style={s.summaryKey}>Cupom</Text>
          <Text style={[s.summaryVal, couponDiscountN > 0 && s.summaryPositive]}>
            {couponDiscountN > 0 ? `−${couponDiscount}` : couponDiscount}
          </Text>
        </View>

        <View style={s.summaryRow}>
          <Text style={s.summaryKey}>Frete</Text>
          <Text style={s.summaryVal}>{shippingN === 0 ? "Calculado na próxima etapa" : shipping}</Text>
        </View>

        <View style={s.summaryDivider} />

        <View style={[s.summaryRow, s.totalRow]}>
          <Text style={s.totalKey}>Total</Text>
          <Text style={s.totalVal}>{total}</Text>
        </View>
      </View>
    </View>
  );
}