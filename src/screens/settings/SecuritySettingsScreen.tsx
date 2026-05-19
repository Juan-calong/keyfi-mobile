import React, { useState } from "react";
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  View,
  Pressable,
} from 'react-native';
import { useSecurityStore } from '../../stores/security.store';
import { getBiometryDisplayName } from '../../core/security/biometric';

type Props = {
  onBack?: () => void;
};

export function SecuritySettingsScreen({ onBack }: Props) {
  const [busy, setBusy] = useState(false);
  const biometricAvailable = useSecurityStore(s => s.biometricAvailable);
  const biometryType = useSecurityStore(s => s.biometryType);
  const biometricEnabled = useSecurityStore(s => s.biometricEnabled);

  const enableBiometric = useSecurityStore(s => s.enableBiometric);
  const disableBiometric = useSecurityStore(s => s.disableBiometric);

  async function handleBiometricToggle(value: boolean) {
    try {
      setBusy(true);

      if (value) {
        if (!biometricAvailable) {
          Alert.alert(
            'Biometria indisponível',
            'Este aparelho não está pronto para usar biometria no app.',
          );
          return;
        }

        const ok = await enableBiometric();

        if (!ok) {
          Alert.alert(
            'Não foi possível ativar',
            'A autenticação biométrica foi cancelada ou falhou.',
          );
        }
      } else {
        await disableBiometric();
      }
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
        ) : (
          <View />
        )}
        

        <Text style={styles.title}>Segurança</Text>
        <View style={styles.navSide} />
      </View>

      <View style={styles.card}>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>
            Desbloquear com {getBiometryDisplayName(biometryType)}
          </Text>
          <Text style={styles.cardSubtitle}>
            Protege o acesso local ao app usando apenas a biometria do aparelho.
          </Text>
        </View>

        <Switch
          disabled={busy}
          value={biometricEnabled}
          onValueChange={handleBiometricToggle}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0F',
    padding: 20,
  },
  header: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
    navSide: {
    width: 52,
  },
  backBtn: {
    width: 52,
    height: 36,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backText: {
    color: '#6EE7F9',
    fontSize: 16,
    fontWeight: '700',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#15151C',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  cardSubtitle: {
    color: '#A1A1AA',
    fontSize: 13,
    lineHeight: 18,
  },
 });