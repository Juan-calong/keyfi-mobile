import React, { useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform, StatusBar, ScrollView, Image } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { Card } from "../../ui/components/Card";
import { Button } from "../../ui/components/Button";
import { Loading, ErrorState } from "../../ui/components/State";
import { t } from "../../ui/tokens";

import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";

import { PixPaymentSheet } from "../payments/PixPaymentsSheet";
import { BoletoPaymentSheet } from "../payments/BoletoPaymentSheet";
import { CardPaymentSheet } from "../payments/CardPaymentSheet";

import { OWNER_SCREENS } from "../../navigation/owner.routes";

import { IosAlert } from "../../ui/components/IosAlert";
import { friendlyError } from "../../core/errors/friendlyError";
import { PaymentsService } from "../../core/api/services/payments.service";

type Method = "PIX" | "BOLETO" | "CARD";

function normalizeUrl(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(raw)) return `https://${raw}`;
  return null;
}

function StatusCard({ env, onRefresh }: { env: any; onRefresh: () => void }) {
  const payment = env?.payment ?? null;
  const method = String(payment?.method ?? "").toUpperCase();
  const status = String(payment?.status ?? "").toUpperCase();
  const message = String(env?.ui?.message || "Aguardando atualização…");

  const tone =
    status === "PAID" || status === "APPROVED"
      ? "success"
      : status === "FAILED" || status === "REJECTED" || status === "CANCELED" || status === "CANCELLED"
      ? "danger"
      : "warning";

  return (
    <Card style={{ padding: 14, borderRadius: 18, gap: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 15 }}>Status do pagamento</Text>
          <Text style={{ color: t.colors.text2, fontWeight: "800", marginTop: 6 }}>{message}</Text>
        </View>

        <View style={{ alignItems: "flex-end", gap: 8 }}>
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: t.colors.surface2,
              borderWidth: 1,
              borderColor: t.colors.border,
            }}
          >
            <Text style={{ color: t.colors.text2, fontWeight: "900", fontSize: 11 }}>{method || "—"}</Text>
          </View>

          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor:
                tone === "success"
                  ? "rgba(16,185,129,0.12)"
                  : tone === "danger"
                  ? "rgba(225,29,72,0.12)"
                  : "rgba(245,158,11,0.12)",
              borderWidth: 1,
              borderColor:
                tone === "success"
                  ? "rgba(16,185,129,0.28)"
                  : tone === "danger"
                  ? "rgba(225,29,72,0.28)"
                  : "rgba(245,158,11,0.28)",
            }}
          >
            <Text
              style={{
                color: tone === "success" ? t.colors.success : tone === "danger" ? t.colors.danger : t.colors.warning,
                fontWeight: "900",
                fontSize: 11,
              }}
            >
              {status || "—"}
            </Text>
          </View>
        </View>
      </View>

      <Button title="Atualizar status" variant="ghost" onPress={onRefresh} style={{ height: 44, borderRadius: 14 }} />
    </Card>
  );
}

function PaymentRow({
  title,
  subtitle,
  selected,
  onPress,
  icon,
}: {
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
  icon: React.ReactNode;
}) {
  return (
    <View style={{ marginTop: 14 }}>
      <Pressable onPress={onPress} style={({ pressed }) => [m.option, selected && m.optionSelected, pressed && { opacity: 0.96 }]}>
        <View style={m.iconOnly}>{icon}</View>

        <View style={{ flex: 1 }}>
          <Text style={m.optionTitle}>{title}</Text>
          <Text style={m.optionSub} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

        <View style={m.rightWrap}>
          {selected ? (
            <View style={m.checkCircle}>
              <Text style={m.checkText}>✓</Text>
            </View>
          ) : (
            <View style={m.radioCircle} />
          )}
        </View>
      </Pressable>
    </View>
  );
}

