import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "../../../../ui/components/Button";
import { s } from "../sellerProfile.styles";
import { RowItem } from "./RowItem";

type Props = {
  referralToken: string;
  hasPix: boolean;
  hasBeneficiary: boolean;
  isBlocked: boolean;
  onOpenDetails: () => void;
  onOpenToken: () => void;
  onOpenPix: () => void;
  onOpenBeneficiary: () => void;
  onOpenLinkSalon: () => void;
  onOpenReferrals: () => void;
  onLogout: () => void;
};

export function HomeView({
  referralToken,
  hasPix,
  hasBeneficiary,
  isBlocked,
  onOpenDetails,
  onOpenToken,
  onOpenPix,
  onOpenBeneficiary,
  onOpenLinkSalon,
  onOpenReferrals,
  onLogout,
}: Props) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingTop: 24 }}>
      <View style={s.homeHeader}>
        <Text style={s.bigTitle}>Profile</Text>
      </View>

      <View style={{ height: 12 }} />

      <Pressable onPress={onOpenDetails} style={s.accountRow}>
        <View style={s.avatar}>
          <Text style={s.avatarTxt}>👤</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={s.accountTitle}>Meu Perfil</Text>
          <Text style={s.accountSub}>Ver dados do vendedor</Text>
        </View>

        <Text style={s.smallChev}>›</Text>
      </Pressable>

      <View style={{ height: 12 }} />

      <View style={s.group}>
        <RowItem
          title="Meu token"
          subtitle="Copie e envie para o salão"
          rightText={referralToken ? "ATIVO" : "FALTA"}
          onPress={onOpenToken}
        />

        <RowItem
          title="Quem usou meu token"
          subtitle="Ver clientes e salões vinculados"
          onPress={onOpenReferrals}
        />

        <RowItem
          title="Recebimento (PIX)"
          subtitle={hasPix ? "Editar dados do PIX" : "Cadastrar PIX para receber"}
          rightText={hasPix ? (isBlocked ? "BLOQ." : "OK") : "FALTA"}
          onPress={onOpenPix}
        />

        <RowItem
          title="Beneficiário"
          subtitle={hasBeneficiary ? "Editar dados do beneficiário" : "Cadastrar beneficiário"}
          rightText={hasBeneficiary ? "OK" : "FALTA"}
          onPress={onOpenBeneficiary}
        />

        <RowItem
          title="Vincular a um salão"
          subtitle="Cole o código do salão e peça acesso"
          onPress={onOpenLinkSalon}
          hideDivider
        />
      </View>

      <View style={{ height: 18 }} />

      <Button title="Sair" variant="ghost" onPress={onLogout} />
    </ScrollView>
  );
}