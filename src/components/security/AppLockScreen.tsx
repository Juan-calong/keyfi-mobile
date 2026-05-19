import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useSecurityStore } from "../../stores/security.store";
import { useAuthStore } from "../../stores/auth.store";
import { getBiometryDisplayName } from "../../core/security/biometric";

export function AppLockScreen() {
  const [loading, setLoading] = useState(false);

  const biometryType = useSecurityStore((s) => s.biometryType);
  const biometricEnabled = useSecurityStore((s) => s.biometricEnabled);

  const unlockWithBiometrics = useSecurityStore((s) => s.unlockWithBiometrics);

  const logout = useAuthStore((s) => s.logout);

  const title = useMemo(() => {
    const name = getBiometryDisplayName(biometryType);
    return `Desbloquear com ${name}`;
  }, [biometryType]);

  async function handleUnlock() {
    try {
      setLoading(true);
      await unlockWithBiometrics();
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      setLoading(true);
      await logout();
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>App bloqueado</Text>
      <Text style={styles.subtitle}>
        Use a biometria deste aparelho para continuar acessando a sessão.
      </Text>

      {biometricEnabled ? (
        <Pressable
          onPress={handleUnlock}
          disabled={loading}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>{title}</Text>
          )}
        </Pressable>
      ) : null}

      <Pressable onPress={handleLogout} disabled={loading} style={styles.linkBtn}>
        <Text style={styles.linkText}>Sair da conta</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B0F",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    color: "#A1A1AA",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  primaryButton: {
    width: "100%",
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  linkBtn: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  linkText: {
    color: "#6EE7F9",
    fontSize: 15,
    fontWeight: "700",
  },
});