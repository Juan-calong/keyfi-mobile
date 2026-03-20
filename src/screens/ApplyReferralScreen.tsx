import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Alert, Pressable, Keyboard, TouchableWithoutFeedback } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";

import { Screen } from "../ui/components/Screen";
import { Container } from "../ui/components/Container";
import { Button } from "../ui/components/Button";
import { t } from "../ui/tokens";
import { api } from "../core/api/client";

function normalizeToken(v: string) {
  return String(v ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function ApplyReferralScreen() {
  const nav = useNavigation<any>();
  const [token, setToken] = useState("");

  const cleanToken = useMemo(() => normalizeToken(token), [token]);

  const applyMut = useMutation({
    mutationFn: async () => {
      if (!cleanToken) throw new Error("TOKEN_EMPTY");

      // ✅ ROTA DO SEU BACKEND (pelo router/controller que você colou):
      // PATCH /seller/referrer  body: { referralToken }
      const res = await api.patch("/seller/referrer", { referralToken: cleanToken });
      return res.data;
    },
    onSuccess: () => {
      setToken("");
      Alert.alert("Pronto ✅", "Indicador definido com sucesso (isso é permanente).");
      nav.goBack();
    },
    onError: (e: any) => {
      const status = e?.response?.status;
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        (e?.message === "TOKEN_EMPTY" ? "Informe um token." : null) ||
        "Não foi possível aplicar esse token.";

      if (status === 409) {
        Alert.alert("Travado (permanente)", String(msg));
      } else {
        Alert.alert("Erro", String(msg));
      }
    },
  });

  return (
    <Screen>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <Container style={{ flex: 1 }}>
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 16 }}>
            <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 22 }}>
              Aplicar token de indicador
            </Text>

            <View style={{ height: 8 }} />

            <Text
              style={{
                color: t.colors.text2,
                fontWeight: "800",
                fontSize: 12,
                textAlign: "center",
                maxWidth: 420,
                lineHeight: 16,
              }}
            >
              Cole o token do vendedor ou salão que vai receber a comissão. Isso só pode ser feito uma vez.
            </Text>

            <View style={{ height: 14 }} />

            <View
              style={{
                width: "100%",
                maxWidth: 420,
                borderWidth: 1,
                borderColor: t.colors.border,
                backgroundColor: t.colors.surface,
                borderRadius: 14,
                paddingVertical: 16,
                paddingHorizontal: 14,
              }}
            >
              <Text style={{ color: t.colors.text2, fontWeight: "800", fontSize: 12 }}>
                TOKEN
              </Text>

              <TextInput
                value={token}
                onChangeText={setToken}
                placeholder="EX: A1B2C3D4"
                placeholderTextColor={t.colors.text2}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={() => applyMut.mutate()}
                style={{
                  marginTop: 10,
                  height: 54, // ✅ grande (fica óbvio onde clicar)
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  borderWidth: 1,
                  borderColor: t.colors.border,
                  backgroundColor: t.colors.bg,
                  color: t.colors.text,
                  fontWeight: "900",
                  letterSpacing: 1,
                }}
              />

              <Text style={{ marginTop: 10, color: t.colors.text2, fontWeight: "800", fontSize: 12 }}>
                {cleanToken ? `Será aplicado: ${cleanToken}` : "Digite o token acima"}
              </Text>

              <View style={{ height: 12 }} />

              <Button
                title={applyMut.isPending ? "Aplicando..." : "Aplicar token"}
                onPress={() => applyMut.mutate()}
                loading={applyMut.isPending}
                disabled={!cleanToken || applyMut.isPending}
                variant="primary"
                style={{ height: 48, borderRadius: 14 }}
              />

              <View style={{ height: 10 }} />

              <Pressable
                onPress={() => nav.goBack()}
                hitSlop={10}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: t.colors.border,
                  backgroundColor: t.colors.bg,
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                }}
              >
                <Text style={{ color: t.colors.text, fontWeight: "900" }}>
                  Voltar
                </Text>
              </Pressable>
            </View>
          </View>
        </Container>
      </TouchableWithoutFeedback>
    </Screen>
  );
}
