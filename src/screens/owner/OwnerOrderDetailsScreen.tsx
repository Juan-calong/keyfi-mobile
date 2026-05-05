// screens/owner/OwnerOrderDetailsScreen.tsx
import React, { useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, StatusBar, TextInput } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { Loading, ErrorState } from "../../ui/components/State";

import { OrdersService } from "../../core/api/services/orders.service";
import { PaymentsService } from "../../core/api/services/payments.service";
import type { ActivePaymentEnvelope } from "../../core/api/services/payments.types";
import { OWNER_SCREENS } from "../../navigation/owner.routes";

import { IosAlert } from "../../ui/components/IosAlert";
import { RefundRequestsService } from "../../core/api/services/refundRequests.service";
import { REFUND_REASON_LABELS, REFUND_STATUS_LABELS, type RefundRequestReason } from "../../core/api/services/refundRequests.types";
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

const CARD_FAILED_STATUSES = ["FAILED", "CANCELED", "REJECTED", "DECLINED"];

export function OwnerOrderDetailsScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();

    const orderId = (route.params?.orderId || route.params?.id) as string | undefined;

  const [modal, setModal] = useState<null | { title: string; message: string }>(null);
  const [refundReason, setRefundReason] = useState<RefundRequestReason>("PRODUCT_DAMAGED");
  const [refundDescription, setRefundDescription] = useState("");

  const payLock = useRef(false);
  const didNavigateSuccessRef = useRef(false);

  const q = useQuery({
    queryKey: ["owner-order-detail", orderId],
    retry: false,
    queryFn: () => OrdersService.byId(orderId!),
    enabled: !!orderId,
  });

  const data: any = q.data;

    const refundRequestsQ = useQuery({
    queryKey: ["refund-requests", "me"],
    enabled: !!orderId,
    queryFn: () => RefundRequestsService.listMine(),
  });
  const refundRequest = useMemo(() => (refundRequestsQ.data || []).find((r: any) => r.orderId === orderId), [refundRequestsQ.data, orderId]);

    const activePaymentQ = useQuery<ActivePaymentEnvelope | any>({
    queryKey: ["owner-order-active-payment", orderId],
    enabled: !!orderId,
    retry: false,
    queryFn: () => PaymentsService.active(orderId!),
  });
  const activePayment = activePaymentQ.data as ActivePaymentEnvelope | undefined;

    React.useEffect(() => {
  if (data?.items) {
    console.log("[ORDER_DETAIL_ITEMS]", JSON.stringify(data.items, null, 2));
  }
}, [data?.items]);

  const paymentStatus = useMemo(() => normalizeStatus(data?.paymentStatus), [data?.paymentStatus]);
  const status = useMemo(() => normalizeStatus(data?.status), [data?.status]);
  const approval = useMemo(() => normalizeStatus(data?.adminApprovalStatus), [data?.adminApprovalStatus]);
    const paymentMethod = normalizeStatus(activePayment?.payment?.method);
  const paymentProvider = normalizeStatus(activePayment?.payment?.provider);
  const activePaymentStatus = normalizeStatus(activePayment?.payment?.status);
  const nextActionStatusDetail = String((activePayment?.nextAction as any)?.statusDetail ?? "").trim();
  const isMercadoPagoCard = paymentMethod === "CARD" && paymentProvider === "MERCADOPAGO";
  const showCardRejected = isMercadoPagoCard && CARD_FAILED_STATUSES.includes(activePaymentStatus);
  const showCardManualReview = isMercadoPagoCard && activePaymentStatus === "PENDING" && nextActionStatusDetail === "pending_review_manual";


    React.useEffect(() => {
    const shouldShow = route.params?.showPaymentSuccessOnPaid === true;
    if (!shouldShow || paymentStatus !== "PAID" || didNavigateSuccessRef.current || !orderId) return;

    didNavigateSuccessRef.current = true;
    nav.replace(OWNER_SCREENS.PaymentSuccess, {
      orderId,
      orderCode: data?.code || data?.orderCode || data?.number,
      total: data?.totalAmount || data?.amountDue || data?.amount,
    });
  }, [route.params?.showPaymentSuccessOnPaid, paymentStatus, nav, orderId, data]);


  React.useEffect(() => {
    const payment = activePayment?.payment;
    const nextAction = activePayment?.nextAction as any;
    const flags = activePayment?.flags;
    console.log("[ORDER_DETAILS][PAYMENT_ACTIVE]", {
      orderId: orderId || null,
      hasPayment: Boolean(payment),
      paymentProvider: payment?.provider || null,
      paymentMethod: payment?.method || null,
      paymentStatus: payment?.status || null,
      hasExternalId: Boolean(payment?.externalId),
      nextActionStatusDetail: nextAction?.statusDetail || null,
      uiCode: activePayment?.ui?.code || null,
      "flags.canRetry": flags?.canRetry,
      "flags.shouldPoll": flags?.shouldPoll,
    });
  }, [activePayment, orderId]);

    const createRefundMut = useMutation({
    mutationFn: () => RefundRequestsService.create(orderId!, { reason: refundReason, description: refundDescription.trim() || undefined }),
    onSuccess: () => {
      setRefundDescription("");
      setModal({ title: "Solicitação enviada", message: "Sua solicitação de reembolso foi registrada para análise." });
      refundRequestsQ.refetch();
    },
    onError: (e: any) => {
      const code = String(
        e?.response?.data?.code ||
        e?.response?.data?.error ||
        e?.message ||
        ""
      ).toUpperCase();
      const map: Record<string, string> = {
        ORDER_NOT_DELIVERED: "Este pedido ainda não foi marcado como entregue.",
        POST_DELIVERY_WINDOW_EXPIRED: "O prazo de 7 dias para solicitar reembolso terminou.",
        ORDER_NOT_PAID: "Este pedido ainda não está pago.",
        ORDER_CANCELED: "Este pedido foi cancelado.",
        ORDER_ALREADY_REFUNDED_OR_PENDING: "Este pedido já possui reembolso em andamento ou concluído.",
        COMMISSION_ALREADY_AVAILABLE_OR_PAID: "O prazo de reembolso terminou.",
        ORDER_NOT_OWNED: "Você não tem permissão para solicitar reembolso deste pedido.",
        OPEN_REQUEST_ALREADY_EXISTS: "Já existe uma solicitação de reembolso aberta para este pedido.",
      };
      setModal({ title: "Não foi possível solicitar", message: map[code] || friendlyError(e).message });
    },
  });

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
    onSuccess: () => nav.navigate(OWNER_SCREENS.PixPayment, { orderId }),
    onError: (e: any) => {
      const fe: any = friendlyError(e);

      if (fe?.status === 429 && fe?.retryAfterSec) {
        setModal({ title: "Muitas tentativas", message: `Tente novamente em ${formatCooldown(fe.retryAfterSec)}.` });
        return;
      }

      setModal({ title: String(fe?.title || "Erro"), message: String(fe?.message || "Não foi possível iniciar o pagamento.") });
    },
  });

    const deliveredLike = Boolean(data?.localDelivery?.deliveredAt || data?.shipment?.deliveredAt) || ["DELIVERED", "COMPLETED"].includes(status);
  const blockedOrder = ["CANCELED", "REFUNDED"].includes(status);
  const refundStatus = String(refundRequest?.status || "").toUpperCase();
  const hasOpenRequest = ["REQUESTED", "UNDER_REVIEW", "APPROVED"].includes(refundStatus);
  const hasCompletedRefund = refundStatus === "REFUNDED";
  const canRequestRefund =
    deliveredLike &&
    paymentStatus === "PAID" &&
    !blockedOrder &&
    !hasOpenRequest &&
    !hasCompletedRefund;

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
              {showCardRejected || showCardManualReview ? (
                <View style={m.paymentAlert}>
                  <Text style={m.paymentAlertTitle}>{showCardRejected ? "Pagamento com cartão recusado" : "Pagamento em análise"}</Text>
                  <Text style={m.paymentAlertMessage}>
                    {showCardRejected
                      ? activePayment?.ui?.message || "O Mercado Pago recusou a tentativa de pagamento. Você pode tentar outro cartão ou pagar com PIX."
                      : activePayment?.ui?.message || "O Mercado Pago recebeu sua tentativa e está analisando a transação."}
                  </Text>
                  {activePayment?.payment?.externalId ? (
                    <Text style={m.paymentAlertMeta}>Transação Mercado Pago: {activePayment.payment.externalId}</Text>
                  ) : null}
                </View>
              ) : null}

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
                  {showCardRejected ? <Text style={m.helperText}>Você ainda pode pagar com PIX ou tentar outro cartão.</Text> : null}
                  {showCardManualReview && activePayment?.flags?.canRetry === false ? (
                    <Text style={m.helperText}>Seu pagamento com cartão está em análise. Aguarde antes de tentar novamente.</Text>
                  ) : null}
                </View>
              ) : null}

              <View style={[m.hairline, { marginVertical: 18 }]} />

                            <Text style={m.sectionTitle}>Solicitação de reembolso</Text>
              <View style={{ marginTop: 12, gap: 8 }}>
                {refundRequest ? (
                  <View style={m.refundBox}>
                    <Text style={m.kvVal}>Status: {REFUND_STATUS_LABELS[String(refundRequest.status).toUpperCase()] || refundRequest.status}</Text>
                    <Text style={m.kvKey}>Motivo: {REFUND_REASON_LABELS[String(refundRequest.reason).toUpperCase()] || refundRequest.reason}</Text>
                    {refundRequest.description ? <Text style={m.kvKey}>Descrição: {refundRequest.description}</Text> : null}
                    {refundRequest.requestedAt ? <Text style={m.kvKey}>Solicitado em: {formatDateTime(refundRequest.requestedAt)}</Text> : null}
                    {refundRequest.adminNote ? <Text style={m.kvKey}>Resposta: {refundRequest.adminNote}</Text> : null}
                  </View>
                ) : null}

                {canRequestRefund ? (
                  <View style={m.refundBox}>
                    <Text style={m.kvKey}>Você pode solicitar reembolso até 7 dias após a entrega.</Text>
                    <View style={m.reasonRow}>
                      {(Object.keys(REFUND_REASON_LABELS) as RefundRequestReason[]).map((reason) => (
                        <Pressable key={reason} onPress={() => setRefundReason(reason)} style={[m.reasonPill, refundReason === reason && m.reasonPillActive]}>
                          <Text style={m.reasonPillText}>{REFUND_REASON_LABELS[reason]}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <TextInput placeholder="Descrição (opcional)" value={refundDescription} onChangeText={setRefundDescription} multiline style={m.refundInput} />
                    <Pressable onPress={() => createRefundMut.mutate()} disabled={createRefundMut.isPending} style={[m.ctaBtn, { marginTop: 10 }]}>
                      <Text style={m.ctaText}>{createRefundMut.isPending ? "..." : "Enviar solicitação"}</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>

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

    helperText: { marginTop: 6, textAlign: "center", color: "#334155", fontSize: 12, fontWeight: "600" },
  paymentAlert: { marginTop: 14, borderWidth: 1, borderColor: "#FCD34D", backgroundColor: "#FFFBEB", borderRadius: 12, padding: 12 },
  paymentAlertTitle: { fontSize: 14, fontWeight: "900", color: "#92400E" },
  paymentAlertMessage: { marginTop: 6, fontSize: 13, lineHeight: 19, color: "#78350F" },
  paymentAlertMeta: { marginTop: 6, fontSize: 12, color: "#92400E", fontWeight: "700" },

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

    refundBox: { borderWidth: 1, borderColor: "rgba(0,0,0,0.12)", borderRadius: 12, padding: 12, gap: 6 },
  reasonRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  reasonPill: { borderWidth: 1, borderColor: "rgba(0,0,0,0.2)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  reasonPillActive: { backgroundColor: "#E2E8F0", borderColor: "#94A3B8" },
  reasonPillText: { fontSize: 12, fontWeight: "700", color: "#0F172A" },
  refundInput: { marginTop: 10, borderWidth: 1, borderColor: "rgba(0,0,0,0.15)", borderRadius: 10, minHeight: 70, paddingHorizontal: 10, paddingVertical: 8, textAlignVertical: "top" },
});