export function OwnerPixPaymentScreen({ route }: any) {
  const navigation = useNavigation<any>();
  const orderId: string | undefined = route?.params?.orderId || route?.params?.id;

  const [selected, setSelected] = useState<Method>("PIX");
  const continueLock = useRef(false);

  const [modal, setModal] = useState<null | { title: string; message: string }>(null);

  if (!orderId) {
    return (
      <Screen>
        <Container>
          <Text style={{ color: t.colors.danger, fontWeight: "900" }}>orderId ausente.</Text>
        </Container>
        <IosAlert visible={true} title="Erro" message="orderId ausente." onClose={() => navigation.goBack?.()} />
      </Screen>
    );
  }

  const activeQ = useQuery({
    queryKey: ["owner-pay-active", orderId],
    queryFn: async () => (await api.get(endpoints.payments.active(orderId))).data,
    retry: false,
    staleTime: 0,
    refetchInterval: (q) => {
      const env = q.state.data as any;
      if (!env) return false;

      const status = String(env?.payment?.status ?? "").toUpperCase();
      const finalStatuses = ["PAID", "APPROVED", "REJECTED", "FAILED", "CANCELED", "CANCELLED", "EXPIRED"];

      if (finalStatuses.includes(status)) return false;
      return env?.flags?.shouldPoll ? 2500 : false;
    },
  });

  const env = activeQ.data;
  const payment = env?.payment ?? null;

  const hasPayment =
    !!payment?.id ||
    !!payment?.externalId ||
    !!payment?.method ||
    !!env?.nextAction;

  const method = String(payment?.method ?? "").toUpperCase();

  const createPixMut = useMutation({
    mutationFn: async () => (await api.post(endpoints.payments.intent(orderId), { method: "PIX" })).data,
    onSuccess: async () => activeQ.refetch(),
    onError: (e: any) => {
      const fe = friendlyError(e);
      setModal({
        title: fe.title || "Erro",
        message: fe.message || "Falha ao criar PIX.",
      });
    },
  });

  const onContinue = async () => {
    if (continueLock.current) return;
    continueLock.current = true;

    try {
      if (hasPayment) return;

      if (selected === "PIX") {
        createPixMut.mutate();
        return;
      }

      if (selected === "BOLETO") {
        navigation.navigate(OWNER_SCREENS.BoletoPayerForm, { orderId });
        return;
      }

      const methods = await PaymentsService.getPaymentMethods();
      if (methods?.card?.provider === "MERCADOPAGO") {
        navigation.navigate(OWNER_SCREENS.MercadoPagoCardEntry, {
          orderId,
          amount: Number(payment?.amount || env?.order?.amountDue || env?.order?.totalAmount || 0),
          publicKey: methods?.card?.publicKey ?? null,
        });
        return;
      }
      navigation.navigate(OWNER_SCREENS.CardTokenize, {
        orderId,
        successRouteName: OWNER_SCREENS.CardEntry,
        cancelRouteName: OWNER_SCREENS.PixPayment,
        cancelParams: { orderId },
      });
    } finally {
      setTimeout(() => (continueLock.current = false), 350);
    }
  };

  const headerSubtitle = useMemo(() => {
    return env?.ui?.message ? String(env.ui.message) : "";
  }, [env?.ui?.message]);

  const boletoUrl = useMemo(() => {
    const na = env?.nextAction;
    return normalizeUrl(na?.ticketUrl || na?.url || na?.ticket_url || null);
  }, [env?.nextAction]);

  return (
    <Screen>
      <Container style={{ flex: 1, paddingTop: 6 }}>
        {Platform.OS === "android" ? <View style={{ height: StatusBar.currentHeight ?? 0 }} /> : null}

        <View style={m.header}>
          <View style={{ flex: 1 }}>
            <Text style={m.h1}>Métodos de pagamento</Text>
            {headerSubtitle ? <Text style={m.sub}>{headerSubtitle}</Text> : null}
          </View>

          <Pressable onPress={() => activeQ.refetch()} hitSlop={12} style={({ pressed }) => [m.refreshBtn, pressed && { opacity: 0.85 }]}>
            <Text style={m.refreshTxt}>{activeQ.isRefetching ? "…" : "⟳"}</Text>
          </Pressable>
        </View>

        <View style={m.hairline} />

        {activeQ.isLoading ? (
          <View style={{ marginTop: 14 }}>
            <Loading />
          </View>
        ) : activeQ.isError ? (
          <View style={{ marginTop: 14 }}>
            <ErrorState onRetry={() => activeQ.refetch()} />
          </View>
        ) : !env ? null : (
          <>
            {!hasPayment ? (
              <>
                <ScrollView contentContainerStyle={m.scroll} showsVerticalScrollIndicator={false}>
                  <Text style={m.sectionTitle}>Escolha uma forma de pagamento</Text>

                  <PaymentRow
                    title="PIX"
                    subtitle="Aprovação instantânea"
                    selected={selected === "PIX"}
                    onPress={() => setSelected("PIX")}
                    icon={<Image source={require("../../assets/payments/pix.png")} style={{ width: 36, height: 36, resizeMode: "contain" }} />}
                  />

                  <PaymentRow
                    title="Boleto"
                    subtitle="Em até 2 dias úteis"
                    selected={selected === "BOLETO"}
                    onPress={() => setSelected("BOLETO")}
                    icon={<Image source={require("../../assets/payments/boleto.png")} style={{ width: 36, height: 36, resizeMode: "contain" }} />}
                  />

                  <PaymentRow
                    title="Cartão"
                    subtitle="Crédito ou débito"
                    selected={selected === "CARD"}
                    onPress={() => setSelected("CARD")}
                    icon={<Image source={require("../../assets/payments/card.png")} style={{ width: 36, height: 36, resizeMode: "contain" }} />}
                  />

                  <View style={{ height: 130 }} />
                </ScrollView>

                <View style={m.ctaWrap}>
                  <View style={m.hairline} />
                  <View style={m.secureRow}>
                    <Text style={m.lockIcon}>🔒</Text>
                    <Text style={m.secureText}>Pagamento seguro</Text>
                  </View>

                  <Pressable
                    onPress={onContinue}
                    disabled={createPixMut.isPending}
                    style={({ pressed }) => [
                      m.ctaBtn,
                      pressed && { opacity: 0.92, transform: [{ scale: 0.995 }] },
                      createPixMut.isPending && { opacity: 0.6 },
                    ]}
                  >
                    <Text style={m.ctaText}>{createPixMut.isPending ? "..." : "Continuar"}</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <ScrollView
  style={{ marginTop: 14 }}
  contentContainerStyle={{ gap: 12, paddingBottom: 28 }}
  showsVerticalScrollIndicator={false}
>
                <StatusCard env={env} onRefresh={() => activeQ.refetch()} />

                {method === "PIX" ? (
                  <PixPaymentSheet envelope={env} />
                ) : method === "BOLETO" ? (
                  <>
                    <BoletoPaymentSheet envelope={env} />
                    {boletoUrl ? (
                      <Pressable
                        onPress={() => navigation.navigate(OWNER_SCREENS.BoletoWebView, { url: boletoUrl })}
                        style={({ pressed }) => [
                          { marginTop: 12, height: 52, borderRadius: 14, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
                          pressed && { opacity: 0.85 },
                        ]}
                      >
                        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>Abrir boleto</Text>
                      </Pressable>
                    ) : null}
                  </>
                ) : method === "CARD" ? (
                  <CardPaymentSheet env={env} onRefresh={() => activeQ.refetch()} />
                ) : (
                  <StatusCard env={env} onRefresh={() => activeQ.refetch()} />
                )}

                <Card style={{ padding: 14, borderRadius: 18 }}>
                  <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 15 }}>Pagamento ativo</Text>
                  <Text style={{ color: t.colors.text2, fontWeight: "800", marginTop: 8 }}>
                    Método: {String(payment?.method ?? "—")} • Status: {String(payment?.status ?? "—")}
                  </Text>
                  {payment?.expiresAt ? (
                    <Text style={{ color: t.colors.text2, fontWeight: "800", marginTop: 6 }}>
                      Expira em: {new Date(payment.expiresAt).toLocaleString("pt-BR")}
                    </Text>
                  ) : null}
                </Card>
              </ScrollView>
            )}
          </>
        )}
      </Container>

      <IosAlert visible={!!modal} title={modal?.title} message={modal?.message} onClose={() => setModal(null)} />
    </Screen>
  );
}

