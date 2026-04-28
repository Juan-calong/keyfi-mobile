// screens/customer/CustomerOrdersScreen.tsx
import React, { useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { Card } from "../../ui/components/Card";
import { Button } from "../../ui/components/Button";
import { Pill } from "../../ui/components/Pill";
import { Chip } from "../../ui/components/Chip";
import { Loading, ErrorState, Empty } from "../../ui/components/State";
import { t } from "../../ui/tokens";

import { api } from "../../core/api/client";
import { CUSTOMER_SCREENS } from "../../navigation/customer.routes";
import { useAuthStore } from "../../stores/auth.store";
import { endpoints } from "../../core/api/endpoints";
import { AppBackButton } from "../../ui/components/AppBackButton";

function formatBRL(value: string | number) {
  const n = Number(String(value ?? 0).replace(",", "."));
  if (!Number.isFinite(n)) return "R$ —";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR");
}

type OrderListItem = {
  id: string;
  code: string;
  buyerType: string;
  status: string;
  paymentStatus: string;
  totalAmount: string;
  createdAt: string;
  items?: Array<{
  qty?: number | string | null;
  product?: { name?: string | null } | null;
  productSnapshot?: { name?: string | null } | null;
  name?: string | null;
  title?: string | null;
  }> | null;
};

type OrdersListDTO = { items: OrderListItem[] } | OrderListItem[];

function asItems(v: any): OrderListItem[] {
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.items)) return v.items;
  return [];
}

type OrderFilter = "ALL" | "AWAITING" | "PAID";

function toneForOrderStatus(s: string) {
  const up = String(s || "").toUpperCase();
  if (up === "PAID") return "success" as const;
  if (up === "CREATED") return "warning" as const;
  if (up === "SHIPPED" || up === "COMPLETED") return "success" as const;
  if (up === "CANCELED") return "danger" as const;
  return "muted" as const;
}

function labelForOrderStatus(s: string) {
  const up = String(s || "").toUpperCase();
  if (up === "CREATED") return "Aguardando";
  if (up === "PAID") return "Pago";
  if (up === "SHIPPED") return "Enviado";
  if (up === "COMPLETED") return "Concluído";
  if (up === "CANCELED") return "Cancelado";
  return up;
}

function toneForPaymentStatus(s: string) {
  const up = String(s || "").toUpperCase();
  if (up === "PAID") return "success" as const;
  if (up === "PENDING") return "warning" as const;
  if (up === "FAILED" || up === "CANCELED" || up === "EXPIRED") return "danger" as const;
  return "muted" as const;
}

function isCanceledLike(item: OrderListItem) {
  const st = String(item.status || "").toUpperCase();
  const ps = String(item.paymentStatus || "").toUpperCase();
  return st === "CANCELED" || ["CANCELED", "FAILED", "EXPIRED"].includes(ps);
}

function summarizeOrderItems(item: OrderListItem) {
  const lines = Array.isArray(item?.items) ? item.items : [];
  if (lines.length === 0) return null;

  const normalized = lines.map((line, idx) => {
    const name =
      String(
        line?.product?.name ||
          line?.productSnapshot?.name ||
          line?.name ||
          line?.title ||
          `Item ${idx + 1}`
      ).trim() || `Item ${idx + 1}`;
    const qty = Math.max(1, Number(line?.qty ?? 1) || 1);
    return { name, qty };
  });

  if (normalized.length === 1) {
    return `${normalized[0].name} (${normalized[0].qty}x)`;
  }

  if (normalized.length === 2) {
    return `${normalized[0].name} (${normalized[0].qty}x) • ${normalized[1].name} (${normalized[1].qty}x)`;
  }

  return `${normalized[0].name} (${normalized[0].qty}x) +${normalized.length - 1} item(ns)`;
}

export function CustomerOrdersScreen() {
  const nav = useNavigation<any>();
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);

  const [filter, setFilter] = useState<OrderFilter>("ALL");

  const params = useMemo(
    () => ({
      buyerType: "CUSTOMER",
      take: 100,
      includeItems: true,
    }),
    []
  );

  const q = useQuery<OrdersListDTO>({
    queryKey: ["customer-orders", params],
    queryFn: async () => {
      const res = await api.get(endpoints.orders.list, { params });
      return res.data;
    },
    enabled: hydrated && !!token,
    retry: false,
  });

  const items = useMemo(() => asItems(q.data), [q.data]);

