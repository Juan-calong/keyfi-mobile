import React, { useMemo } from "react";
import {
  View,
  Text,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import Clipboard from "@react-native-clipboard/clipboard";
import QRCode from "react-native-qrcode-svg";

const UI = {
  background: "#F7F8FA",
  card: "#FFFFFF",
  primary: "#0067E6",
  primaryPressed: "#0058C9",
  primarySoft: "#EEF5FF",
  text: "#111827",
  text2: "#667085",
  text3: "#8A94A6",
  border: "#E6EAF0",
  divider: "#EEF0F3",
  warningBg: "#FFF7ED",
  warningBorder: "#FDBA74",
  warningText: "#9A3412",
};

function firstNonEmptyString(...values: any[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function normalizeUrl(value: any) {
  if (typeof value !== "string") return null;

  const raw = value.trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) return raw;

  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(raw)) {
    return `https://${raw}`;
  }

  return null;
}

function toPositiveNumber(value: any) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    const parsed = Number(normalized);

    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function formatMoney(value: any) {
  const amount = toPositiveNumber(value);
  if (!amount) return null;

  try {
    return amount.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  } catch {
    return `R$ ${amount.toFixed(2).replace(".", ",")}`;
  }
}

function formatDateTime(value: any) {
  if (!value) return null;

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return date.toLocaleString("pt-BR");
  } catch {
    return null;
  }
}

