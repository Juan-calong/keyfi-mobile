import React from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Clipboard from "@react-native-clipboard/clipboard";

import { Card } from "../../../../ui/components/Card";
import { t } from "../../../../ui/tokens";
import type { ModalState } from "../sellerProfile.types";
import { iosTop, link, s } from "../sellerProfile.styles";
import { TopBarIOS } from "./TopBarIOS";

type Props = {
  salonId: string;
  setSalonId: (v: string) => void;
  requestPermPending: boolean;
  onRequestPermission: () => void;
  onBack: () => void;
  setModal: (v: ModalState) => void;
};

export function LinkSalonView({
  salonId,
  setSalonId,
  requestPermPending,
  onRequestPermission,
  onBack,
  setModal,
}: Props) {
  const pasteFromClipboard = async () => {
    try {
      const text = await Clipboard.getString();
      const v = String(text ?? "").trim();

      if (!v) {
        setModal({ title: "Clipboard vazio", message: "Copie o código do salão e tente novamente." });
        return;
      }

      setSalonId(v);
    } catch {
      setModal({ title: "Erro", message: "Não consegui acessar o clipboard." });
    }
  };

  const canSubmit = String(salonId || "").trim().length > 0;

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40, paddingTop: 18 }}>
      <TopBarIOS title="Vincular salão" onBack={onBack} />
      <View style={iosTop.hairline} />

      <View style={{ height: 14 }} />

      <Card style={{ gap: 12, backgroundColor: "#FFFFFF" }}>
        <Text style={s.cardTitle}>Conectar a um salão</Text>

        <Text style={s.hint}>
          Cole o <Text style={{ fontWeight: "900", color: t.colors.text }}>código do salão</Text> (UUID) e toque em{" "}
          <Text style={{ fontWeight: "900", color: t.colors.text }}>Pedir acesso</Text>.
        </Text>

        <View style={{ gap: 6 }}>
          <Text style={[s.label, { opacity: 0.75 }]}>Código do salão</Text>

          <TextInput
            value={salonId}
            onChangeText={setSalonId}
            placeholder="Cole aqui (ex: 484f7543-129a-4284-81e5-a20d34aa0498)"
            placeholderTextColor={"rgba(0,0,0,0.35)"}
            style={link.input}
            autoCapitalize="none"
            autoCorrect={false}
            selectionColor={"rgba(0,0,0,0.35)"}
          />

          <Text style={[s.hint, { marginTop: 6 }]}>
            Dica: o salão encontra esse código em{" "}
            <Text style={{ fontWeight: "900", color: t.colors.text }}>Configurações</Text> ou{" "}
            <Text style={{ fontWeight: "900", color: t.colors.text }}>Tokens</Text>.
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          <Pressable
            onPress={onRequestPermission}
            disabled={!canSubmit || requestPermPending}
            style={({ pressed }) => [
              link.primaryBtn,
              pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
              (!canSubmit || requestPermPending) && { opacity: 0.5 },
            ]}
          >
            <Text style={link.primaryText}>{requestPermPending ? "Enviando..." : "Pedir acesso"}</Text>
          </Pressable>

          <Pressable
            onPress={pasteFromClipboard}
            disabled={requestPermPending}
            style={({ pressed }) => [
              link.outlineBtn,
              pressed && { opacity: 0.9 },
              requestPermPending && { opacity: 0.5 },
            ]}
          >
            <Text style={link.outlineText}>Colar</Text>
          </Pressable>

          <Pressable
            onPress={() => setSalonId("")}
            disabled={requestPermPending || !salonId}
            style={({ pressed }) => [
              link.outlineBtn,
              pressed && { opacity: 0.9 },
              (requestPermPending || !salonId) && { opacity: 0.5 },
            ]}
          >
            <Text style={link.outlineText}>Limpar</Text>
          </Pressable>
        </View>

        <View style={link.hairline} />

        <Text style={s.hint}>
          Depois que o salão aprovar, ele aparece em{" "}
          <Text style={{ fontWeight: "900", color: t.colors.text }}>“Meus vínculos”</Text> e libera o carrinho.
        </Text>
      </Card>
    </ScrollView>
  );
}