import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useSecurityStore } from "../../stores/security.store";
import { useAuthStore } from "../../stores/auth.store";
import { getBiometryDisplayName } from "../../core/security/biometric";

export function AppLockScreen() {
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");

  const biometryType = useSecurityStore((s) => s.biometryType);
  const biometricEnabled = useSecurityStore((s) => s.biometricEnabled);
  const pinEnabled = useSecurityStore((s) => s.pinEnabled);
  const failedPinAttempts = useSecurityStore((s) => s.failedPinAttempts);
  const maxPinAttempts = useSecurityStore((s) => s.maxPinAttempts);

  const unlockWithBiometrics = useSecurityStore((s) => s.unlockWithBiometrics);
  const unlockWithPin = useSecurityStore((s) => s.unlockWithPin);

  const logout = useAuthStore((s) => s.logout);

  const title = useMemo(() => {
    const name = getBiometryDisplayName(biometryType);
    return `Desbloquear com ${name}`;
  }, [biometryType]);

  async function handleUnlock() {
    try {
      setLoading(true);
      const ok = await unlockWithBiometrics();

      if (!ok && pinEnabled) {
        setShowPin(true);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handlePinUnlock() {
    try {
      setLoading(true);
      setPinError("");

      const ok = await unlockWithPin(pin);

      if (!ok) {
        const remaining = Math.max(0, maxPinAttempts - (failedPinAttempts + 1));
        setPin("");
        setPinError(
          remaining > 0
            ? `PIN inválido. Tentativas restantes: ${remaining}`
            : "Muitas tentativas inválidas."
        );
      }
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
        Use sua proteção local para continuar acessando a sessão.
      </Text>

      {biometricEnabled && !showPin ? (
        <>
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

          {pinEnabled ? (
            <Pressable
              onPress={() => {
                setPin("");
                setPinError("");
                setShowPin(true);
              }}
              disabled={loading}
              style={styles.linkBtn}
            >
              <Text style={styles.linkText}>Usar PIN</Text>
            </Pressable>
          ) : null}
        </>
      ) : pinEnabled ? (
        <>
          <TextInput
            value={pin}
            onChangeText={(v) => setPin(v.replace(/\D/g, "").slice(0, 6))}
            placeholder="Digite seu PIN de 6 dígitos"
            placeholderTextColor="#7C7C89"
            keyboardType="number-pad"
            secureTextEntry
            maxLength={6}
            style={styles.input}
          />

          {!!pinError ? <Text style={styles.errorText}>{pinError}</Text> : null}

          <Pressable
            onPress={handlePinUnlock}
            disabled={loading || pin.length !== 6}
            style={({ pressed }) => [
              styles.primaryButton,
              (loading || pin.length !== 6) && styles.primaryButtonDisabled,
              pressed && styles.primaryButtonPressed,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Desbloquear com PIN</Text>
            )}
          </Pressable>

          {biometricEnabled ? (
            <Pressable
              onPress={() => {
                setPin("");
                setPinError("");
                setShowPin(false);
              }}
              disabled={loading}
              style={styles.linkBtn}
            >
              <Text style={styles.linkText}>Voltar para biometria</Text>
            </Pressable>
          ) : null}
        </>
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
    color: "#B7B7C2",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 28,
  },
  input: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#15151C",
    borderWidth: 1,
    borderColor: "#262633",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#fff",
    fontSize: 18,
    letterSpacing: 6,
    textAlign: "center",
    marginBottom: 12,
  },
  errorText: {
    color: "#F87171",
    fontSize: 13,
    marginBottom: 12,
  },
  primaryButton: {
    minWidth: 240,
    backgroundColor: "#1F6FEB",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  linkBtn: {
    marginTop: 16,
    padding: 8,
  },
  linkText: {
    color: "#D1D5DB",
    fontSize: 14,
    fontWeight: "600",
  },
});