export function PixPaymentSheet({
  envelope,
  onViewOrders,
  viewOrdersLabel = "Ver meus pedidos",
}: {
  envelope: any;
  onViewOrders?: () => void;
  viewOrdersLabel?: string;
}) {
  const action = envelope?.nextAction ?? {};
  const payment = envelope?.payment ?? {};
  const raw = envelope?.raw ?? envelope?.payment?.raw ?? null;

  const paymentId =
    payment?.externalId ||
    payment?.id ||
    envelope?.providerPaymentId ||
    envelope?.paymentIntentId ||
    null;

  const method = firstNonEmptyString(
    payment?.method,
    envelope?.method,
    raw?.payment?.method
  );

  const status = firstNonEmptyString(
    payment?.status,
    envelope?.status,
    raw?.payment?.status
  );

  const amount = formatMoney(
    payment?.amount ||
      payment?.amountPaid ||
      envelope?.order?.amountDue ||
      envelope?.order?.totalAmount ||
      envelope?.amount
  );

  const expiresAt = formatDateTime(
    payment?.expiresAt ||
      envelope?.expiresAt ||
      raw?.payment?.expiresAt ||
      raw?.payload?.expiresAt
  );

  const pixCode = useMemo(() => {
    return firstNonEmptyString(
      action?.qrCode,
      action?.pixCopyPaste,
      action?.copyPaste,
      action?.copyAndPaste,
      raw?.nextAction?.qrCode,
      raw?.payload?.pixCopiaECola,
      raw?.payload?.qrCode
    );
  }, [action, raw]);

  const ticketUrl = useMemo(() => {
    return normalizeUrl(
      action?.ticketUrl ||
        action?.checkoutUrl ||
        action?.url ||
        raw?.nextAction?.ticketUrl ||
        raw?.payload?.location
    );
  }, [action, raw]);

  const onOpen = async () => {
    if (!ticketUrl) {
      Alert.alert("Pagamento", "Sem link utilizável do PIX. Use o copiar e cola.");
      return;
    }

    try {
      const supported = await Linking.canOpenURL(ticketUrl);

      if (!supported) {
        Alert.alert("Pagamento", "Não foi possível abrir este link no aparelho.");
        return;
      }

      await Linking.openURL(ticketUrl);
    } catch {
      Alert.alert("Pagamento", "Não foi possível abrir este link. Use o copiar e cola.");
    }
  };

  const onCopyPix = () => {
    if (!pixCode) {
      Alert.alert("Erro", "Sem código PIX copia e cola.");
      return;
    }

    Clipboard.setString(pixCode);
    Alert.alert("Copiado!", "Cole no app do seu banco em PIX > Copia e Cola.");
  };

  const hasPixCode = !!pixCode;
  const hasTicketUrl = !!ticketUrl;

  return (
    <ScrollView
      style={s.wrap}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <View style={s.header}>
        <Text style={s.subtitle}>
          Escaneie o QR Code ou copie o código PIX.
        </Text>
      </View>

      {hasPixCode ? (
        <>
          <View style={[s.card, s.qrCard]}>
            <View style={s.qrBox}>
              <QRCode value={pixCode} size={210} />
            </View>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Código PIX</Text>

            <Text style={s.pixCode} selectable>
              {pixCode}
            </Text>

            <ActionButton title="Copiar Código" onPress={onCopyPix} variant="primary" />
          </View>
        </>
      ) : (
        <View style={[s.card, s.warningCard]}>
          <Text style={s.warningTitle}>PIX criado, mas sem código visual</Text>
          <Text style={s.warningText}>
            O pagamento existe, mas não chegou código suficiente para montar o QR no app.
          </Text>

          {hasTicketUrl ? (
            <View style={s.warningAction}>
              <ActionButton title="Abrir link do PIX" onPress={onOpen} variant="primary" />
            </View>
          ) : null}
        </View>
      )}

<View style={s.card}>
  <Text style={s.cardTitle}>Detalhes do pagamento</Text>

  <View style={s.details}>
    <DetailRow label="Método" value={String(method || "PIX").toUpperCase()} />

    {amount ? <DetailRow label="Valor" value={amount} accent /> : null}

    {paymentId ? (
      <DetailRow
        label="ID do pagamento"
        value={String(paymentId)}
        selectable
      />
    ) : null}

    {expiresAt ? <DetailRow label="Expira em" value={expiresAt} /> : null}
  </View>
</View>

      {hasTicketUrl || onViewOrders ? (
        <View style={s.actions}>
          {hasTicketUrl && hasPixCode ? (
            <ActionButton title="Abrir link do PIX" onPress={onOpen} variant="secondary" />
          ) : null}

          {onViewOrders ? (
            <ActionButton
              title={viewOrdersLabel}
              onPress={onViewOrders}
              variant="secondary"
            />
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

function DetailRow({
  label,
  value,
  accent = false,
  selectable = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  selectable?: boolean;
}) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text
        style={[s.detailValue, accent && s.detailValueAccent]}
        selectable={selectable}
      >
        {value}
      </Text>
    </View>
  );
}

function ActionButton({
  title,
  onPress,
  variant,
}: {
  title: string;
  onPress: () => void;
  variant: "primary" | "secondary";
}) {
  const isPrimary = variant === "primary";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.actionBtn,
        isPrimary ? s.actionBtnPrimary : s.actionBtnSecondary,
        pressed && {
          opacity: 0.9,
          transform: [{ scale: 0.995 }],
        },
      ]}
    >
      <Text style={isPrimary ? s.actionTextPrimary : s.actionTextSecondary}>
        {title}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: {
    backgroundColor: UI.background,
    borderRadius: 18,
  },

  content: {
    padding: 16,
    paddingBottom: 22,
    gap: 12,
  },

  header: {
    paddingTop: 2,
    paddingBottom: 2,
    alignItems: "center",
  },

  title: {
    color: UI.text,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
    textAlign: "center",
  },

  subtitle: {
    marginTop: 8,
    maxWidth: 310,
    color: UI.text2,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 17,
    textAlign: "center",
  },

  card: {
    backgroundColor: UI.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },

  qrCard: {
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 18,
  },

  cardHint: {
    color: UI.text2,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
    textAlign: "center",
    marginBottom: 14,
  },

  qrBox: {
    width: 238,
    height: 238,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  cardTitle: {
    color: UI.text,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.1,
  },

  pixCode: {
    marginTop: 10,
    marginBottom: 14,
    color: UI.text,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 17,
  },

  actionBtn: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },

  actionBtnPrimary: {
    backgroundColor: UI.primary,
  },

  actionBtnSecondary: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CFE0FF",
  },

  actionTextPrimary: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.1,
  },

  actionTextSecondary: {
    color: UI.primary,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.1,
  },

  details: {
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: UI.divider,
  },

  detailRow: {
    minHeight: 38,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: UI.divider,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },

  detailLabel: {
    color: UI.text2,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },

  detailValue: {
    flex: 1,
    color: UI.text,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
    textAlign: "right",
  },

  detailValueAccent: {
    color: UI.primary,
    fontWeight: "800",
  },

  actions: {
    gap: 10,
  },

  warningCard: {
    borderColor: UI.warningBorder,
    backgroundColor: UI.warningBg,
  },

  warningTitle: {
    color: UI.warningText,
    fontSize: 14,
    fontWeight: "800",
  },

  warningText: {
    marginTop: 8,
    color: UI.warningText,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 17,
  },

  warningAction: {
    marginTop: 14,
  },
});