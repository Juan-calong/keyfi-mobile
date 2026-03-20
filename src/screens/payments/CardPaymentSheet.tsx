import React, { useMemo } from "react";
import { View, Text } from "react-native";

import { Card } from "../../ui/components/Card";
import { Button } from "../../ui/components/Button";
import { t } from "../../ui/tokens";

function toneFromStatus(status: string) {
  const s = String(status || "").toUpperCase();
  if (s === "PAID" || s === "APPROVED") return "success";
  if (["FAILED", "REJECTED", "CANCELED", "CANCELLED", "EXPIRED"].includes(s)) return "danger";
  return "warning";
}

function humanDetail(detail?: string) {
  if (!detail) return null;

  // ✅ Sem hardcode de Mercado Pago
  // Se quiser, depois a gente adiciona mapeamentos específicos da Cielo.
  return detail;
}

export function CardPaymentSheet({
  env,
  onRefresh,
  onTryAgain,
}: {
  env: any;
  onRefresh: () => void;
  onTryAgain?: () => void;
}) {
 const paymentId = env.providerPaymentId || env.paymentIntentId;
const status = String(env.status ?? "").toUpperCase();
  const tone = useMemo(() => toneFromStatus(status), [status]);

  const detail =
    env?.nextAction?.type === "CARD" ? String(env?.nextAction?.statusDetail ?? "") : "";

  const detailText = humanDetail(detail);

  const badgeBg =
    tone === "success"
      ? "rgba(16,185,129,0.12)"
      : tone === "danger"
      ? "rgba(225,29,72,0.12)"
      : "rgba(245,158,11,0.12)";

  const badgeBorder =
    tone === "success"
      ? "rgba(16,185,129,0.28)"
      : tone === "danger"
      ? "rgba(225,29,72,0.28)"
      : "rgba(245,158,11,0.28)";

  const badgeText =
    tone === "success" ? t.colors.success : tone === "danger" ? t.colors.danger : t.colors.warning;

  const showRetry = !!env?.flags?.canRetry;

  return (
    <Card style={{ padding: 14, borderRadius: 18, gap: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 16 }}>
            Pagamento no cartão
          </Text>
          <Text style={{ color: t.colors.text2, fontWeight: "800", marginTop: 6 }}>
            {env?.ui?.message || "Aguardando status do cartão…"}
          </Text>
        </View>

        <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: badgeBg, borderWidth: 1, borderColor: badgeBorder }}>
          <Text style={{ color: badgeText, fontWeight: "900", fontSize: 11 }}>
            {status || "—"}
          </Text>
        </View>
      </View>

      {paymentId ? (
        <Text style={{ color: t.colors.text2, fontWeight: "800", marginTop: 2 }}>
          ID: {String(paymentId)}
        </Text>
      ) : null}

      {detail ? (
        <View style={{ marginTop: 6, gap: 6 }}>
          <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 12 }}>
            Detalhe
          </Text>
          <Text style={{ color: t.colors.text2, fontWeight: "800" }}>
            {detailText}
          </Text>
        </View>
      ) : null}

      <View style={{ marginTop: 12, flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        <Button title="Atualizar status" variant="ghost" onPress={onRefresh} style={{ height: 44, borderRadius: 14 }} />
        {showRetry && onTryAgain ? (
          <Button title="Tentar novamente" variant="primary" onPress={onTryAgain} style={{ height: 44, borderRadius: 14 }} />
        ) : null}
      </View>
    </Card>
  );
}