import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { Loading, ErrorState } from "../../ui/components/State";
import { t } from "../../ui/tokens";

import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";

type SalonReferralCustomer = {
  id: string;
  type: "CUSTOMER";
  name: string;
  email: string;
  phone?: string | null;
  role?: string | null;
  createdAt: string;
};

type SalonReferralSalon = {
  id: string;
  type: "SALON";
  name: string;
  email: string;
  city?: string | null;
  state?: string | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
  createdAt: string;
};

type SalonReferralsResponse = {
  ok: boolean;
  referralToken?: string | null;
  summary: {
    totalCustomers: number;
    totalSalons: number;
    total: number;
  };
  customers: SalonReferralCustomer[];
  salons: SalonReferralSalon[];
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: t.colors.border,
        padding: 14,
        marginBottom: 14,
      }}
    >
      <Text
        style={{
          color: t.colors.text,
          fontWeight: "900",
          fontSize: 16,
          marginBottom: 10,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function ItemRow({
  title,
  subtitle,
  extra,
}: {
  title: string;
  subtitle?: string | null;
  extra?: string | null;
}) {
  return (
    <View
      style={{
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
      }}
    >
      <Text
        style={{
          color: t.colors.text,
          fontWeight: "900",
          fontSize: 15,
        }}
      >
        {title}
      </Text>

      {!!subtitle && (
        <Text
          style={{
            marginTop: 4,
            color: t.colors.text2,
            fontWeight: "700",
            fontSize: 13,
          }}
        >
          {subtitle}
        </Text>
      )}

      {!!extra && (
        <Text
          style={{
            marginTop: 3,
            color: t.colors.text2,
            fontWeight: "700",
            fontSize: 12,
          }}
        >
          {extra}
        </Text>
      )}
    </View>
  );
}

export function OwnerReferralLinksScreen() {
  const nav = useNavigation<any>();

  const q = useQuery<SalonReferralsResponse>({
    queryKey: ["owner-referrals-me"],
    queryFn: async () => (await api.get(endpoints.referrals.salonMe)).data,
    retry: false,
  });

  const data = q.data;
  const customers = data?.customers ?? [];
  const salons = data?.salons ?? [];
  const summary = data?.summary;

  return (
    <Screen>
      <Container style={{ flex: 1 }}>
        {q.isLoading ? (
          <Loading />
        ) : q.isError ? (
          <ErrorState onRetry={() => q.refetch()} />
        ) : (
          <ScrollView
            contentContainerStyle={{
              paddingBottom: 40,
              paddingTop: 80,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
                paddingHorizontal: 4,
              }}
            >
              <Pressable onPress={() => nav.goBack()}>
                <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 22}}>
                  {"<"}
                </Text>
              </Pressable>

              <Pressable onPress={() => q.refetch()}>
                <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 15 }}>
                  Atualizar
                </Text>
              </Pressable>
            </View>

            <Text
              style={{
                color: t.colors.text,
                fontWeight: "900",
                fontSize: 28,
                paddingHorizontal: 4,
              }}
            >
              Quem usou meu token
            </Text>

            <View style={{ height: 12 }} />

            <Section title="Resumo">
              <Text style={{ color: t.colors.text2, fontWeight: "700", fontSize: 13, marginBottom: 6 }}>
                Token: {data?.referralToken || "—"}
              </Text>
              <Text style={{ color: t.colors.text2, fontWeight: "700", fontSize: 13, marginBottom: 4 }}>
                Clientes: {summary?.totalCustomers ?? 0}
              </Text>
              <Text style={{ color: t.colors.text2, fontWeight: "700", fontSize: 13, marginBottom: 4 }}>
                Salões: {summary?.totalSalons ?? 0}
              </Text>
              <Text style={{ color: t.colors.text2, fontWeight: "700", fontSize: 13 }}>
                Total: {summary?.total ?? 0}
              </Text>
            </Section>

            <Section title="Clientes vinculados ao meu token">
              {customers.length === 0 ? (
                <Text style={{ color: t.colors.text2, fontWeight: "700", fontSize: 13 }}>
                  Nenhum cliente vinculado até agora.
                </Text>
              ) : (
                customers.map((item) => (
                  <ItemRow
                    key={item.id}
                    title={item.name}
                    subtitle={item.email}
                    extra={item.phone || null}
                  />
                ))
              )}
            </Section>

            <Section title="Salões vinculados ao meu token">
              {salons.length === 0 ? (
                <Text style={{ color: t.colors.text2, fontWeight: "700", fontSize: 13 }}>
                  Nenhum salão vinculado até agora.
                </Text>
              ) : (
                salons.map((item) => (
                  <ItemRow
                    key={item.id}
                    title={item.name}
                    subtitle={item.ownerEmail || item.email}
                    extra={
                      item.ownerName
                        ? `Responsável: ${item.ownerName}`
                        : [item.city, item.state].filter(Boolean).join(" - ")
                    }
                  />
                ))
              )}
            </Section>
          </ScrollView>
        )}
      </Container>
    </Screen>
  );
}