import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Alert, Pressable, Keyboard, TouchableWithoutFeedback } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";

import { Screen } from "../ui/components/Screen";
import { Container } from "../ui/components/Container";
import { Button } from "../ui/components/Button";
import { t } from "../ui/tokens";
import { api } from "../core/api/client";
import { endpoints } from "../core/api/endpoints";
import { AppBackButton } from "../ui/components/AppBackButton";

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

    const res = await api.post(endpoints.referrals.applyInviteForCurrentUser, {
      linkType: "SELLER_INVITE",
      sellerReferralToken: cleanToken,
    });

    console.log("[APPLY_REFERRAL][RES]", res.data);
    return res.data;
  },

  onSuccess: (data: any) => {
    if (data?.ok && data?.applied) {
      setToken("");
      Alert.alert("Pronto ✅", "Token aplicado com sucesso.");
      nav.goBack();
      return;
    }

    const reason = data?.reason;

    let msg = "Não foi possível aplicar esse token.";

    if (reason === "SELLER_NOT_FOUND") {
      msg = "Token de vendedor não encontrado. Confira se você digitou o código correto.";
    } else if (reason === "SALON_NOT_FOUND") {
      msg = "Token de salão não encontrado.";
    } else if (reason === "SELF_REFERRAL_BLOCKED") {
      msg = "Você não pode aplicar o seu próprio token.";
    } else if (reason === "USER_NOT_FOUND") {
      msg = "Usuário não encontrado.";
    } else if (data?.message) {
      msg = String(data.message);
    } else if (data?.error) {
      msg = String(data.error);
    }

    Alert.alert("Erro", msg);
  },

  onError: (e: any) => {
    const status = e?.response?.status;
    const reason = e?.response?.data?.reason;

    let msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      (e?.message === "TOKEN_EMPTY" ? "Informe um token." : null) ||
      "Não foi possível aplicar esse token.";

    if (reason === "ALREADY_LINKED_SAME_REFERRER") {
      msg = "Esse vínculo já está aplicado.";
    } else if (reason === "ALREADY_LINKED_DIFFERENT_REFERRER") {
      msg = "Já existe um indicador definido e ele não pode ser alterado.";
    } else if (reason === "SALON_OWNERSHIP_REQUIRED") {
      msg = "Você não pode aplicar referral em um salão que não pertence a você.";
    } else if (reason === "INVALID_PAYLOAD") {
      msg = e?.response?.data?.error || "Dados inválidos para aplicar o token.";
    } else if (reason === "INTERNAL_ERROR") {
      msg = "Erro interno ao aplicar referral. Tente novamente.";
    }

    if (status === 409) {
      Alert.alert("Vínculo já definido", String(msg));
      return;
    }

    if (status === 403) {
      Alert.alert("Acesso negado", String(msg));
      return;
    }

    if (status === 400) {
      Alert.alert("Dados inválidos", String(msg));
      return;
    }

    Alert.alert("Erro", String(msg));
  },
});

  return (
    <Screen>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <Container style={{ flex: 1 }}>
<View style={{ paddingTop: 12, paddingHorizontal: 8 }}>
  <AppBackButton
    onPress={() => nav.goBack()}
    showLabel={false}
    color={t.colors.text}
    iconSize={24}
    style={{
      minWidth: 40,
      minHeight: 40,
      paddingRight: 0,
    }}
  />
</View>
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 28, marginTop: -40 }}>
            <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 28, textAlign: "center" }}>
              Aplicar token
            </Text>

            <View style={{ height: 8 }} />

            <Text
              style={{
    color: t.colors.text2,
    fontWeight: "700",
    fontSize: 12,
    textAlign: "center",
    maxWidth: 320,
    lineHeight: 18,
              }}
            >
              Cole o token do vendedor ou salão aqui. Isso só pode ser feito uma vez.
            </Text>

            <View style={{ height: 14 }} />

            <View
style={{
  width: "100%",
  maxWidth: 340,
  backgroundColor: "transparent",
  borderRadius: 18,
  paddingVertical: 8,
  paddingHorizontal: 0,
}}
            >
              <TextInput
              
                value={token}
                onChangeText={(text) => {
  const clean = text.toUpperCase().replace(/\s+/g, "").slice(0, 8);
  setToken(clean);
}}
                placeholder="Digite o token"
                
                maxLength={8}
                placeholderTextColor={t.colors.text2}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={() => applyMut.mutate()}
                style={{
  marginTop: 4,
  height: 52,
  borderRadius: 12,
  paddingHorizontal: 14,
  borderWidth: 1,
  borderColor: t.colors.border,
  backgroundColor: "#FFFFFF",
  color: t.colors.text,
  fontWeight: "800",
  letterSpacing: 0.8,
                }}
              />
              <View style={{ height: 50 }} />

              <Button
                title={applyMut.isPending ? "Aplicando..." : "Aplicar token"}
                onPress={() => applyMut.mutate()}
                loading={applyMut.isPending}
                disabled={cleanToken.length !== 8 || applyMut.isPending}
                variant="primary"
                style={{ height: 46, borderRadius: 14 }}
              />

              <View style={{ height: 10 }} />
            </View>
          </View>
        </Container>
      </TouchableWithoutFeedback>
    </Screen>
  );
}
