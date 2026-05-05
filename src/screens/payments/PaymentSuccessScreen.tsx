import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { CUSTOMER_SCREENS } from "../../navigation/customer.routes";
import { OWNER_SCREENS } from "../../navigation/owner.routes";
import { t } from "../../ui/tokens";

function formatBRL(value?: number | string) {
  const n = Number(String(value ?? 0).replace(",", "."));

  if (!Number.isFinite(n) || n <= 0) return null;

  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function PaymentSuccessScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = route?.params || {};

  const orderId = params?.orderId ? String(params.orderId) : undefined;
  const orderCode = params?.orderCode ? String(params.orderCode) : undefined;
  const total = formatBRL(params?.total);

  const isOwnerFlow = String(route?.name || "").includes("Owner");

  const buyRoute = isOwnerFlow
    ? OWNER_SCREENS.Buy
    : CUSTOMER_SCREENS.Buy;

  const orderDetailsRoute = isOwnerFlow
    ? OWNER_SCREENS.OrderDetails
    : CUSTOMER_SCREENS.OrderDetails;

  const brandGreen = (t.colors as any).success || "#10B981";

  return (
    <Screen>
      <Container style={styles.container}>
        <View style={styles.content}>
          <Ionicons
            name="checkmark-circle-outline"
            size={100}
            color={brandGreen}
            style={styles.icon}
          />

          <Text style={[styles.title, { color: brandGreen }]}>
            Compra Realizada!
          </Text>

          <Text style={styles.subtitle}>
            O pagamento foi confirmado e seu pedido está sendo processado.
          </Text>

          {orderCode || total ? (
            <Text style={styles.details}>
              {orderCode ? `Pedido: ${orderCode}` : ""}
              {orderCode && total ? " • " : ""}
              {total ? `Total: ${total}` : ""}
            </Text>
          ) : null}
        </View>

        <View style={styles.buttonContainer}>
          {orderId ? (
            <Pressable
              onPress={() => navigation.replace(orderDetailsRoute, { orderId })}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: brandGreen },
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>Ver pedido</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => navigation.navigate(buyRoute)}
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: brandGreen },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.secondaryButtonText, { color: brandGreen }]}>
              {isOwnerFlow ? "Ir para a loja" : "Continuar comprando"}
            </Text>
          </Pressable>
        </View>
      </Container>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
  },

  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  icon: {
    marginBottom: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 10,
    textAlign: "center",
  },

  subtitle: {
    color: t.colors.text2,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 15,
    paddingHorizontal: 10,
  },

  details: {
    color: t.colors.text2,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },

  buttonContainer: {
    gap: 12,
    width: "100%",
  },

  primaryButton: {
    minHeight: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },

  secondaryButton: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },

  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },

  pressed: {
    opacity: 0.82,
  },
});