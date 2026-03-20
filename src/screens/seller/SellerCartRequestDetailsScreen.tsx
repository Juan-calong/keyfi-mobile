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
import { useNavigation, useRoute } from "@react-navigation/native";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { Loading, ErrorState } from "../../ui/components/State";
import { IosAlert } from "../../ui/components/IosAlert";

import {
  getSellerCartRequestById,
  sendSellerCartRequest,
} from "../../core/api/services/cartRequests.service";
import { friendlyError } from "../../core/errors/friendlyError";

const BLACK = "#000000";
const WHITE = "#FFFFFF";
const LINE = "rgba(0,0,0,0.12)";

function formatBRL(value: string | number) {
  const n = Number(String(value ?? 0).replace(",", "."));
  if (!Number.isFinite(n)) return "R$ —";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function SellerCartRequestDetailsScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const requestId = route.params?.requestId as string;

  const [modal, setModal] = useState<null | { title: string; message: string }>(null);

  const q = useQuery({
    queryKey: ["seller-cart-request-details", requestId],
    queryFn: () => getSellerCartRequestById(requestId),
    enabled: !!requestId,
  });

  const request = useMemo(() => q.data?.request, [q.data]);

  const sendMut = useMutation({
    mutationFn: () => sendSellerCartRequest(requestId),
    onSuccess: async () => {
      await q.refetch();
      setModal({
        title: "Enviado",
        message: "Carrinho enviado para o salão com sucesso.",
      });
    },
    onError: (e: any) => {
      const fe = friendlyError(e);
      setModal({
        title: fe.title || "Erro",
        message: fe.message || "Falha ao enviar carrinho.",
      });
    },
  });

  return (
    <Screen style={{ flex: 1, backgroundColor: WHITE }}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      <View style={s.header}>
        <Pressable onPress={() => nav.goBack?.()} hitSlop={12} style={s.headerLeft}>
          <Text style={s.chev}>‹</Text>
          <Text style={s.backText}>Back</Text>
        </Pressable>

        <Text style={s.headerTitle}>Detalhes do carrinho</Text>

        <View style={{ width: 70 }} />
      </View>

      <Container style={{ flex: 1, paddingHorizontal: 16 }}>
        <View style={s.rule} />

        {q.isLoading ? (
          <Loading />
        ) : q.isError || !request ? (
          <ErrorState onRetry={() => q.refetch()} />
        ) : (
          <>
            <FlatList
              data={request.items}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 220 }}
              ListHeaderComponent={
                <View style={{ paddingBottom: 12, gap: 8 }}>
                  <Text style={s.title}>{request.salon?.name || "Salão"}</Text>
                  <Text style={s.meta}>Status: {request.status}</Text>
                  {request.note ? <Text style={s.note}>Obs: {request.note}</Text> : null}
                </View>
              }
              ItemSeparatorComponent={() => <View style={s.sep} />}
              renderItem={({ item }) => (
                <View style={s.row}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.itemName} numberOfLines={1}>
                      {item.product?.name || "Produto"}
                    </Text>
                    <Text style={s.itemMeta}>
                      {item.qty}x • {formatBRL(item.unitPrice)}
                    </Text>
                  </View>

                  <Text style={s.itemTotal}>{formatBRL(item.total)}</Text>
                </View>
              )}
            />

            <View style={s.footer}>
              <View style={s.footerRule} />

              <Row label="Subtotal base" value={formatBRL(request.subtotalBase)} />
              <Row label="Subtotal após promo" value={formatBRL(request.subtotalAfterPromos)} />
              <Row label="Cupom" value={formatBRL(request.couponDiscount)} />
              <View style={s.sep} />
              <Row label="Total" value={formatBRL(request.totalAmount)} bold />

              {request.status === "DRAFT" ? (
                <Pressable
                  onPress={() => sendMut.mutate()}
                  disabled={sendMut.isPending}
                  style={({ pressed }) => [
                    s.primaryBtn,
                    (pressed || sendMut.isPending) && { opacity: 0.7 },
                  ]}
                >
                  <Text style={s.primaryBtnText}>
                    {sendMut.isPending ? "Enviando..." : "Enviar para o salão"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </>
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

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={[s.rowLabel, bold && s.rowLabelBold]}>{label}</Text>
      <Text style={[s.rowValue, bold && s.rowValueBold]}>{value}</Text>
    </View>
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
  chev: { fontSize: 28, lineHeight: 28, color: BLACK, marginTop: Platform.OS === "android" ? -2 : 0 },
  backText: { fontSize: 16, color: BLACK, fontWeight: "500" },

  rule: { height: 1, backgroundColor: LINE, marginBottom: 10 },
  sep: { height: 1, backgroundColor: LINE },

  title: { color: BLACK, fontSize: 18, fontWeight: "900" },
  meta: { color: "rgba(0,0,0,0.7)", fontWeight: "700" },
  note: { color: "rgba(0,0,0,0.8)", fontWeight: "600" },

  row: {
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  itemName: { color: BLACK, fontSize: 15, fontWeight: "900" },
  itemMeta: { color: "rgba(0,0,0,0.65)", fontWeight: "700", marginTop: 4 },
  itemTotal: { color: BLACK, fontWeight: "900" },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: WHITE,
    gap: 8,
  },
  footerRule: { height: 1, backgroundColor: LINE, marginBottom: 8 },

  rowLabel: { color: "rgba(0,0,0,0.7)", fontWeight: "700" },
  rowLabelBold: { color: BLACK, fontWeight: "900" },
  rowValue: { color: BLACK, fontWeight: "800" },
  rowValueBold: { fontWeight: "900" },

  primaryBtn: {
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BLACK,
  },
  primaryBtnText: { color: WHITE, fontWeight: "900", fontSize: 18 },
});