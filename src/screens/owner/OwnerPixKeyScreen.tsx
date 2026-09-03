// src/screens/owner/OwnerPixKeyScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
  StatusBar,
  StyleSheet,
  KeyboardAvoidingView,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';

import { Screen } from '../../ui/components/Screen';
import { Container } from '../../ui/components/Container';
import { Loading, ErrorState } from '../../ui/components/State';

import { api } from '../../core/api/client';
import { endpoints } from '../../core/api/endpoints';

import { IosAlert } from '../../ui/components/IosAlert';
import { friendlyError } from '../../core/errors/friendlyError';
import { AppBackButton } from '../../ui/components/AppBackButton';
import { createIdempotencyKey } from '../../core/api/idempotency';
import { PIX_KEY_TYPES, type LegacyPixKeyType, type PixKeyType } from '../../features/components/seller-profile/sellerProfile.types';
import { formatHydratedPixKeyForDisplay, formatPixKeyForDisplay, getPixKeyboardType, getPixPlaceholder, normalizePixKeyForSubmit, onlyDigits, pixKeyTypeFromLegacy, validatePixKeyForUx } from '../../features/components/seller-profile/sellerProfile.utils';

type DestinationDTO = {
  id: string;
  walletId: string;
  pixKey: string;
  pixKeyType: LegacyPixKeyType;
  holderName?: string | null;
  holderDoc?: string | null;
  bankName?: string | null;
  notes?: string | null;
  pixKeyChangedAt?: string | null;
  payoutBlockedUntil?: string | null;
};

function pickDestinationFromWalletRoot(root: any): DestinationDTO | null {
  return (root?.destination || root?.wallet?.destination || null) as any;
}

function Chip({
  label,
  active,
  onPress,
  disabled,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        m.chip,
        active && m.chipActive,
        pressed && { opacity: 0.9 },
        disabled && { opacity: 0.6 },
      ]}
    >
      <Text style={[m.chipText, active && m.chipTextActive]}>
        {active ? '✓ ' : ''}
        {label}
      </Text>
    </Pressable>
  );
}

