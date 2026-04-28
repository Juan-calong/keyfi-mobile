import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, StatusBar } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { Loading, ErrorState } from "../../ui/components/State";

import { OrdersService } from "../../core/api/services/orders.service";
import { PaymentsService } from "../../core/api/services/payments.service";
import { OWNER_SCREENS } from "../../navigation/owner.routes";

import { IosAlert } from "../../ui/components/IosAlert";
import { friendlyError } from "../../core/errors/friendlyError";
import { AppBackButton } from "../../ui/components/AppBackButton";

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

function normalizeStatus(v: any) {
  return String(v ?? "").toUpperCase().trim();
}

function statusLabel(text: string) {
  const up = normalizeStatus(text);

  if (up === "PAID") return "Pago";
  if (up === "PENDING") return "Pendente";
  if (up === "APPROVED") return "Aprovado";
  if (up === "CREATED") return "Criado";
  if (up === "CANCELED") return "Cancelado";
  if (up === "FAILED") return "Falhou";
  if (up === "EXPIRED") return "Expirado";
  if (up === "SHIPPED") return "Enviado";
  if (up === "COMPLETED") return "Concluído";

  return up || "—";
}

function statusColors(text: string) {
  const up = normalizeStatus(text);

  if (up === "PAID" || up === "APPROVED" || up === "COMPLETED" || up === "SHIPPED") {
    return {
      bg: "#DCFCE7",
      border: "#86EFAC",
      text: "#166534",
    };
  }

  if (up === "PENDING" || up === "CREATED") {
    return {
      bg: "#FEF3C7",
      border: "#FCD34D",
      text: "#92400E",
    };
  }

  if (up === "CANCELED" || up === "FAILED" || up === "EXPIRED") {
    return {
      bg: "#FFE4E6",
      border: "#FDA4AF",
      text: "#BE123C",
    };
  }

  return {
    bg: "#F1F5F9",
    border: "#CBD5E1",
    text: "#334155",
  };
}

