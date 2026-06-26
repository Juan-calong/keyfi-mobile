import React from "react";
import { View, Text, Alert } from "react-native";
import Clipboard from "@react-native-clipboard/clipboard";

import { Card } from "../../ui/components/Card";
import { Button } from "../../ui/components/Button";
import { t } from "../../ui/tokens";
import { useNavigation } from "@react-navigation/native";
import { CUSTOMER_SCREENS } from "../../navigation/customer.routes";

export function BoletoPaymentSheet({
  envelope,
  webViewRouteName = CUSTOMER_SCREENS.BoletoWebView,
}: {
  envelope: any;
  webViewRouteName?: string;
}) {
  const action: any = envelope?.nextAction;
  const navigation = useNavigation<any>();

  const ticketUrl = (action?.ticketUrl || action?.url || action?.ticket_url) as string | undefined;
  const hasTicketUrl = Boolean(ticketUrl);
  const digitableLine = action?.digitableLine as string | undefined;
  const barcode = action?.barcode as string | undefined;

  const onOpen = async () => {
    if (!ticketUrl) {
      Alert.alert("Boleto", "Sem link do boleto legado. Tente copiar a linha digitável.");
      return;
    }
    navigation.navigate(webViewRouteName, { url: ticketUrl });
  };

  const onCopyLine = () => {
    if (!digitableLine) return Alert.alert("Boleto", "Sem linha digitável.");
    Clipboard.setString(digitableLine);
    Alert.alert("Copiado!", "Cole no app do seu banco para pagar o boleto.");
  };

  const onCopyBarcode = () => {
    if (!barcode) return Alert.alert("Boleto", "Sem código de barras.");
    Clipboard.setString(barcode);
    Alert.alert("Copiado!", "Código de barras copiado.");
  };

  const paymentId = envelope.providerPaymentId || envelope.paymentIntentId;

  return (
    <Card style={{ padding: 14, borderRadius: 18 }}>
      <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 16 }}>
        Boleto legado
      </Text>

      {paymentId ? (
        <Text style={{ color: t.colors.text2, fontWeight: "800", marginBottom: 10 }}>
          ID: {paymentId}
        </Text>
      ) : null}

      <Text style={{ color: t.colors.text2, fontWeight: "800", marginBottom: 10 }}>
        {envelope?.ui?.message || "Boleto legado disponível. Pague até o vencimento."}
      </Text>

      <View style={{ marginTop: 12, flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        {hasTicketUrl ? <Button title="Abrir boleto" variant="primary" onPress={onOpen} /> : null}
        <Button title="Copiar linha digitável" variant="ghost" onPress={onCopyLine} />
        {barcode ? <Button title="Copiar código de barras" variant="ghost" onPress={onCopyBarcode} /> : null}
      </View>

      {!hasTicketUrl ? (
        <Text style={{ marginTop: 12, color: t.colors.text2, fontWeight: "800", fontSize: 12 }}>
          Visualização de boleto legado sem link disponível.
        </Text>
      ) : null}

      {digitableLine ? (
        <Text style={{ marginTop: 12, color: t.colors.text2, fontWeight: "800", fontSize: 12 }}>
          {digitableLine}
        </Text>
      ) : null}
    </Card>
  );
}
