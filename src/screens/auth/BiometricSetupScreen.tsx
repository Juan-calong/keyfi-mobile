import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StatusBar,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { IosAlert } from "../../ui/components/IosAlert";
import { useAuthStore } from "../../stores/auth.store";
import { friendlyError } from "../../core/errors/friendlyError";

const COLORS = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  text: "#0F172A",
  sub: "#64748B",
  border: "#E2E8F0",
  primaryA: "#2E6BFF",
  primaryB: "#1F4FDB",
  primarySoft: "#EEF4FF",
  successSoft: "#F8FAFC",
};

export function BiometricSetupScreen() {
  const insets = useSafeAreaInsets();

  const enableBiometricsForCurrentSession = useAuthStore(
    (s) => s.enableBiometricsForCurrentSession
  );
  const skipBiometricSetup = useAuthStore((s) => s.skipBiometricSetup);

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ title: string; message: string } | null>(null);

  function showModal(title: string, message: string) {
    setAlert({ title, message });
  }

  async function handleEnable() {
    if (loading) return;

    try {
      setLoading(true);
      await enableBiometricsForCurrentSession();
    } catch (e: any) {
      const fe = friendlyError(e);
      showModal(fe.title || "Biometria", fe.message || "Não foi possível ativar a biometria neste aparelho.");
    } finally {
      setLoading(false);
    }
  }

  function handleSkip() {
    if (loading) return;
    skipBiometricSetup();
  }

  return (
    <Screen style={{ backgroundColor: COLORS.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <View style={[styles.navbar, { paddingTop: Math.max(insets.top, 10) }]}>
        <View style={styles.navRow}>
          <View style={styles.navSide} />
          <Text style={styles.navTitle}>Biometria</Text>
          <View style={styles.navSide} />
        </View>
      </View>

      <View style={styles.hairline} />

      <Container>
        <View style={styles.content}>
          <View style={styles.heroCard}>
            <LinearGradient
              colors={[COLORS.primaryA, COLORS.primaryB]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconCircle}
            >
              <Ionicons name="finger-print-outline" size={34} color="#FFFFFF" />
            </LinearGradient>

            <Text style={styles.title}>Deseja ativar biometria neste aparelho?</Text>
            <Text style={styles.subtitle}>
              Use Face ID ou digital para facilitar seus próximos acessos ao app.
            </Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="phone-portrait-outline" size={18} color={COLORS.primaryA} />
              <Text style={styles.infoText}>A biometria vale apenas neste aparelho.</Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={18} color={COLORS.primaryA} />
              <Text style={styles.infoText}>Seu login com email e senha continua disponível.</Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.primaryA} />
              <Text style={styles.infoText}>A ativação é opcional e pode ser desativada depois.</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={handleEnable}
              disabled={loading}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && !loading ? styles.pressed : null,
                loading ? styles.disabled : null,
              ]}
            >
              <LinearGradient
                colors={[COLORS.primaryA, COLORS.primaryB]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButtonBg}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="finger-print-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>Ativar biometria</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={handleSkip}
              disabled={loading}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && !loading ? styles.pressed : null,
                loading ? styles.disabled : null,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Agora não</Text>
            </Pressable>
          </View>
        </View>
      </Container>

      <IosAlert
        visible={!!alert}
        title={alert?.title || ""}
        message={alert?.message || ""}
        onClose={() => setAlert(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  navbar: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  navRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navSide: {
    width: 56,
  },
  navTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E2E8F0",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 28,
  },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 22,
    paddingVertical: 26,
    alignItems: "center",
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: "#64748B",
    textAlign: "center",
  },
  infoCard: {
    marginTop: 18,
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 18,
    gap: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    lineHeight: 20,
    color: "#334155",
  },
  actions: {
    marginTop: 24,
  },
  primaryButton: {
    borderRadius: 18,
    overflow: "hidden",
  },
  primaryButtonBg: {
    minHeight: 56,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    marginTop: 12,
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#D7E3FF",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#1F4FDB",
    fontSize: 15,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.7,
  },
});