function PillStatus({ text }: { text: string }) {
  const c = statusColors(text);

  return (
    <View style={[m.pill, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[m.pillText, { color: c.text }]}>{statusLabel(text)}</Text>
    </View>
  );
}

function ItemTitle(it: any, idx: number) {
  const title =
    it?.product?.name ||
    it?.product?.title ||
    it?.productSnapshot?.name ||
    it?.productSnapshot?.title ||
    it?.snapshot?.name ||
    it?.snapshot?.title ||
    it?.productName ||
    it?.productTitle ||
    it?.name ||
    it?.title ||
    it?.skuName ||
    "";

  const cleaned = String(title || "").trim();

  if (cleaned) return cleaned;
  if (it?.sku) return `SKU ${it.sku}`;

  return `Item ${idx + 1}`;
}

export function OwnerOrderDetailsScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();

  const [modal, setModal] = useState<null | { title: string; message: string }>(null);

  const orderId: string | undefined = route.params?.orderId || route.params?.id;

  const q = useQuery({
    queryKey: ["owner-order-detail", orderId],
    queryFn: () => OrdersService.byId(orderId!),
    enabled: !!orderId,
  });

  const data: any = q.data;

  const paymentStatus = useMemo(() => normalizeStatus(data?.paymentStatus), [data?.paymentStatus]);
  const status = useMemo(() => normalizeStatus(data?.status), [data?.status]);
  const approval = useMemo(() => normalizeStatus(data?.adminApprovalStatus), [data?.adminApprovalStatus]);

  const canPay = useMemo(() => {
    if (!paymentStatus) return false;
    if (paymentStatus === "PAID") return false;
    if (paymentStatus === "CANCELED") return false;
    return true;
  }, [paymentStatus]);

  const intentMut = useMutation({
    mutationFn: async () => {
      await PaymentsService.intentPIX(orderId!);
      return PaymentsService.active(orderId!);
    },
    onSuccess: () => {
      nav.navigate(OWNER_SCREENS.PixPayment, { orderId });
    },
    onError: (e: any) => {
      const fe = friendlyError(e);
      setModal({
        title: fe.title || "Erro",
        message: fe.message || (e?.response?.data?.error ? String(e.response.data.error) : "Falha ao criar intent."),
      });
    },
  });

  return (
    <Screen>
      <Container style={{ flex: 1, paddingTop: 6 }}>
        {Platform.OS === "android" ? <View style={{ height: StatusBar.currentHeight ?? 0 }} /> : null}

        {/* NAV (iOS-like) */}
<View style={m.nav}>
  <View style={m.navSide}>
    <AppBackButton
      onPress={() => nav.goBack()}
      showLabel={false}
      color="#000000"
      iconSize={24}
      style={m.backBtn}
    />
  </View>

  <Text style={m.navTitle}>Pedido</Text>

  <Pressable hitSlop={12} onPress={() => q.refetch()} style={m.rightBtn}>
    <Text style={m.rightText}>{q.isRefetching ? "…" : "⟳"}</Text>
  </Pressable>
</View>

        <View style={m.hairline} />

        {q.isLoading ? (
          <View style={{ marginTop: 14 }}>
            <Loading />
          </View>
        ) : q.isError ? (
          <View style={{ marginTop: 14 }}>
            <ErrorState onRetry={() => q.refetch()} />
          </View>
        ) : !data ? null : (
          <>
            <ScrollView contentContainerStyle={m.scroll} showsVerticalScrollIndicator={false}>
              <Text style={m.h1}>Detalhes do pedido</Text>

              <View style={{ marginTop: 14 }}>
                <View style={m.kvRow}>
                  <Text style={m.kvKey}>Código</Text>
                  <Text style={m.kvVal}>#{data.code ?? String(orderId).slice(0, 8)}</Text>
                </View>

                <View style={m.kvRow}>
                  <Text style={m.kvKey}>Criado</Text>
                  <Text style={m.kvVal}>{data.createdAt ? formatDateTime(data.createdAt) : "—"}</Text>
                </View>

                <View style={m.kvRow}>
                  <Text style={[m.kvKey, m.bold]}>Total</Text>
                  <Text style={[m.kvVal, m.bold]}>{formatBRL(data.totalAmount)}</Text>
                </View>
              </View>

              <View style={[m.hairline, { marginVertical: 18 }]} />

              <Text style={m.sectionTitle}>Status</Text>

<View style={m.pillsRow}>
  {status ? <PillStatus text={status} /> : null}
  {paymentStatus ? <PillStatus text={paymentStatus} /> : null}
  {approval && approval !== "UNDEFINED" ? <PillStatus text={approval} /> : null}
</View>

              {canPay ? (
                <View style={{ marginTop: 14 }}>
                  <Pressable
                    onPress={() => intentMut.mutate()}
                    disabled={intentMut.isPending}
                    style={({ pressed }) => [
                      m.ctaBtn,
                      pressed && { opacity: 0.85 },
                      intentMut.isPending && { opacity: 0.6 },
                    ]}
                  >
                    <Text style={m.ctaText}>{intentMut.isPending ? "..." : "Pagar com PIX"}</Text>
                  </Pressable>

                  <Text style={m.secure}>Pagamento seguro</Text>
                </View>
              ) : null}

              <View style={[m.hairline, { marginVertical: 18 }]} />

              <Text style={m.sectionTitle}>Itens</Text>

              <View style={{ marginTop: 12 }}>
                {(data.items ?? []).length > 0 ? (data.items ?? []).map((it: any, idx: number) => {
                  const title = ItemTitle(it, idx);
                  const qty = Number(it.qty ?? 0);
                  const unit = it.unitPrice ?? it.price ?? 0;
                  const subtotal = it.total ?? qty * Number(unit || 0);

                  return (
                    <View key={it.id ?? `${idx}`} style={m.itemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={m.itemTitle}>{title}</Text>
                        <Text style={m.itemMeta}>
                          {qty}x • {formatBRL(unit)} • subtotal {formatBRL(subtotal)}
                        </Text>
                      </View>
                      <Text style={m.itemRight}>{formatBRL(subtotal)}</Text>
                    </View>
                  );
                }) : (
                  <Text style={m.itemEmpty}>Nenhum item retornado para este pedido.</Text>
                )}
              </View>

              <View style={{ height: 24 }} />
              <View style={{ height: 24 }} />
            </ScrollView>

            <View style={{ height: 8 }} />
          </>
        )}
      </Container>

      <IosAlert visible={!!modal} title={modal?.title} message={modal?.message} onClose={() => setModal(null)} />
    </Screen>
  );
}

const HPAD = 20;

const m = StyleSheet.create({
nav: {
  height: 52,
  paddingHorizontal: HPAD,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
},
navSide: {
  minWidth: 64,
  height: 44,
  justifyContent: "center",
},
backBtn: {
  minWidth: 44,
  minHeight: 44,
  paddingRight: 0,
},
  backText: { color: "#000000", fontSize: 22, fontWeight: "800", letterSpacing: -0.2 },
  navTitle: { color: "#000000", fontSize: 17, fontWeight: "900", letterSpacing: -0.2 },
  rightBtn: { minWidth: 64, height: 44, alignItems: "flex-end", justifyContent: "center" },
  rightText: { color: "#000000", fontSize: 16, fontWeight: "900" },

  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(0,0,0,0.18)", width: "100%" },

  scroll: { paddingTop: 16, paddingHorizontal: HPAD, paddingBottom: 18 },

  h1: { color: "#000000", fontSize: 18, fontWeight: "900", letterSpacing: -0.2 },

  sectionTitle: { color: "#000000", fontSize: 16, fontWeight: "900", letterSpacing: -0.2 },

  kvRow: { marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  kvKey: { color: "#000000", fontSize: 14, fontWeight: "600", opacity: 0.75 },
  kvVal: { color: "#000000", fontSize: 14, fontWeight: "800" },
  bold: { fontWeight: "900" },

  pillsRow: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  
pill: {
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 999,
  borderWidth: 1,
},

pillText: {
  fontSize: 11,
  fontWeight: "900",
  letterSpacing: -0.1,
},

  ctaBtn: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  ctaText: { color: "#000000", fontSize: 16, fontWeight: "900", letterSpacing: -0.2 },
  secure: {
    marginTop: 10,
    textAlign: "center",
    color: "#000000",
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.75,
  },

  itemRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.18)",
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  itemTitle: { color: "#000000", fontSize: 14, fontWeight: "900", letterSpacing: -0.1 },
  itemMeta: { marginTop: 4, color: "#000000", fontSize: 12, fontWeight: "600", opacity: 0.75, lineHeight: 16 },
  itemRight: { color: "#000000", fontSize: 13, fontWeight: "900", marginTop: 2 },
  itemEmpty: { color: "#000000", fontSize: 13, fontWeight: "700", opacity: 0.65 },
});