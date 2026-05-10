import React from "react";
import { Pressable, Text, View } from "react-native";
import { toNumberBR, formatBRL } from "./cart.shared.utils";
import type { CartPreviewResp } from "./cart.shared.types";
import { s } from "./cart.shared.styles";

type Props = {
  summary?: CartPreviewResp["summary"];
  canCheckout: boolean;
  checkoutPending: boolean;
  onCheckout: () => void;
  onOpenSummary: () => void;
};

export function CartCheckoutBar({
  summary,
  canCheckout,
  checkoutPending,
  onCheckout,
  onOpenSummary,
}: Props) {
  const total = formatBRL(toNumberBR(summary?.total ?? "0"));

  return (
    <View style={s.checkoutCard}>
      <View style={s.checkoutTopRow}>
        <View style={s.checkoutTotalWrap}>
          <Text style={s.checkoutTotalLabel}>Total</Text>
          <Text style={s.checkoutTotalValue}>{total}</Text>
          <Text style={s.checkoutFreightHint}>Frete calculado na próxima etapa</Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            s.checkoutBtn,
            (!canCheckout || checkoutPending) && { opacity: 0.55 },
            pressed && canCheckout && !checkoutPending && { opacity: 0.85 },
          ]}
          disabled={!canCheckout || checkoutPending}
          onPress={onCheckout}
        >
          <Text style={s.checkoutText}>{checkoutPending ? "..." : "Finalizar compra"}</Text>
        </Pressable>
      </View>

      <Pressable onPress={onOpenSummary} hitSlop={10} style={s.openSummaryHit}>
        <Text style={s.openSummaryText}>Ver resumo do pedido</Text>
      </Pressable>
    </View>
  );
}
