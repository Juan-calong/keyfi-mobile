import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';

import { Screen } from '../../ui/components/Screen';
import { Container } from '../../ui/components/Container';
import { Card } from '../../ui/components/Card';
import { Button } from '../../ui/components/Button';
import { AppBackButton } from '../../ui/components/AppBackButton';
import { t } from '../../ui/tokens';

import { api } from '../../core/api/client';
import { endpoints } from '../../core/api/endpoints';

import { IosAlert } from '../../ui/components/IosAlert';
import { friendlyError } from '../../core/errors/friendlyError';

function normalizeToken(v: string) {
  return String(v ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

export function OwnerApplyReferralScreen() {
  const nav = useNavigation<any>();
  const [token, setToken] = useState('');

  const [modal, setModal] = useState<null | {
    title: string;
    message: string;
    onClose?: () => void;
  }>(null);

  const cleanToken = useMemo(() => normalizeToken(token), [token]);

  const handleBack = () => {
    if (nav.canGoBack()) {
      nav.goBack();
    }
  };

  const mut = useMutation({
    mutationFn: async () => {
      if (!cleanToken) throw new Error('TOKEN_EMPTY');
      const res = await api.patch(endpoints.referrals.setSalonReferrerOnce, {
        referralToken: cleanToken,
      });

      return res.data;
    },
    onSuccess: () => {
      setModal({
        title: 'Pronto',
        message: 'Indicador definido com sucesso.',
        onClose: () => nav.goBack(),
      });
    },
    onError: (e: any) => {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        (e?.message === 'TOKEN_EMPTY' ? 'Informe um token.' : null);

      if (msg) {
        setModal({ title: 'Erro', message: String(msg) });
        return;
      }

      const fe = friendlyError(e);
      setModal({
        title: fe.title || 'Erro',
        message: fe.message || 'Não foi possível aplicar esse token.',
      });
    },
  });

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Container style={{ flex: 1 }}>
          <View
            style={{
              minHeight: 52,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <AppBackButton
              onPress={handleBack}
              showLabel={false}
              color={t.colors.text}
              iconSize={24}
              style={{ minWidth: 44, minHeight: 44, paddingRight: 0 }}
            />

            <Text
              numberOfLines={1}
              style={{ color: t.colors.text, fontWeight: '900', fontSize: 18 }}
            >
              Aplicar token
            </Text>

            <View style={{ width: 44 }} />
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
          >
            <View
              style={{
                flex: 1,
                width: '100%',
                maxWidth: 420,
                alignSelf: 'center',
                justifyContent: 'center',
                paddingVertical: 24,
              }}
            >
              <Card
                style={{
                  width: '100%',
                  backgroundColor: '#FFFFFF',
                  gap: 12,
                }}
              >
                <Text
                  style={{
                    color: t.colors.text,
                    fontWeight: '900',
                    fontSize: 22,
                  }}
                >
                  Aplicar token de indicador
                </Text>

                <Text
                  style={{
                    color: t.colors.text2,
                    fontWeight: '700',
                    fontSize: 13,
                    lineHeight: 18,
                  }}
                >
                  Cole o token do vendedor ou salão que vai receber a comissão
                  (isso é permanente).
                </Text>

                <TextInput
                  value={token}
                  onChangeText={setToken}
                  placeholder="EX: A1B2C3D4"
                  placeholderTextColor={t.colors.text2}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!mut.isPending}
                  returnKeyType="done"
                  onSubmitEditing={() =>
                    cleanToken && !mut.isPending && mut.mutate()
                  }
                  style={{
                    height: 48,
                    borderRadius: t.radius.md,
                    paddingHorizontal: 14,
                    borderWidth: 1,
                    borderColor: t.colors.border,
                    backgroundColor: t.colors.surface,
                    color: t.colors.text,
                    fontWeight: '900',
                    letterSpacing: 1,
                  }}
                />

                <Button
                  title={mut.isPending ? '...' : 'Aplicar token'}
                  variant="primary"
                  onPress={() => mut.mutate()}
                  disabled={!cleanToken || mut.isPending}
                  loading={mut.isPending}
                  style={{
                    width: '100%',
                    height: 48,
                    borderRadius: t.radius.md,
                  }}
                />
              </Card>
            </View>
          </ScrollView>
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
