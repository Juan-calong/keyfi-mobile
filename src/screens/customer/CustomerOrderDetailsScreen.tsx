// screens/customer/CustomerOrderDetailsScreen.tsx
import React, { useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, StatusBar } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { Loading, ErrorState } from "../../ui/components/State";

import { OrdersService } from "../../core/api/services/orders.service";
import { PaymentsService } from "../../core/api/services/payments.service";
import { CUSTOMER_SCREENS } from "../../navigation/customer.routes";

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

function ItemTitle(it: any) {
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
    it?.title;

  const cleaned = String(title || "").trim();

  return cleaned || "Produto sem nome";
}

function formatCooldown(retryAfterSec?: number | null) {
  const s = Math.max(0, Number(retryAfterSec || 0) | 0);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  if (mm <= 0) return `${ss}s`;
  return `${mm}m ${String(ss).padStart(2, "0")}s`;
}

export function CustomerOrderDetailsScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();

  const orderId = (route.params?.orderId || route.params?.id) as string | undefined;

  const [modal, setModal] = useState<null | { title: string; message: string }>(null);

  // banner inline (não bloqueante)
  const [banner, setBanner] = useState<null | { title: string; message: string }>(null);
  const [bannerKey, setBannerKey] = useState(0);
  function showBanner(title: string, message: string) {
    setBannerKey((k) => k + 1);
    setBanner({ title, message });
  }
  React.useEffect(() => {
    if (!banner) return;
    const tmr = setTimeout(() => setBanner(null), 3500);
    return () => clearTimeout(tmr);
  }, [bannerKey]);

  const payLock = useRef(false);

  const q = useQuery({
    queryKey: ["customer-order-detail", orderId],
    enabled: !!orderId,
    retry: false,
    queryFn: () => OrdersService.byId(orderId!),
  });

  const data: any = q.data;

  React.useEffect(() => {
  if (data?.items) {
    console.log("[ORDER_DETAIL_ITEMS]", JSON.stringify(data.items, null, 2));
  }
}, [data?.items]);

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
      if (!orderId) throw new Error("orderId ausente");
      await PaymentsService.intentPIX(orderId);
      return PaymentsService.active(orderId);
    },
    onSuccess: () => nav.navigate(CUSTOMER_SCREENS.PixPayment, { orderId }),
    onError: (e: any) => {
      const fe: any = friendlyError(e);

      if (fe?.status === 429 && fe?.retryAfterSec) {
        setModal({ title: "Muitas tentativas", message: `Tente novamente em ${formatCooldown(fe.retryAfterSec)}.` });
        return;
      }

      setModal({ title: String(fe?.title || "Erro"), message: String(fe?.message || "Não foi possível iniciar o pagamento.") });
    },
  });

  const onPay = () => {
    if (payLock.current) return;
    payLock.current = true;

    try {
      intentMut.mutate();
    } finally {
      setTimeout(() => {
        payLock.current = false;
      }, 350);
    }
  };

  return (
    <Screen>
      <Container style={{ flex: 1, paddingTop: 6 }}>
        {Platform.OS === "android" ? <View style={{ height: StatusBar.currentHeight ?? 0 }} /> : null}

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

        {banner ? (
          <View style={m.bannerWrap}>
            <View style={m.bannerCard}>
              <View style={{ flex: 1 }}>
                <Text style={m.bannerTitle}>{banner.title}</Text>
                <Text style={m.bannerMsg}>{banner.message}</Text>
              </View>

              <Pressable onPress={() => setBanner(null)} hitSlop={10} style={({ pressed }) => [m.bannerBtn, pressed && { opacity: 0.6 }]}>
                <Text style={m.bannerBtnText}>OK</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

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
                    onPress={onPay}
                    disabled={intentMut.isPending}
                    style={({ pressed }) => [m.ctaBtn, pressed && { opacity: 0.85 }, intentMut.isPending && { opacity: 0.6 }]}
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
                  const title = ItemTitle(it);
                  const qty = Number(it.qty ?? 0);
                  const unit = it.unitPrice ?? it.price ?? 0;
                  const subtotal =
                    it.lineTotal ??
                    it.total ??
                    it.lineFinal ??
                    qty * Number(unit || 0);

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

        <IosAlert visible={!!modal} title={modal?.title} message={modal?.message} onClose={() => setModal(null)} />
      </Container>
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
  navTitle: { color: "#000000", fontSize: 17, fontWeight: "900", letterSpacing: -0.2 },
  rightBtn: { minWidth: 64, height: 44, alignItems: "flex-end", justifyContent: "center" },
  rightText: { color: "#000000", fontSize: 16, fontWeight: "900" },

  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(0,0,0,0.18)", width: "100%" },

  // banner inline (auto-hide)
  bannerWrap: { paddingHorizontal: HPAD, paddingTop: 10 },
  bannerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
  },
  bannerTitle: { color: "#0F172A", fontSize: 13, fontWeight: "900", letterSpacing: -0.2 },
  bannerMsg: { marginTop: 2, color: "#334155", fontSize: 12, fontWeight: "700", lineHeight: 16 },
  bannerBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(0,0,0,0.10)" },
  bannerBtnText: { color: "#0B63F6", fontSize: 12, fontWeight: "900", letterSpacing: -0.2 },

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

  ctaBtn: { height: 54, borderRadius: 14, borderWidth: 1, borderColor: "#000000", alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  ctaText: { color: "#000000", fontSize: 16, fontWeight: "900", letterSpacing: -0.2 },
  secure: { marginTop: 10, textAlign: "center", color: "#000000", fontSize: 12, fontWeight: "600", opacity: 0.75 },

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