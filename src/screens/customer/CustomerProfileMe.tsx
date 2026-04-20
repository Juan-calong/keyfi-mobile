// src/screens/customer/CustomerProfileMe.tsx
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { Loading, ErrorState } from "../../ui/components/State";
import { t } from "../../ui/tokens";

import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";
import { CUSTOMER_SCREENS } from "../../navigation/customer.routes";



import { IosConfirm, type IosConfirmAction } from "../../ui/components/IosConfirm";

type MeDTO = any;

function pickUserName(me: any) {
  return me?.name || me?.fullName || me?.profile?.name || me?.user?.name || "Minha conta";
}

function pickEmail(me: any) {
  return me?.email || me?.profile?.email || me?.user?.email || "";
}

function RowItem({
  title,
  subtitle,
  onPress,
  hideDivider,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
  hideDivider?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 14,
        paddingHorizontal: 4,
        borderBottomWidth: hideDivider ? 0 : 1,
        borderBottomColor: t.colors.border,
      }}
    >
      <View style={{ flex: 1, paddingRight: 10 }}>
        <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 16, letterSpacing: 0.2 }}>{title}</Text>

        {!!subtitle && (
          <Text style={{ marginTop: 2, color: t.colors.text2, fontWeight: "700", fontSize: 12 }}>{subtitle}</Text>
        )}
      </View>

      <Text style={{ color: t.colors.text2, fontSize: 30, fontWeight: "900" }}>›</Text>
    </Pressable>
  );
}

export function CustomerProfileMe() {
  const nav = useNavigation<any>();

  const [confirm, setConfirm] = useState<null | { title: string; message: string; actions: IosConfirmAction[] }>(null);

  const meQ = useQuery<MeDTO>({
    queryKey: ["me"],
    queryFn: async () => (await api.get(endpoints.profiles.me)).data,
    retry: false,
  });

  const me = meQ.data;
  const userName = pickUserName(me);
  const email = pickEmail(me);

  if (meQ.isLoading) {
    return (
      <Screen>
        <Container style={{ flex: 1 }}>
          <Loading />
        </Container>
      </Screen>
    );
  }

  if (meQ.isError) {
    return (
      <Screen>
        <Container style={{ flex: 1 }}>
          <ErrorState onRetry={() => meQ.refetch()} />
        </Container>
      </Screen>
    );
  }


  return (
    <Screen>
      <Container style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingTop: 80 }}>
          <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 28, paddingHorizontal: 4 }}>Perfil</Text>

          <View style={{ height: 12 }} />

          <Pressable
            onPress={() => nav.navigate(CUSTOMER_SCREENS.ProfileDetails)}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 4 }}
          >
            <View
              style={{
                width: 55,
                height: 55,
                borderRadius: 26,
                backgroundColor: t.colors.surface,
                borderWidth: 1,
                borderColor: t.colors.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: t.colors.text2, fontSize: 18, fontWeight: "900" }}>👤</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 16 }}>Minha conta</Text>

              <Text style={{ marginTop: 2, color: t.colors.text2, fontWeight: "700", fontSize: 12 }}>
                {userName}
                {email ? ` • ${email}` : ""}
              </Text>
            </View>

            <Text style={{ color: t.colors.text2, fontSize: 18, fontWeight: "900" }}>›</Text>
          </Pressable>

          <View style={{ height: 12 }} />

          <View
            style={{
              backgroundColor: "#FFF",
              borderTopWidth: 1,
              borderTopColor: t.colors.border,
              borderBottomWidth: 1,
              borderBottomColor: t.colors.border,
            }}
          >
            <RowItem title="Pedidos" onPress={() => nav.navigate(CUSTOMER_SCREENS.Orders)} />
            <RowItem
              title="Notificações"
              onPress={() => nav.navigate(CUSTOMER_SCREENS.Notifications)}
            />
            <RowItem
              title="Vincular por token"
              subtitle="Cole o token do vendedor ou salão"
              onPress={() => nav.navigate(CUSTOMER_SCREENS.ApplyReferral)}
              hideDivider
            />
          </View>
        </ScrollView>

        <IosConfirm
          visible={!!confirm}
          title={confirm?.title}
          message={confirm?.message}
          actions={confirm?.actions || []}
          onClose={() => setConfirm(null)}
        />
      </Container>
    </Screen>
  );
}