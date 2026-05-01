import React from "react";
import { Pressable, Text, View } from "react-native";
import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";

export function MercadoPagoCardEntryScreen({ navigation, route }: any) {
  const orderId = route?.params?.orderId;

  return (
    <Screen>
      <Container style={{ flex: 1, justifyContent: "center", padding: 20, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "800" }}>Cartão Mercado Pago</Text>
        <Text style={{ fontSize: 14 }}>
          Este app ainda não possui integração segura de tokenização Mercado Pago para React Native
          neste build.
        </Text>
        <Text style={{ fontSize: 14 }}>
          Pedido: {orderId ? String(orderId) : "não informado"}.
        </Text>
        <View style={{ marginTop: 8, gap: 10 }}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={{ padding: 12, borderWidth: 1, borderRadius: 10, alignItems: "center" }}
          >
            <Text style={{ fontWeight: "700" }}>Voltar</Text>
          </Pressable>
        </View>
      </Container>
    </Screen>
  );
}