export function OwnerPixKeyScreen() {
  const nav = useNavigation<any>();
  const qc = useQueryClient();

  const [modal, setModal] = useState<null | {
    title: string;
    message: string;
    onClose?: () => void;
  }>(null);

  const walletQ = useQuery<any>({
    queryKey: ['wallet-owner'],
    queryFn: async () =>
      (
        await api.get(endpoints.wallet.me, {
          params: { txLimit: 1, payoutLimit: 1 },
        })
      ).data,
    retry: false,
    staleTime: 0,
  });

  const destination = useMemo(
    () => pickDestinationFromWalletRoot(walletQ.data),
    [walletQ.data],
  );

  const [pixKeyType, setPixKeyType] = useState<PixKeyType>('CPF');
  const [pixKey, setPixKey] = useState('');
  const [holderName, setHolderName] = useState('');
  const [holderDoc, setHolderDoc] = useState('');
  const [bankName, setBankName] = useState('');
  const [notes, setNotes] = useState('');
  const [pixKeyTypeUnsupported, setPixKeyTypeUnsupported] = useState(false);

  useEffect(() => {
    if (!destination) return;
    const type = pixKeyTypeFromLegacy(destination.pixKeyType);
    setPixKeyType(type ?? 'CPF');
    setPixKeyTypeUnsupported(!type);
    setPixKey(formatHydratedPixKeyForDisplay(destination.pixKeyType, destination.pixKey));
    setHolderName(destination.holderName ?? '');
    setHolderDoc(destination.holderDoc ?? '');
    setBankName(destination.bankName ?? '');
    setNotes(destination.notes ?? '');
  }, [destination]);

  const normalizedPixKey = useMemo(
    () => normalizePixKeyForSubmit(pixKeyType, pixKey),
    [pixKeyType, pixKey],
  );

  const savePixMut = useMutation({
    mutationFn: async () => {
      if (pixKeyTypeUnsupported) throw new Error('Escolha um tipo de chave PIX suportado.');
      const err = validatePixKeyForUx(pixKeyType, pixKey);
      if (err) throw new Error(err);

      const payload = {
        pixKeyType,
        pixKey: normalizedPixKey,
        holderName: String(holderName ?? '').trim(),
        holderDoc: onlyDigits(holderDoc ?? ''),
        bankName: String(bankName ?? '').trim(),
        notes: String(notes ?? '').trim() || null,
      };

      if (!payload.holderName) throw new Error('Informe o nome do titular.');
      if (!payload.holderDoc)
        throw new Error('Informe o CPF/CNPJ do titular (somente números).');
      if (!payload.bankName) throw new Error('Informe o banco.');

      const idem = createIdempotencyKey('wallet-dest-owner');
      const res = await api.post(endpoints.wallet.destination, payload, {
        headers: { 'Idempotency-Key': idem, 'X-Idempotency-Key': idem },
      });

      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallet-owner'] });
      qc.invalidateQueries({ queryKey: ['wallet', 'me'] });
      setModal({
        title: 'Salvo',
        message: 'Seu PIX foi atualizado.',
        onClose: () => nav.goBack(),
      });
    },
    onError: (e: any) => {
      const msg =
        e?.response?.data?.error || e?.response?.data?.message || e?.message;
      if (msg) {
        setModal({ title: 'Erro', message: String(msg) });
        return;
      }
      const fe = friendlyError(e);
      setModal({
        title: fe.title || 'Erro',
        message: fe.message || 'Falha ao salvar PIX.',
      });
    },
  });

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Container style={{ flex: 1, paddingTop: 6 }}>
          {Platform.OS === 'android' ? (
            <View style={{ height: StatusBar.currentHeight ?? 0 }} />
          ) : null}

          <View style={m.nav}>
            <View style={m.navSide}>
              <AppBackButton
                onPress={() => nav.goBack()}
                showLabel={false}
                color="#000000"
                iconSize={24}
                style={m.backBtn}
              />
            </View>

            <Text style={m.navTitle}>PIX</Text>

            <Pressable
              hitSlop={12}
              onPress={() => walletQ.refetch()}
              style={m.rightBtn}
            >
              <Text style={m.rightText}>
                {walletQ.isRefetching ? '…' : '⟳'}
              </Text>
            </Pressable>
          </View>

          <View style={m.hairline} />

          {walletQ.isLoading ? (
            <View style={{ marginTop: 14 }}>
              <Loading />
            </View>
          ) : walletQ.isError ? (
            <View style={{ marginTop: 14 }}>
              <ErrorState onRetry={() => walletQ.refetch()} />
            </View>
          ) : (
            <>
              <ScrollView
                style={{ flex: 1 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={m.scroll}
              >
                <Text style={m.sectionTitle}>Recebimento (PIX)</Text>
                <Text style={m.sub}>
                  Atual:{' '}
                  {destination?.pixKey
                    ? String(destination.pixKey)
                    : 'não cadastrado'}
                </Text>

                <View style={[m.hairline, { marginVertical: 18 }]} />

                <Text style={m.label}>Tipo de chave</Text>
                <View style={m.chipsRow}>
                  {PIX_KEY_TYPES.map(tp => (
                    <Chip
                      key={tp}
                      label={{ CPF: 'CPF', CNPJ: 'CNPJ', EMAIL: 'E-mail', PHONE: 'Telefone', RANDOM: 'Chave aleatória' }[tp]}
                      active={pixKeyType === tp}
                      onPress={() => { setPixKeyType(tp); setPixKey(''); setPixKeyTypeUnsupported(false); }}
                      disabled={savePixMut.isPending}
                    />
                  ))}
                </View>

                <View style={{ height: 14 }} />

                <Text style={m.label}>Chave PIX</Text>
                <TextInput
                  value={pixKey}
                  onChangeText={value => setPixKey(formatPixKeyForDisplay(pixKeyType, value))}
                  placeholder={getPixPlaceholder(pixKeyType)}
                  placeholderTextColor={'rgba(0,0,0,0.35)'}
                  keyboardType={getPixKeyboardType(pixKeyType)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={m.input}
                  testID="owner-pix-key-input"
                  accessibilityLabel="Chave PIX"
                />
                {pixKeyTypeUnsupported ? <Text style={m.sub}>O tipo de chave salvo não é suportado. Escolha um tipo para continuar.</Text> : null}

                <Text style={[m.label, { marginTop: 14 }]}>
                  Nome do titular
                </Text>
                <TextInput
                  value={holderName}
                  onChangeText={setHolderName}
                  placeholder="Ex: Nome do titular"
                  placeholderTextColor={'rgba(0,0,0,0.35)'}
                  autoCorrect={false}
                  style={m.input}
                />

                <Text style={[m.label, { marginTop: 14 }]}>
                  CPF/CNPJ do titular
                </Text>
                <TextInput
                  value={holderDoc}
                  onChangeText={setHolderDoc}
                  placeholder="Somente números"
                  placeholderTextColor={'rgba(0,0,0,0.35)'}
                  keyboardType="numeric"
                  autoCorrect={false}
                  style={m.input}
                />

                <Text style={[m.label, { marginTop: 14 }]}>Banco</Text>
                <TextInput
                  value={bankName}
                  onChangeText={setBankName}
                  placeholder="Ex: Inter"
                  placeholderTextColor={'rgba(0,0,0,0.35)'}
                  autoCorrect={false}
                  style={m.input}
                />

                <Text style={[m.label, { marginTop: 14 }]}>
                  Observações (opcional)
                </Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Opcional"
                  placeholderTextColor={'rgba(0,0,0,0.35)'}
                  multiline
                  autoCorrect={false}
                  style={[m.input, { minHeight: 88, paddingVertical: 12 }]}
                />

                <View style={{ height: 120 }} />
              </ScrollView>

              <View style={m.ctaWrap}>
                <View style={m.hairline} />
                <Text style={m.secure}>Pagamento seguro</Text>

                <Pressable
                  onPress={() => savePixMut.mutate()}
                  disabled={savePixMut.isPending || pixKeyTypeUnsupported}
                  style={({ pressed }) => [
                    m.btn,
                    pressed && { opacity: 0.85 },
                    savePixMut.isPending && { opacity: 0.6 },
                  ]}
                >
                  <Text style={m.btnText}>
                    {savePixMut.isPending ? '...' : 'Salvar PIX'}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </Container>
      </KeyboardAvoidingView>

      <IosAlert
        visible={!!modal}
        title={modal?.title}
        message={modal?.message}
        onClose={() => {
          const cb = modal?.onClose;
          setModal(null);
          cb?.();
        }}
      />
    </Screen>
  );
}

const HPAD = 20;

const m = StyleSheet.create({
  nav: {
    height: 52,
    paddingHorizontal: HPAD,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navSide: {
    minWidth: 64,
    height: 44,
    justifyContent: 'center',
  },

  backBtn: {
    minWidth: 44,
    minHeight: 44,
    paddingRight: 0,
  },
  navTitle: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  rightBtn: {
    minWidth: 64,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  rightText: { color: '#000000', fontSize: 16, fontWeight: '900' },

  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.18)',
    width: '100%',
  },

  scroll: {
    flexGrow: 1,
    paddingTop: 16,
    paddingHorizontal: HPAD,
    paddingBottom: 160,
  },

  sectionTitle: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  sub: {
    marginTop: 6,
    color: '#000000',
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.75,
    lineHeight: 16,
  },

  label: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    opacity: 0.72,
    letterSpacing: 0.2,
  },

  chipsRow: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.25)',
    backgroundColor: '#FFFFFF',
  },
  chipActive: { borderColor: '#000000', backgroundColor: '#000000' },
  chipText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    opacity: 0.85,
  },
  chipTextActive: { color: '#FFFFFF', opacity: 1 },

  input: {
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.35)',
    borderRadius: 14,
    paddingHorizontal: 14,
    color: '#000000',
    backgroundColor: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 10,
  },

  ctaWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: HPAD,
    paddingBottom: Platform.OS === 'ios' ? 18 : 14,
    paddingTop: 10,
  },
  secure: {
    textAlign: 'center',
    color: '#000000',
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.75,
    marginTop: 10,
    marginBottom: 10,
  },

  btn: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
});
