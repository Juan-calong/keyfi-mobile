import React from "react";
import { View, Text, Pressable, StatusBar, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import type { AuthStackParamList } from "../../navigation/AuthStack";

type Props = NativeStackScreenProps<AuthStackParamList, "RegisterChooseRole">;

type CardProps = {
  title: string;
  description: string;
  onPress: () => void;
};

function RoleCard({ title, description, onPress }: CardProps) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "rgba(0,0,0,0.06)" }}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
    >
      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDesc}>{description}</Text>
      </View>

      <Text style={styles.cardChevron} accessibilityElementsHidden>
        ›
      </Text>
    </Pressable>
  );
}

export function RegisterChooseRoleScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const topPad = Math.max(insets.top, 14);

  return (
    <Screen style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* NAVBAR */}
      <View style={[styles.navbar, { paddingTop: topPad }]}>
        <Pressable
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : null)}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backPressed]}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>

        <Text style={styles.navTitle} accessibilityRole="header">
          Criar conta
        </Text>

        {/* Spacer para manter título perfeitamente centralizado */}
        <View style={styles.navRightSpacer} />
      </View>

      <Container>
        <View style={styles.header}>
          <Text style={styles.h1}>Começar</Text>
          <Text style={styles.sub}>Escolha como você quer usar o app</Text>
        </View>

        <View style={styles.cards}>
          <RoleCard
            title="Sou vendedor"
            description="Quero vender produtos e receber pedidos"
            onPress={() => navigation.navigate("RegisterSeller")}
          />

          <RoleCard
            title="Tenho um salão"
            description="Quero gerenciar meu salão e equipe"
            onPress={() => navigation.navigate("RegisterSalon")}
          />

          <RoleCard
            title="Sou cliente"
            description="Quero comprar e acompanhar meus pedidos"
            onPress={() => navigation.navigate("RegisterCustomer")}
          />
        </View>

        <View style={styles.footerHint}>
          <Text style={styles.hint}>Você pode criar outro perfil depois, se precisar.</Text>
        </View>
      </Container>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#FFFFFF",
  },

  // NAVBAR
  navbar: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingBottom: 10,
    height: 44 + 18,
    justifyContent: "flex-end",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(17,24,39,0.10)",
  },
  backBtn: {
    position: "absolute",
    left: 16,
    bottom: 8,
    minWidth: 72,
    justifyContent: "center",
  },
  backText: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  backPressed: {
    opacity: 0.7,
  },
  navTitle: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  navRightSpacer: {
    position: "absolute",
    right: 16,
    bottom: 8,
    width: 72,
    height: 1,
  },

  // HEADER
  header: {
    alignItems: "center",
    marginTop: 28,
    marginBottom: 22,
  },
  h1: {
    fontSize: 40,
    lineHeight: 44,
    color: "#0B1220",
    fontWeight: "900",
    letterSpacing: -0.8,
    textAlign: "center",
  },
  sub: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 22,
    color: "#4B5563",
    fontWeight: "600",
    letterSpacing: -0.2,
    textAlign: "center",
    paddingHorizontal: 12,
  },

  // CARDS
  cards: {
    marginTop: 10,
    gap: 14,
  },
  card: {
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.08)",

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    // iOS shadow
    shadowOpacity: Platform.OS === "ios" ? 0.08 : 0,
    shadowRadius: Platform.OS === "ios" ? 14 : 0,
    shadowOffset: Platform.OS === "ios" ? { width: 0, height: 8 } : { width: 0, height: 0 },

    // Android elevation
    elevation: Platform.OS === "android" ? 2 : 0,
  },
  cardPressed: {
    transform: [{ scale: 0.992 }],
    opacity: 0.98,
  },
  cardText: {
    flex: 1,
    paddingRight: 12,
  },
  cardTitle: {
    fontSize: 20,
    lineHeight: 24,
    color: "#0B1220",
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  cardDesc: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  cardChevron: {
    fontSize: 26,
    lineHeight: 26,
    color: "#9CA3AF",
    marginLeft: 8,
    marginTop: -2,
    fontWeight: "700",
  },

  // FOOTER
  footerHint: {
    marginTop: 16,
    alignItems: "center",
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    color: "#9CA3AF",
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: -0.1,
  },
});

export default RegisterChooseRoleScreen;