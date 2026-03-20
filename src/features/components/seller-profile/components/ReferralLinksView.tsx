import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { SellerReferralsResponse } from "../sellerProfile.types";
import { s } from "../sellerProfile.styles";

type Props = {
  data: SellerReferralsResponse | null;
  onBack: () => void;
  onRefresh: () => void;
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
        borderColor: "#ECECEC",
        padding: 14,
        marginBottom: 14,
      }}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: "800",
          color: "#111827",
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
          fontSize: 15,
          fontWeight: "700",
          color: "#111827",
        }}
      >
        {title}
      </Text>

      {!!subtitle && (
        <Text
          style={{
            marginTop: 4,
            fontSize: 14,
            color: "#4B5563",
          }}
        >
          {subtitle}
        </Text>
      )}

      {!!extra && (
        <Text
          style={{
            marginTop: 3,
            fontSize: 13,
            color: "#6B7280",
          }}
        >
          {extra}
        </Text>
      )}
    </View>
  );
}

export function ReferralLinksView({ data, onBack, onRefresh }: Props) {
  const customers = data?.customers ?? [];
  const salons = data?.salons ?? [];
  const summary = data?.summary;

  return (
    <ScrollView contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}>
      <View style={s.homeHeader}>
        <Text style={s.bigTitle}>Meu token</Text>
      </View>

      <View style={{ height: 12 }} />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <Pressable onPress={onBack}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>
            Voltar
          </Text>
        </Pressable>

        <Pressable onPress={onRefresh}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>
            Atualizar
          </Text>
        </Pressable>
      </View>

      <Section title="Resumo">
        <Text style={{ fontSize: 14, color: "#374151", marginBottom: 6 }}>
          Token: {data?.referralToken || "—"}
        </Text>
        <Text style={{ fontSize: 14, color: "#374151", marginBottom: 4 }}>
          Clientes: {summary?.totalCustomers ?? 0}
        </Text>
        <Text style={{ fontSize: 14, color: "#374151", marginBottom: 4 }}>
          Salões: {summary?.totalSalons ?? 0}
        </Text>
        <Text style={{ fontSize: 14, color: "#374151" }}>
          Total: {summary?.total ?? 0}
        </Text>
      </Section>

      <Section title="Clientes vinculados ao meu token">
        {customers.length === 0 ? (
          <Text style={{ fontSize: 14, color: "#6B7280" }}>
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
          <Text style={{ fontSize: 14, color: "#6B7280" }}>
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
  );
}