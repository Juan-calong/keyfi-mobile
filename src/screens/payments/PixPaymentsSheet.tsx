import React, { useMemo } from "react";
import { View, Text, Alert, Linking, Image, Pressable, StyleSheet } from "react-native";
import Clipboard from "@react-native-clipboard/clipboard";


export function PixPaymentSheet({ envelope }: { envelope: any }) {
  const action = envelope.nextAction;

  const qrImgUri = useMemo(() => {
    if (!action?.qrCodeBase64) return null;
    return `data:image/png;base64,${action.qrCodeBase64}`;
  }, [action?.qrCodeBase64]);

  const onOpen = async () => {
    if (!action?.ticketUrl) {
      Alert.alert("Pagamento", "Sem link do checkout. Use o QR / copia e cola.");
      return;
    }
    await Linking.openURL(action.ticketUrl);
  };

  const onCopyPix = () => {
    const code = action?.qrCode;
    if (!code) return Alert.alert("Erro", "Sem qrCode (copia e cola).");
    Clipboard.setString(code);
    Alert.alert("Copiado!", "Cole no app do seu banco em PIX > Copia e Cola.");
  };

  const paymentId = envelope.providerPaymentId || envelope.paymentIntentId;
const message = "Aguardando pagamento…";

  return (
    <View style={s.wrap}>
      <Text style={s.title}>Pagamento PIX</Text>

      {paymentId ? <Text style={s.meta}>PaymentId: {paymentId}</Text> : null}

      <Text style={s.message}>{message}</Text>

      <View style={s.hairline} />

      <View style={s.actions}>
        <OutlineButton title="Abrir checkout" onPress={onOpen} />
        <OutlineButton title="Copiar PIX (copia e cola)" onPress={onCopyPix} />
      </View>

      {qrImgUri ? (
        <View style={s.qrWrap}>
          <Text style={s.qrLabel}>QR (opcional — pagar com outro aparelho)</Text>

          <View style={s.qrBox}>
            <Image source={{ uri: qrImgUri }} style={s.qrImg} resizeMode="contain" />
          </View>
        </View>
      ) : null}
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
  qrImg: {
    width: 210,
    height: 210,
  },
});