const filteredItems = useMemo(() => {
  const visibleItems = items.filter((o) => !isCanceledLike(o));

  if (filter === "PAID") {
    return visibleItems.filter((o) => String(o.paymentStatus).toUpperCase() === "PAID");
  }

  if (filter === "AWAITING") {
    return visibleItems.filter((o) => String(o.paymentStatus).toUpperCase() === "PENDING");
  }

  return visibleItems;
}, [items, filter]);

  return (
    <Screen>
      <Container style={{ flex: 1 }}>
<View style={s.header}>
  <View style={s.headerLeft}>
    <AppBackButton
      onPress={() => nav.goBack()}
      showLabel={false}
      color={t.colors.text}
      iconSize={24}
      style={s.backButton}
    />

    <Text style={s.h1}>Pedidos</Text>
  </View>

  <Button
    title={q.isRefetching ? "..." : "⟳"}
    variant="ghost"
    onPress={() => q.refetch()}
    style={{ minWidth: 44, height: 44, borderRadius: 12 }}
  />
</View>

        <View style={s.filters}>
          <Chip label="Todos" active={filter === "ALL"} onPress={() => setFilter("ALL")} />
          <Chip label="Aguardando" active={filter === "AWAITING"} onPress={() => setFilter("AWAITING")} />
          <Chip label="Pago" active={filter === "PAID"} onPress={() => setFilter("PAID")} />
        </View>

        <View style={{ marginTop: 12, flex: 1, minHeight: 0 }}>
          {q.isLoading ? (
            <Loading />
          ) : q.isError ? (
            <ErrorState onRetry={() => q.refetch()} />
          ) : (
            <FlatList
              data={filteredItems}
              keyExtractor={(i) => i.id}
              contentContainerStyle={{ paddingBottom: 120, gap: 12 }}
              renderItem={({ item }: { item: OrderListItem }) => {
                const itemsSummary = summarizeOrderItems(item);
                return (
                <Card style={s.card}>
                  <View style={s.rowTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.code}>#{item.code}</Text>
                      <Text style={s.meta}>
                        {formatDate(item.createdAt)} • Total {formatBRL(item.totalAmount)}
                      </Text>
                       {itemsSummary ? <Text style={s.itemsSummary}>{itemsSummary}</Text> : null}
                    </View>

                    <View style={{ alignItems: "flex-end", gap: 8 }}>
                      <Pill text={labelForOrderStatus(item.status)} tone={toneForOrderStatus(item.status)} />
                      <Pill text={String(item.paymentStatus)} tone={toneForPaymentStatus(item.paymentStatus)} />
                    </View>
                  </View>

                  <View style={s.actions}>
                    <Button
                      title="Abrir"
                      variant="primary"
                      onPress={() => nav.navigate(CUSTOMER_SCREENS.OrderDetails, { orderId: item.id })}
                      style={{ height: 42, borderRadius: 12 }}
                    />
                  </View>
                </Card>
                );
              }}
              ListEmptyComponent={<Empty text="Sem pedidos." />}
              refreshing={q.isRefetching}
              onRefresh={() => q.refetch()}
            />
          )}
        </View>
      </Container>
    </Screen>
  );
}

const s = StyleSheet.create({
header: {
  marginTop: 8,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
},
headerLeft: {
  flexDirection: "row",
  alignItems: "center",
  flex: 1,
  gap: 4,
},

backButton: {
  minWidth: 40,
  minHeight: 40,
  paddingRight: 0,
},

  h1: { color: t.colors.text, fontWeight: "900", fontSize: 28 },
  sub: { color: t.colors.text2, fontWeight: "800", marginTop: 6 },

  filters: { marginTop: 12, flexDirection: "row", gap: 8, flexWrap: "wrap" },

  card: { padding: 14, borderRadius: 16 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  code: { color: t.colors.text, fontWeight: "900", fontSize: 14 },
  meta: { color: t.colors.text2, fontWeight: "800", marginTop: 8 },
  itemsSummary: { color: t.colors.text2, fontWeight: "700", marginTop: 6, fontSize: 12 },

  actions: { marginTop: 12, flexDirection: "row", gap: 10, flexWrap: "wrap" },
});