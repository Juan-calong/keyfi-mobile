import React, { useMemo } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { Card } from "../../ui/components/Card";
import { Button } from "../../ui/components/Button";
import { Loading, ErrorState, Empty } from "../../ui/components/State";
import { t } from "../../ui/tokens";

import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";

function formatBRL(value: string | number) {
  const n = Number(String(value ?? 0).replace(",", "."));
  if (!Number.isFinite(n)) return "R$ —";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR");
}

type OrderListItem = {
  id: string;
  code: string;
  status: string;
  paymentStatus: string;
  totalAmount: string;
  createdAt: string;
};

type OrdersListDTO = { items: OrderListItem[] } | OrderListItem[];

function asItems<T>(v: any): T[] {
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.items)) return v.items;
  return [];
}

type PromoItem = { id?: string; productId?: string; title?: string; name?: string; createdAt?: string };

type Notif = {
  id: string;
  kind: "ORDER" | "PROMO";
  title: string;
  subtitle: string;
  time?: string;
};

export function OwnerNotificationsScreen() {
  const ordersQ = useQuery<OrdersListDTO>({
    queryKey: ["owner-notifs-orders"],
    queryFn: async () => {
      const res = await api.get(endpoints.orders.list, {
        params: { buyerType: "SALON_OWNER", take: 20 },
      });
      return res.data;
    },
    retry: false,
  });

  const promosQ = useQuery<any>({
    queryKey: ["owner-notifs-promos"],
    queryFn: async () => {
      const res = await api.get(endpoints.products.promosActive, { params: { take: 10 } });
      return res.data;
    },
    retry: false,
  });

  const notifs = useMemo<Notif[]>(() => {
    const out: Notif[] = [];

    const orders = asItems<OrderListItem>(ordersQ.data);
    for (const o of orders.slice(0, 12)) {
      const paid = String(o.paymentStatus || "").toUpperCase() === "PAID";
      out.push({
        id: `order-${o.id}`,
        kind: "ORDER",
        title: paid ? `✅ Pedido pago #${o.code}` : `🛒 Pedido criado #${o.code}`,
        subtitle: `Total ${formatBRL(o.totalAmount)} • ${String(o.status || "").toUpperCase()}`,
        time: o.createdAt,
      });
    }

    const promos = asItems<PromoItem>(promosQ.data);
    for (const p of promos.slice(0, 8)) {
      out.push({
        id: `promo-${p.id || p.productId || Math.random().toString(16).slice(2)}`,
        kind: "PROMO",
        title: "🔥 Promoção ativa",
        subtitle: p.title || p.name || "Veja as promoções na aba Promoções",
        time: p.createdAt,
      });
    }

    // ordena por data (se existir)
    out.sort((a, b) => {
      const ta = a.time ? new Date(a.time).getTime() : 0;
      const tb = b.time ? new Date(b.time).getTime() : 0;
      return tb - ta;
    });

    return out;
  }, [ordersQ.data, promosQ.data]);

  const isLoading = ordersQ.isLoading || promosQ.isLoading;
  const isError = ordersQ.isError || promosQ.isError;

  return (
    <Screen>
      <Container style={{ flex: 1 }}>
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.h1}>Notificações</Text>
            <Text style={s.sub}>Compras e promoções recentes</Text>
          </View>

          <Button
            title={ordersQ.isRefetching || promosQ.isRefetching ? "..." : "⟳"}
            variant="ghost"
            onPress={() => {
              ordersQ.refetch();
              promosQ.refetch();
            }}
            style={{ minWidth: 44, height: 44, borderRadius: 12 }}
          />
        </View>

        <View style={{ marginTop: 12, flex: 1, minHeight: 0 }}>
          {isLoading ? (
            <Loading />
          ) : isError ? (
            <ErrorState
              onRetry={() => {
                ordersQ.refetch();
                promosQ.refetch();
              }}
            />
          ) : (
            <FlatList
              data={notifs}
              keyExtractor={(i) => i.id}
              contentContainerStyle={{ paddingBottom: 40, gap: 12 }}
              renderItem={({ item }) => (
                <Card style={s.card}>
                  <Text style={s.title}>{item.title}</Text>
                  <Text style={s.subtitle}>{item.subtitle}</Text>
                  {item.time ? <Text style={s.time}>{formatDateTime(item.time)}</Text> : null}
                </Card>
              )}
              ListEmptyComponent={<Empty text="Sem notificações por enquanto." />}
              refreshing={ordersQ.isRefetching || promosQ.isRefetching}
              onRefresh={() => {
                ordersQ.refetch();
                promosQ.refetch();
              }}
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
  h1: { color: t.colors.text, fontWeight: "900", fontSize: 22 },
  sub: { color: t.colors.text2, fontWeight: "800", marginTop: 6 },

  card: { padding: 14, borderRadius: 16 },
  title: { color: t.colors.text, fontWeight: "900" },
  subtitle: { marginTop: 8, color: t.colors.text2, fontWeight: "800" },
  time: { marginTop: 10, color: t.colors.text2, fontWeight: "800", fontSize: 12 },
});
