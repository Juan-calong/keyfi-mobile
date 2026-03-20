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
import { OWNER_SCREENS } from "../../navigation/owner.routes";
import { useAuthStore } from "../../stores/auth.store";
import { endpoints } from "../../core/api/endpoints";

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
};

type OrdersListDTO = { items: OrderListItem[] } | OrderListItem[];

function asItems(v: any): OrderListItem[] {
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.items)) return v.items;
  return [];
}

type OrderFilter = "ALL" | "AWAITING" | "PAID" | "CANCELED";

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
  return up || "—";
}

function toneForPaymentStatus(s: string) {
  const up = String(s || "").toUpperCase();
  if (up === "PAID") return "success" as const;
  if (up === "PENDING") return "warning" as const;
  if (up === "FAILED" || up === "CANCELED" || up === "EXPIRED") return "danger" as const;
  return "muted" as const;
}

function labelForPaymentStatus(s: string) {
  const up = String(s || "").toUpperCase();
  if (up === "PAID") return "Pagamento aprovado";
  if (up === "PENDING") return "Pagamento pendente";
  if (up === "FAILED") return "Pagamento falhou";
  if (up === "EXPIRED") return "Pagamento expirado";
  if (up === "CANCELED") return "Pagamento cancelado";
  return up || "—";
}

function isCanceledLike(item: OrderListItem) {
  const st = String(item.status || "").toUpperCase();
  const ps = String(item.paymentStatus || "").toUpperCase();
  return st === "CANCELED" || ["CANCELED", "FAILED", "EXPIRED"].includes(ps);
}

export function OwnerOrdersScreen() {
  const nav = useNavigation<any>();
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);

  const [filter, setFilter] = useState<OrderFilter>("ALL");

  const params = useMemo(
    () => ({
      buyerType: "SALON_OWNER",
      take: 100,
    }),
    []
  );

  const q = useQuery<OrdersListDTO>({
    queryKey: ["owner-orders", params],
    queryFn: async () => {
      const res = await api.get(endpoints.orders.list, { params });
      return res.data;
    },
    enabled: hydrated && !!token,
    retry: false,
  });

  const items = useMemo(() => asItems(q.data), [q.data]);

  const filteredItems = useMemo(() => {
    const list = items;

    if (filter === "PAID") {
      return list.filter((o) => String(o.paymentStatus).toUpperCase() === "PAID");
    }

    if (filter === "AWAITING") {
      return list.filter(
        (o) => String(o.paymentStatus).toUpperCase() === "PENDING" && !isCanceledLike(o)
      );
    }

    if (filter === "CANCELED") {
      return list.filter((o) => isCanceledLike(o));
    }

    return list;
  }, [items, filter]);

  return (
    <Screen>
      <Container style={{ flex: 1 }}>
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.h1}>Pedidos</Text>
            <Text style={s.sub}>Veja o histórico e os itens comprados</Text>
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
          <Chip
            label="Aguardando"
            active={filter === "AWAITING"}
            onPress={() => setFilter("AWAITING")}
          />
          <Chip label="Pago" active={filter === "PAID"} onPress={() => setFilter("PAID")} />
          <Chip
            label="Cancelado"
            active={filter === "CANCELED"}
            onPress={() => setFilter("CANCELED")}
          />
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
              renderItem={({ item }: { item: OrderListItem }) => (
                <Card style={s.card}>
                  <View style={s.rowTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.code}>#{item.code || item.id.slice(0, 8)}</Text>
                      <Text style={s.meta}>
                        {formatDate(item.createdAt)} • Total {formatBRL(item.totalAmount)}
                      </Text>
                    </View>

                    <View style={{ alignItems: "flex-end", gap: 8 }}>
                      <Pill
                        text={labelForOrderStatus(item.status)}
                        tone={toneForOrderStatus(item.status)}
                      />
                      <Pill
                        text={labelForPaymentStatus(item.paymentStatus)}
                        tone={toneForPaymentStatus(item.paymentStatus)}
                      />
                    </View>
                  </View>

                  <View style={s.actions}>
                    <Button
                      title="Ver itens"
                      variant="primary"
                      onPress={() =>
                        nav.navigate(OWNER_SCREENS.OrderDetails, {
                          orderId: item.id,
                        })
                      }
                      style={{ height: 42, borderRadius: 12 }}
                    />
                  </View>
                </Card>
              )}
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  h1: { color: t.colors.text, fontWeight: "900", fontSize: 28 },
  sub: { color: t.colors.text2, fontWeight: "800", marginTop: 6 },

  filters: { marginTop: 12, flexDirection: "row", gap: 8, flexWrap: "wrap" },

  card: { padding: 14, borderRadius: 16 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  code: { color: t.colors.text, fontWeight: "900", fontSize: 14 },
  meta: { color: t.colors.text2, fontWeight: "800", marginTop: 8 },

  actions: { marginTop: 12, flexDirection: "row", gap: 10, flexWrap: "wrap" },
});