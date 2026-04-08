import React, { useMemo } from "react";
import { View, Text, Alert, Linking, Pressable, StyleSheet } from "react-native";
import Clipboard from "@react-native-clipboard/clipboard";
import QRCode from "react-native-qrcode-svg";

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

export function PixPaymentSheet({ envelope }: { envelope: any }) {
  const action = envelope?.nextAction ?? {};
  const payment = envelope?.payment ?? {};
  const raw = envelope?.raw ?? envelope?.payment?.raw ?? null;

  const paymentId =
    payment?.externalId ||
    payment?.id ||
    envelope?.providerPaymentId ||
    envelope?.paymentIntentId ||
    null;

  const message = String(envelope?.ui?.message || "Aguardando pagamento…");

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
    <View style={s.wrap}>
      <Text style={s.title}>Pagamento PIX</Text>

      {paymentId ? <Text style={s.meta}>PaymentId: {paymentId}</Text> : null}

      <Text style={s.message}>{message}</Text>

      <View style={s.hairline} />

      <View style={s.actions}>
        <OutlineButton title="Copiar PIX (copia e cola)" onPress={onCopyPix} />

        {hasTicketUrl ? (
          <OutlineButton title="Abrir link do PIX" onPress={onOpen} />
        ) : null}
      </View>

      {hasPixCode ? (
        <View style={s.qrWrap}>
          <Text style={s.qrLabel}>QR para pagar com outro aparelho</Text>

          <View style={s.qrBox}>
            <QRCode value={pixCode} size={210} />
          </View>
        </View>
      ) : (
        <View style={s.warnBox}>
          <Text style={s.warnTitle}>PIX criado, mas sem código visual</Text>
          <Text style={s.warnText}>
            O pagamento existe, mas não chegou código suficiente para montar o QR no app.
          </Text>
        </View>
      )}

      <View style={s.tipBox}>
        <Text style={s.tipTitle}>Recomendado</Text>
        <Text style={s.tipText}>
          Para BB Pix, o fluxo mais confiável é usar o botão de copiar e colar ou ler o QR gerado no app.
        </Text>
      </View>
    </View>
  );
}

function OutlineButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.btn, pressed && { opacity: 0.85 }]}>
      <Text style={s.btnText}>{title}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.20)",
    borderRadius: 18,
    padding: 14,
  },

  title: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.2,
  },

  meta: {
    marginTop: 6,
    color: "#000000",
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.75,
  },

  message: {
    marginTop: 10,
    color: "#000000",
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.82,
    lineHeight: 18,
  },

  hairline: {
    marginTop: 14,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0,0,0,0.18)",
    width: "100%",
  },

  actions: {
    marginTop: 14,
    gap: 10,
  },

  btn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#000000",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },

  btnText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: -0.2,
    textAlign: "center",
  },

  qrWrap: {
    marginTop: 16,
    alignItems: "center",
  },

  qrLabel: {
    color: "#000000",
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.75,
    marginBottom: 10,
    textAlign: "center",
  },

  qrBox: {
    width: 240,
    height: 240,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.20)",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },

  warnBox: {
    marginTop: 16,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.30)",
    backgroundColor: "rgba(245,158,11,0.10)",
  },

  warnTitle: {
    color: "#92400E",
    fontSize: 13,
    fontWeight: "900",
  },

  warnText: {
    marginTop: 6,
    color: "#92400E",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },

  tipBox: {
    marginTop: 14,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.18)",
    backgroundColor: "rgba(37,99,235,0.06)",
  },

  tipTitle: {
    color: "#1D4ED8",
    fontSize: 13,
    fontWeight: "900",
  },

  tipText: {
    marginTop: 6,
    color: "#1E3A8A",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
});