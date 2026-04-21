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
  const subtotalBase = formatBRL(toNumberBR(summary?.subtotalBase ?? "0"));
  const discountProducts = formatBRL(toNumberBR(summary?.discountProducts ?? "0"));
  const couponDiscount = formatBRL(toNumberBR(summary?.couponDiscount ?? "0"));
  const shipping = formatBRL(toNumberBR(summary?.shipping ?? "0"));
  const total = formatBRL(toNumberBR(summary?.total ?? "0"));

  return (
    <View style={[s.section, compact && s.sectionCompact]}>
      <Text style={s.sectionLabel}>Resumo do pedido</Text>

      <View style={s.summary}>
        <View style={s.divider} />

        <View style={s.summaryRow}>
          <Text style={s.summaryKey}>Subtotal</Text>
          <Text style={s.summaryVal}>{subtotalBase}</Text>
        </View>

        <View style={s.divider} />

        <View style={s.summaryRow}>
          <Text style={s.summaryKey}>Desconto em produtos</Text>
          <Text style={s.summaryVal}>
            {toNumberBR(summary?.discountProducts ?? "0") > 0
              ? `−${discountProducts}`
              : discountProducts}
          </Text>
        </View>

        <View style={s.divider} />

        <View style={s.summaryRow}>
          <Text style={s.summaryKey}>Cupom</Text>
          <Text style={s.summaryVal}>
            {toNumberBR(summary?.couponDiscount ?? "0") > 0
              ? `−${couponDiscount}`
              : couponDiscount}
          </Text>
        </View>

        <View style={s.divider} />

        <View style={s.summaryRow}>
          <Text style={s.summaryKey}>Frete</Text>
          <Text style={s.summaryVal}>{shipping}</Text>
        </View>

        <View style={s.divider} />

        <View style={[s.summaryRow, s.totalRow]}>
          <Text style={s.totalKey}>Total</Text>
          <Text style={s.totalVal}>{total}</Text>
        </View>

        <View style={s.divider} />
      </View>
    </View>
  );
}