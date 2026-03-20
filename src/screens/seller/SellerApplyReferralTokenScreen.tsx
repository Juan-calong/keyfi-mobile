// screens/seller/SellerApplyReferralTokenScreen.tsx
import React, { useMemo, useState } from "react";
import { View, Text, TextInput } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";
import { apiErrorMessage } from "../../core/api/client"; // ✅ padrão (mesmo helper)

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { Card } from "../../ui/components/Card";
import { Button } from "../../ui/components/Button";
import { t } from "../../ui/tokens";

import { IosAlert } from "../../ui/components/IosAlert";

export function SellerApplyReferralTokenScreen() {
  const qc = useQueryClient();
  const [token, setToken] = useState("");

  const [modal, setModal] = useState<null | { title: string; message: string }>(null);

  const cleaned = useMemo(() => token.trim().toUpperCase(), [token]);
  const canSubmit = !!cleaned;

  const applyMut = useMutation({
    mutationFn: async () => {
      if (!cleaned) throw new Error("Informe o token");
      const res = await api.patch(endpoints.referrals.setSalonReferrerOnce, { referralToken: cleaned });
      return res.data;
    },
    onSuccess: () => {
      setToken("");

      // ✅ evite invalidar tudo
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["seller-profile"] });
      qc.invalidateQueries({ queryKey: ["referrals"] });

      setModal({ title: "Sucesso", message: "Token aplicado!" });
    },
    onError: (e: any) => {
      setModal({ title: "Não foi possível aplicar o token", message: apiErrorMessage(e) });
    },
  });

  return (
    <Screen>
      <Container style={{ flex: 1 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: t.colors.text }}>Aplicar token</Text>

        <View style={{ marginTop: 12 }}>
          <Card style={{ padding: 12 }}>
            <Text style={{ marginBottom: 8, opacity: 0.8, color: t.colors.text2 }}>Token</Text>

            <TextInput
              value={token}
              onChangeText={setToken}
              placeholder="Cole o token aqui"
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!applyMut.isPending}
              style={{
                borderWidth: 1,
                borderColor: t.colors.border,
                borderRadius: t.radius.md,
                paddingHorizontal: 12,
                paddingVertical: 10,
                backgroundColor: t.colors.surface,
                color: t.colors.text,
                opacity: applyMut.isPending ? 0.7 : 1,
              }}
              returnKeyType="done"
              onSubmitEditing={() => (canSubmit && !applyMut.isPending ? applyMut.mutate() : null)}
            />

            <View style={{ marginTop: 12 }}>
              <Button
                title={applyMut.isPending ? "Aplicando…" : "Aplicar"}
                onPress={() => applyMut.mutate()}
                loading={applyMut.isPending}
                disabled={!canSubmit || applyMut.isPending}
              />
            </View>
          </Card>
        </View>
      </Container>

      <IosAlert visible={!!modal} title={modal?.title} message={modal?.message} onClose={() => setModal(null)} />
    </Screen>
  );
}