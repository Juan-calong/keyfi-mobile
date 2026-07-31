import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';

import { api } from '../../core/api/client';
import { apiErrorMessage } from '../../core/api/client';
import { endpoints } from '../../core/api/endpoints';

import { Screen } from '../../ui/components/Screen';
import { Container } from '../../ui/components/Container';
import { Card } from '../../ui/components/Card';
import { Button } from '../../ui/components/Button';
import { AppBackButton } from '../../ui/components/AppBackButton';
import { t } from '../../ui/tokens';

import { IosAlert } from '../../ui/components/IosAlert';

export function SellerApplyReferralTokenScreen() {
  const nav = useNavigation<any>();
  const qc = useQueryClient();
  const [token, setToken] = useState('');

  const [modal, setModal] = useState<null | { title: string; message: string }>(
    null,
  );

  const cleaned = useMemo(() => token.trim().toUpperCase(), [token]);
  const canSubmit = !!cleaned;

  const handleBack = () => {
    if (nav.canGoBack()) {
      nav.goBack();
    }
  };

  const applyMut = useMutation({
    mutationFn: async () => {
      if (!cleaned) throw new Error('Informe o token');
      const res = await api.patch(endpoints.referrals.setSalonReferrerOnce, {
        referralToken: cleaned,
      });
      return res.data;
    },
    onSuccess: () => {
      setToken('');
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['seller-profile'] });
      qc.invalidateQueries({ queryKey: ['referrals'] });
      setModal({ title: 'Sucesso', message: 'Token aplicado!' });
    },
    onError: (e: any) => {
      setModal({
        title: 'Não foi possível aplicar o token',
        message: apiErrorMessage(e),
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
                style={{ width: '100%', backgroundColor: '#FFFFFF', gap: 12 }}
              >
                <Text
                  style={{
                    color: t.colors.text,
                    fontWeight: '900',
                    fontSize: 22,
                  }}
                >
                  Aplicar token
                </Text>
                <Text
                  style={{
                    color: t.colors.text2,
                    fontWeight: '700',
                    fontSize: 13,
                    lineHeight: 18,
                  }}
                >
                  Informe o token do salão que vai receber a comissão.
                </Text>
                <TextInput
                  value={token}
                  onChangeText={setToken}
                  placeholder="Cole o token aqui"
                  placeholderTextColor={t.colors.text2}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!applyMut.isPending}
                  returnKeyType="done"
                  onSubmitEditing={() =>
                    canSubmit && !applyMut.isPending && applyMut.mutate()
                  }
                  style={{
                    height: 48,
                    borderWidth: 1,
                    borderColor: t.colors.border,
                    borderRadius: t.radius.md,
                    paddingHorizontal: 12,
                    backgroundColor: t.colors.surface,
                    color: t.colors.text,
                  }}
                />
                <Button
                  title={applyMut.isPending ? 'Aplicando...' : 'Aplicar'}
                  onPress={() => applyMut.mutate()}
                  loading={applyMut.isPending}
                  disabled={!canSubmit || applyMut.isPending}
                  style={{ width: '100%' }}
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
        onClose={() => setModal(null)}
      />
    </Screen>
  );
}
