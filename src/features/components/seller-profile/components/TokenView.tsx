import React from "react";
import { ScrollView, Text, View } from "react-native";

import { Card } from "../../../../ui/components/Card";
import { iosTop, s } from "../sellerProfile.styles";
import { IOSButton } from "./IOSButton";
import { TopBarIOS } from "./TopBarIOS";

type Props = {
  referralToken: string;
  inviteUrl: string;
  onBack: () => void;
  onCopyToken: () => void;
  onCopyLink: () => void;
  onShareLink: () => void;
  onRefresh: () => void;
};

export function TokenView({
  referralToken,
  inviteUrl,
  onBack,
  onCopyToken,
  onCopyLink,
  onShareLink,
  onRefresh,
}: Props) {
  const hasToken = !!referralToken;
  const hasInviteUrl = !!inviteUrl;

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 40, paddingTop: 18 }}>
      <TopBarIOS title="Meu token e link" onBack={onBack} />
      <View style={iosTop.hairline} />

      <View style={{ flex: 1, justifyContent: "center" }}>
        <Card style={{ gap: 16 }}>
          <Text style={s.cardTitle}>Convite de indicação</Text>

          <View
            style={{
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 16,
              backgroundColor: "rgba(255,255,255,0.04)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.06)",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                marginBottom: 8,
                opacity: 0.72,
                textTransform: "uppercase",
                letterSpacing: 0.6,
              }}
            >
              Token
            </Text>

            <View style={s.tokenOuter}>
              <View style={s.tokenInner}>
                <Text selectable style={s.tokenText}>
                  {referralToken || "—"}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={{
              paddingVertical: 12,
              paddingHorizontal: 12,
              borderRadius: 16,
              backgroundColor: "rgba(255,255,255,0.04)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.06)",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                marginBottom: 8,
                opacity: 0.72,
                textTransform: "uppercase",
                letterSpacing: 0.6,
              }}
            >
              Link do convite
            </Text>

            <View
              style={{
                borderRadius: 14,
                paddingHorizontal: 12,
                paddingVertical: 14,
                backgroundColor: "rgba(255,255,255,0.05)",
              }}
            >
              <Text
                selectable
                style={{
                  fontSize: 13,
                  lineHeight: 20,
                  color: "#fff",
                }}
              >
                {inviteUrl || "Seu link ainda não foi carregado."}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <IOSButton
                title="Copiar token"
                primary
                onPress={onCopyToken}
                disabled={!hasToken}
                full
              />
            </View>

            <View style={{ flex: 1 }}>
              <IOSButton
                title="Copiar link"
                onPress={onCopyLink}
                disabled={!hasInviteUrl}
                full
              />
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <IOSButton
                title="Compartilhar link"
                onPress={onShareLink}
                disabled={!hasInviteUrl}
                full
              />
            </View>

            <View style={{ flex: 1 }}>
              <IOSButton title="Atualizar" onPress={onRefresh} full />
            </View>
          </View>

          <Text style={s.hint}>
            Como usar:
            {"\n"}1) Você pode enviar o token ou o link
            {"\n"}2) O link é melhor porque já leva a pessoa para instalar o app
            {"\n"}3) Depois da instalação, o convite pode ser aplicado automaticamente pelo app
          </Text>
        </Card>
      </View>
    </ScrollView>
  );
}