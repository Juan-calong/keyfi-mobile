import React, { useState } from "react";
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  View,
  TextInput,
  Pressable,
} from "react-native";
import { useSecurityStore } from "../../stores/security.store";
import { getBiometryDisplayName } from "../../core/security/biometric";

type Props = {
  onBack?: () => void;
};

export function SecuritySettingsScreen({ onBack }: Props) {
  const [busy, setBusy] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const biometricAvailable = useSecurityStore((s) => s.biometricAvailable);
  const biometryType = useSecurityStore((s) => s.biometryType);
  const biometricEnabled = useSecurityStore((s) => s.biometricEnabled);
  const pinEnabled = useSecurityStore((s) => s.pinEnabled);

  const enableBiometric = useSecurityStore((s) => s.enableBiometric);
  const disableBiometric = useSecurityStore((s) => s.disableBiometric);

  const setupPin = useSecurityStore((s) => s.setupPin);
  const disablePin = useSecurityStore((s) => s.disablePin);

  async function handleBiometricToggle(value: boolean) {
    try {
      setBusy(true);

      if (value) {
        if (!biometricAvailable) {
          Alert.alert(
            "Biometria indisponível",
            "Este aparelho não está pronto para usar biometria no app."
          );
          return;
        }

        const ok = await enableBiometric();

        if (!ok) {
          Alert.alert(
            "Não foi possível ativar",
            "A autenticação biométrica foi cancelada ou falhou."
          );
        }
      } else {
        await disableBiometric();
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleCreatePin() {
    try {
      setBusy(true);

      if (pin.length !== 6 || confirmPin.length !== 6) {
        Alert.alert("PIN inválido", "O PIN deve ter 6 dígitos.");
        return;
      }

      if (pin !== confirmPin) {
        Alert.alert("PIN diferente", "A confirmação do PIN não confere.");
        return;
      }

      const result = await setupPin(pin);

      if (!result.ok) {
        Alert.alert("Não foi possível salvar", result.error || "Erro ao salvar PIN.");
        return;
      }

      setPin("");
      setConfirmPin("");

      Alert.alert("PIN ativado", "Seu PIN foi configurado com sucesso.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisablePin() {
    try {
      setBusy(true);
      await disablePin();
      setPin("");
      setConfirmPin("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>Voltar</Text>
          </Pressable>
        ) : <View />}

        <Text style={styles.title}>Segurança</Text>
        <View style={{ width: 52 }} />
      </View>

      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>
            Desbloquear com {getBiometryDisplayName(biometryType)}
          </Text>
          <Text style={styles.cardSubtitle}>
            Protege o acesso local ao app sem substituir sua sessão.
          </Text>
        </View>

        <Switch
          disabled={busy}
          value={biometricEnabled}
          onValueChange={handleBiometricToggle}
        />
      </View>

      <View style={[styles.card, { marginTop: 16 }]}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.cardTitle}>PIN de desbloqueio</Text>
            <Text style={styles.cardSubtitle}>
              Use um PIN local de 6 dígitos como fallback da biometria.
            </Text>
          </View>

          <Switch
            disabled={busy}
            value={pinEnabled}
            onValueChange={(value) => {
              if (!value) {
                handleDisablePin().catch(() => {});
              }
            }}
          />
        </View>

        {!pinEnabled ? (
          <View style={{ marginTop: 16 }}>
            <TextInput
              value={pin}
              onChangeText={(v) => setPin(v.replace(/\D/g, "").slice(0, 6))}
              placeholder="Novo PIN (6 dígitos)"
              placeholderTextColor="#7C7C89"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              style={styles.input}
            />

            <TextInput
              value={confirmPin}
              onChangeText={(v) => setConfirmPin(v.replace(/\D/g, "").slice(0, 6))}
              placeholder="Confirmar PIN"
              placeholderTextColor="#7C7C89"
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              style={styles.input}
            />

            <Pressable
              onPress={handleCreatePin}
              disabled={busy || pin.length !== 6 || confirmPin.length !== 6}
              style={({ pressed }) => [
                styles.primaryButton,
                (busy || pin.length !== 6 || confirmPin.length !== 6) &&
                  styles.primaryButtonDisabled,
                pressed && styles.primaryButtonPressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>Ativar PIN</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={handleDisablePin} disabled={busy} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Desativar PIN</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B0F",
    padding: 20,
  },
  header: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backBtn: {
    minWidth: 52,
  },
  backText: {
    color: "#D1D5DB",
    fontSize: 14,
    fontWeight: "600",
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#15151C",
    borderRadius: 14,
    padding: 16,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardSubtitle: {
    color: "#A8A8B3",
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    backgroundColor: "#0F0F14",
    borderWidth: 1,
    borderColor: "#262633",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: "#fff",
    fontSize: 16,
    marginBottom: 12,
    letterSpacing: 4,
  },
  primaryButton: {
    backgroundColor: "#1F6FEB",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonPressed: {
    opacity: 0.92,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2B2B36",
    alignItems: "center",
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "700",
  },
});