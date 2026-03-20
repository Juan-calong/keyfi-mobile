import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
  StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { Loading, ErrorState, Empty } from "../../ui/components/State";
import { IosAlert } from "../../ui/components/IosAlert";

import { SELLER_SCREENS } from "../../navigation/seller.routes";
import {
  listSellerCartRequests,
  type SalonCartRequest,
} from "../../core/api/services/cartRequests.service";

const BLACK = "#000000";
const WHITE = "#FFFFFF";
const LINE = "rgba(0,0,0,0.12)";

function formatBRL(value: string | number) {
  const n = Number(String(value ?? 0).replace(",", "."));
  if (!Number.isFinite(n)) return "R$ —";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const FILTERS = ["ALL", "DRAFT", "SENT", "APPROVED", "REJECTED"] as const;
type FilterType = typeof FILTERS[number];

export function SellerCartRequestsScreen() {
  const nav = useNavigation<any>();
  const [modal, setModal] = useState<null | { title: string; message: string }>(null);
  const [status, setStatus] = useState<FilterType>("ALL");

  const q = useQuery({
    queryKey: ["seller-cart-requests", status],
    queryFn: () => listSellerCartRequests(status === "ALL" ? undefined : status),
  });

  const items: SalonCartRequest[] = useMemo(() => q.data?.items ?? [], [q.data]);

  return (
    <Screen style={{ flex: 1, backgroundColor: WHITE }}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      <View style={s.header}>
        <Pressable onPress={() => nav.goBack?.()} hitSlop={12} style={s.headerLeft}>
          <Text style={s.chev}>‹</Text>
          <Text style={s.backText}>Back</Text>
        </Pressable>

        <Text style={s.headerTitle}>Carrinhos enviados</Text>

        <Pressable onPress={() => q.refetch()} hitSlop={12} style={s.headerRight}>
          <Text style={s.headerRightText}>{q.isRefetching ? "..." : "⟳"}</Text>
        </Pressable>
      </View>

      <Container style={{ flex: 1, paddingHorizontal: 16 }}>
        <View style={s.rule} />

        <View style={s.filtersRow}>
          {FILTERS.map((f) => {
            const active = status === f;
            return (
              <Pressable
                key={f}
                onPress={() => setStatus(f)}
                style={({ pressed }) => [
                  s.filterChip,
                  active && s.filterChipActive,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[s.filterChipText, active && s.filterChipTextActive]}>
                  {f}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {q.isLoading ? (
          <Loading />
        ) : q.isError ? (
          <ErrorState onRetry={() => q.refetch()} />
        ) : items.length === 0 ? (
          <Empty text="Nenhum carrinho encontrado." />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 24 }}
            ItemSeparatorComponent={() => <View style={s.sep} />}
            renderItem={({ item }) => (
              <Pressable
                onPress={() =>
                  nav.navigate(SELLER_SCREENS.CartRequestDetails, {
                    requestId: item.id,
                  })
                }
                style={({ pressed }) => [s.card, pressed && { opacity: 0.75 }]}
              >
                <View style={s.cardTop}>
                  <Text style={s.cardTitle} numberOfLines={1}>
                    {item.salon?.name || "Salão"}
                  </Text>

                  <View style={s.statusPill}>
                    <Text style={s.statusPillText}>{item.status}</Text>
                  </View>
                </View>

                <Text style={s.cardMeta}>
                  {item.items?.length ?? 0} item(ns)
                </Text>

                {item.note ? (
                  <Text style={s.cardNote} numberOfLines={2}>
                    {item.note}
                  </Text>
                ) : null}

                <View style={s.cardBottom}>
                  <Text style={s.cardTotal}>{formatBRL(item.totalAmount)}</Text>
                  <Text style={s.cardHint}>Ver detalhes</Text>
                </View>
              </Pressable>
            )}
          />
        )}
      </Container>

      <IosAlert
        visible={!!modal}
        title={modal?.title}
        message={modal?.message}
        onClose={() => setModal(null)}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: WHITE,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 6, minWidth: 80 },
  headerTitle: { color: BLACK, fontSize: 17, fontWeight: "600" },
  headerRight: { minWidth: 60, alignItems: "flex-end" },
  headerRightText: { color: BLACK, fontSize: 16, fontWeight: "800" },
  chev: { fontSize: 28, lineHeight: 28, color: BLACK, marginTop: Platform.OS === "android" ? -2 : 0 },
  backText: { fontSize: 16, color: BLACK, fontWeight: "500" },

  rule: { height: 1, backgroundColor: LINE, marginBottom: 12 },
  sep: { height: 1, backgroundColor: LINE },

  filtersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: WHITE,
  },
  filterChipActive: {
    backgroundColor: BLACK,
    borderColor: BLACK,
  },
  filterChipText: {
    color: BLACK,
    fontWeight: "800",
    fontSize: 12,
  },
  filterChipTextActive: {
    color: WHITE,
  },

  card: {
    paddingVertical: 14,
    gap: 8,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    flex: 1,
    color: BLACK,
    fontSize: 16,
    fontWeight: "900",
    marginRight: 10,
  },
  statusPill: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPillText: {
    color: BLACK,
    fontSize: 11,
    fontWeight: "900",
  },
  cardMeta: {
    color: "rgba(0,0,0,0.65)",
    fontWeight: "700",
    fontSize: 13,
  },
  cardNote: {
    color: "rgba(0,0,0,0.8)",
    fontSize: 13,
    fontWeight: "600",
  },
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTotal: {
    color: BLACK,
    fontSize: 15,
    fontWeight: "900",
  },
  cardHint: {
    color: "rgba(0,0,0,0.55)",
    fontWeight: "800",
    fontSize: 12,
  },
});