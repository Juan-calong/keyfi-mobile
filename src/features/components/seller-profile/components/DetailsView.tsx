import React from "react";
import { ScrollView, Text, View } from "react-native";

import { Card } from "../../../../ui/components/Card";
import { iosTop, s } from "../sellerProfile.styles";
import { TopBarIOS } from "./TopBarIOS";

type Props = {
  email: string;
  sellerId: string;
  onBack: () => void;
};

export function DetailsView({ email, sellerId, onBack }: Props) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingTop: 18 }}>
      <TopBarIOS title="Meus dados" onBack={onBack} />
      <View style={iosTop.hairline} />

      <Card style={{ gap: 10 }}>
        <Text style={s.cardTitle}>Dados</Text>

        <Text style={s.line}>
          Email: <Text style={s.bold}>{email}</Text>
        </Text>

        <Text style={s.line}>
          Seller ID: <Text style={s.bold}>{sellerId}</Text>
        </Text>
      </Card>
    </ScrollView>
  );
}