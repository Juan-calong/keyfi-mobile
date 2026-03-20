import React from "react";
import { ScrollView, Text, View } from "react-native";

import { Card } from "../../../../ui/components/Card";
import { iosTop, s } from "../sellerProfile.styles";
import { IOSButton } from "./IOSButton";
import { TopBarIOS } from "./TopBarIOS";

type Props = {
  referralToken: string;
  onBack: () => void;
  onCopy: () => void;
  onShare: () => void;
  onRefresh: () => void;
};

export function TokenView({
  referralToken,
  onBack,
  onCopy,
  onShare,
  onRefresh,
}: Props) {
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 40, paddingTop: 18 }}>
      <TopBarIOS title="Meu token" onBack={onBack} />
      <View style={iosTop.hairline} />

      <View style={{ flex: 1, justifyContent: "center" }}>
        <Card style={{ gap: 14 }}>
          <Text style={s.cardTitle}>Token de indicação</Text>

          <View style={s.tokenOuter}>
            <View style={s.tokenInner}>
              <Text selectable style={s.tokenText}>
                {referralToken || "—"}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <IOSButton title="Copiar token" primary onPress={onCopy} disabled={!referralToken} full />
            </View>

            <View style={{ flex: 1 }}>
              <IOSButton title="Compartilhar" onPress={onShare} disabled={!referralToken} full />
            </View>
          </View>

          <View style={{ marginTop: 10 }}>
            <IOSButton title="Atualizar" onPress={onRefresh} />
          </View>

          <Text style={s.hint}>
            Como usar:
            {"\n"}1) Envie esse token para o salão
            {"\n"}2) O salão cola em “Aplicar token”
          </Text>
        </Card>
      </View>
    </ScrollView>
  );
}