const m = StyleSheet.create({
  header: { paddingHorizontal: 2, paddingTop: 8, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  h1: { color: "#000", fontSize: 28, fontWeight: "900", letterSpacing: -0.6 },
  sub: { marginTop: 8, color: "#000", fontSize: 14, fontWeight: "600", opacity: 0.7, lineHeight: 18 },
  refreshBtn: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: "rgba(0,0,0,0.18)", alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  refreshTxt: { color: "#000", fontSize: 16, fontWeight: "800" },
  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(0,0,0,0.10)", width: "100%" },

  scroll: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 0 },
  sectionTitle: { color: "#000", fontSize: 22, fontWeight: "900", letterSpacing: -0.3 },

  option: { borderWidth: 2, borderColor: "rgba(0,0,0,0.10)", borderRadius: 18, paddingHorizontal: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", backgroundColor: "#fff" },
  optionSelected: { borderColor: "#2563EB", backgroundColor: "#F5FAFF" },
  iconOnly: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginRight: 14 },
  optionTitle: { color: "#000", fontSize: 20, fontWeight: "900", letterSpacing: -0.2 },
  optionSub: { marginTop: 4, color: "rgba(0,0,0,0.65)", fontSize: 15, fontWeight: "600" },
  rightWrap: { marginLeft: 12, width: 44, alignItems: "flex-end" },
  radioCircle: { width: 26, height: 26, borderRadius: 999, borderWidth: 2, borderColor: "rgba(0,0,0,0.20)", backgroundColor: "transparent" },
  checkCircle: { width: 32, height: 32, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: "#2563EB" },
  checkText: { color: "#fff", fontSize: 18, fontWeight: "900", marginTop: -1 },

  ctaWrap: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#fff", paddingHorizontal: 20, paddingBottom: Platform.OS === "ios" ? 18 : 14, paddingTop: 10 },
  secureRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 10, marginBottom: 10 },
  lockIcon: { fontSize: 16 },
  secureText: { color: "rgba(0,0,0,0.55)", fontSize: 13, fontWeight: "800" },
  ctaBtn: { height: 58, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: "#F6C453" },
  ctaText: { color: "#111827", fontSize: 20, fontWeight: "900", letterSpacing: -0.2 },
});