import React, { useMemo, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useRoute } from "@react-navigation/native";
import Clipboard from "@react-native-clipboard/clipboard";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { t } from "../../ui/tokens";

import { IosAlert } from "../../ui/components/IosAlert";

export function OwnerSalonTokenScreen() {
  const route = useRoute<any>();
  const token: string = route?.params?.token ?? "";

  const [copied, setCopied] = useState(false);
  const [modal, setModal] = useState<null | { title: string; message: string }>(null);

  const tokenLabel = useMemo(() => (token?.trim() ? token : "—"), [token]);

  function handleCopy() {
    try {
      Clipboard.setString(tokenLabel === "—" ? "" : tokenLabel);
      setCopied(true);
      setModal({ title: "Copiado!", message: "Token copiado para a área de transferência." });
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setModal({ title: "Erro", message: "Não foi possível copiar." });
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
          <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 22 }}>Token do salão</Text>

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
            <Text style={{ color: t.colors.text2, fontWeight: "800", fontSize: 12 }}>SEU TOKEN</Text>

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
              onPress={handleCopy}
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
              <Text style={{ color: t.colors.text, fontWeight: "900" }}>{copied ? "Copiado ✓" : "Copiar"}</Text>
            </Pressable>
          </View>
        </View>
      </Container>

      <IosAlert visible={!!modal} title={modal?.title} message={modal?.message} onClose={() => setModal(null)} />
    </Screen>
  );
}