import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, Share } from "react-native";
import { useRoute } from "@react-navigation/native";
import Clipboard from "@react-native-clipboard/clipboard";
import { useQuery } from "@tanstack/react-query";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { t } from "../../ui/tokens";
import { IosAlert } from "../../ui/components/IosAlert";

import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";

export function OwnerSalonTokenScreen() {
  const route = useRoute<any>();
  const token: string = route?.params?.token ?? "";

  const [copied, setCopied] = useState(false);
  const [modal, setModal] = useState<null | { title: string; message: string }>(null);

  const tokenLabel = useMemo(() => (token?.trim() ? token : "—"), [token]);

  const inviteQ = useQuery({
    queryKey: ["salon", "invite-link"],
    queryFn: async () => (await api.get(endpoints.salon.inviteLink)).data,
    retry: false,
  });

  const inviteUrl = String(inviteQ.data?.url ?? "").trim();

  useEffect(() => {
    if (inviteQ.isError) {
      setModal({
        title: "Erro",
        message:
          (inviteQ.error as any)?.response?.data?.error ||
          "Não foi possível carregar o link do salão.",
      });
    }
  }, [inviteQ.isError, inviteQ.error]);

  function handleCopyToken() {
    try {
      Clipboard.setString(tokenLabel === "—" ? "" : tokenLabel);
      setCopied(true);
      setModal({ title: "Copiado!", message: "Token copiado para a área de transferência." });
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setModal({ title: "Erro", message: "Não foi possível copiar o token." });
    }
  }

  function handleCopyLink() {
    try {
      if (!inviteUrl) {
        setModal({ title: "Sem link", message: "O link do salão ainda não foi carregado." });
        return;
      }

      Clipboard.setString(inviteUrl);
      setModal({ title: "Copiado!", message: "Link copiado para a área de transferência." });
    } catch {
      setModal({ title: "Erro", message: "Não foi possível copiar o link." });
    }
  }

  async function handleShareLink() {
    try {
      if (!inviteUrl) {
        setModal({ title: "Sem link", message: "O link do salão ainda não foi carregado." });
        return;
      }

      await Share.share({
        message: inviteUrl,
      });
    } catch {
      setModal({ title: "Erro", message: "Não foi possível compartilhar o link." });
    }
  }

  return (
    <Screen>
      <Container style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 16,
          }}
        >
          <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 22 }}>
            Token e link do salão
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
              paddingVertical: 18,
              paddingHorizontal: 16,
              alignItems: "center",
            }}
          >
            <Text style={{ color: t.colors.text2, fontWeight: "800", fontSize: 12 }}>
              SEU TOKEN
            </Text>

            <Text
              style={{
                marginTop: 10,
                color: t.colors.text,
                fontWeight: "900",
                fontSize: 18,
                letterSpacing: 0.6,
                textAlign: "center",
              }}
            >
              {tokenLabel}
            </Text>

            <View style={{ height: 14 }} />

            <Pressable
              onPress={handleCopyToken}
              style={({ pressed }) => [
                {
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: t.colors.border,
                  backgroundColor: t.colors.bg,
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                },
                pressed && { opacity: 0.85 },
              ]}
              hitSlop={10}
            >
              <Text style={{ color: t.colors.text, fontWeight: "900" }}>
                {copied ? "Copiado ✓" : "Copiar token"}
              </Text>
            </Pressable>

            <View style={{ height: 18 }} />

            <Text style={{ color: t.colors.text2, fontWeight: "800", fontSize: 12 }}>
              LINK DO CONVITE
            </Text>

            <Text
              selectable
              style={{
                marginTop: 10,
                color: t.colors.text,
                fontWeight: "700",
                fontSize: 14,
                textAlign: "center",
              }}
            >
              {inviteQ.isLoading ? "Carregando link..." : inviteUrl || "Link não disponível."}
            </Text>

            <View style={{ height: 14 }} />

            <Pressable
              onPress={handleCopyLink}
              style={({ pressed }) => [
                {
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: t.colors.border,
                  backgroundColor: t.colors.bg,
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                },
                pressed && { opacity: 0.85 },
              ]}
              hitSlop={10}
            >
              <Text style={{ color: t.colors.text, fontWeight: "900" }}>Copiar link</Text>
            </Pressable>

            <View style={{ height: 10 }} />

            <Pressable
              onPress={handleShareLink}
              style={({ pressed }) => [
                {
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: t.colors.border,
                  backgroundColor: t.colors.bg,
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                },
                pressed && { opacity: 0.85 },
              ]}
              hitSlop={10}
            >
              <Text style={{ color: t.colors.text, fontWeight: "900" }}>Compartilhar link</Text>
            </Pressable>

            <View style={{ height: 10 }} />

            <Pressable
              onPress={() => inviteQ.refetch()}
              style={({ pressed }) => [
                {
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: t.colors.border,
                  backgroundColor: t.colors.bg,
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                },
                pressed && { opacity: 0.85 },
              ]}
              hitSlop={10}
            >
              <Text style={{ color: t.colors.text, fontWeight: "900" }}>Atualizar</Text>
            </Pressable>
          </View>
        </View>
      </Container>

      <IosAlert
        visible={!!modal}
        title={modal?.title}
        message={modal?.message}
        onClose={() => setModal(null)}
      />
    </Screen>
  );
}