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

function normalizePersonKey(value?: string | null) {
  return String(value ?? "").trim().toLowerCase();
}

export function ReferralLinksView({ data, onBack, onRefresh }: Props) {
  const customers = data?.customers ?? [];
  const salons = data?.salons ?? [];
  const summary = data?.summary;

    const customerEmailSet = React.useMemo(() => {
    return new Set(
      customers
        .map((item) => normalizePersonKey(item.email))
        .filter(Boolean)
    );
  }, [customers]);

  const uniquePeopleCount = React.useMemo(() => {
    const keys = new Set<string>();

    customers.forEach((item) => {
      const key = normalizePersonKey(item.email) || `customer:${item.id}`;
      keys.add(key);
    });

    salons.forEach((item) => {
      const key =
        normalizePersonKey(item.ownerEmail || item.email) || `salon:${item.id}`;
      keys.add(key);
    });

    return keys.size;
  }, [customers, salons]);

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
          Clientes: {summary?.totalCustomers ?? customers.length}
        </Text>

        <Text style={{ fontSize: 14, color: "#374151", marginBottom: 4 }}>
          Salões: {summary?.totalSalons ?? salons.length}
        </Text>

        <Text style={{ fontSize: 14, color: "#374151", marginBottom: 4 }}>
          Vinculações: {summary?.total ?? customers.length + salons.length}
        </Text>

        <Text style={{ fontSize: 14, color: "#111827", fontWeight: "700" }}>
          Pessoas únicas: {uniquePeopleCount}
        </Text>

        <Text
          style={{
            marginTop: 8,
            fontSize: 12,
            lineHeight: 18,
            color: "#6B7280",
          }}
        >
          A mesma pessoa pode aparecer em clientes e salões quando ela também
          possui um salão vinculado.
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
                  ? `Responsável: ${item.ownerName}${
                      customerEmailSet.has(
                        normalizePersonKey(item.ownerEmail || item.email)
                      )
                        ? " • também aparece em clientes"
                        : ""
                    }`
                  : [item.city, item.state].filter(Boolean).join(" - ")
              }
            />
          ))
        )}
      </Section>
    </ScrollView>
  );
}