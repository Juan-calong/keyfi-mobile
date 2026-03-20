// src/screens/seller/SellerPaymentMethodsScreen.tsx
import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Platform,
  StatusBar,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

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

import { SELLER_SCREENS } from "../../navigation/seller.routes";

import { IosAlert } from "../../ui/components/IosAlert";
import { friendlyError } from "../../core/errors/friendlyError";

type Method = "PIX" | "BOLETO" | "CARD";

function StatusCard({ env, onRefresh }: { env: any; onRefresh: () => void }) {
  const method = String(env?.method ?? "").toUpperCase();
  const status = String(env?.status ?? "").toUpperCase();

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
          <Text style={{ color: t.colors.text2, fontWeight: "800", marginTop: 6 }}>
            Aguardando atualização…
          </Text>
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
  helper,
  selected,
  onPress,
  icon,
}: {
  title: string;
  subtitle: string;
  helper?: string;
  selected: boolean;
  onPress: () => void;
  icon: React.ReactNode;
}) {
  return (
    <View style={{ marginTop: 12 }}>
      <Pressable onPress={onPress} style={({ pressed }) => [m.option, pressed && { opacity: 0.9 }]}>
        <View style={m.optionIcon}>{icon}</View>

        <View style={{ flex: 1 }}>
          <Text style={m.optionTitle}>{title}</Text>
          <Text style={m.optionSub}>{subtitle}</Text>
        </View>

        <Radio selected={selected} />
      </Pressable>

      {helper ? <Text style={m.helper}>{helper}</Text> : null}
    </View>
  );
}

function Radio({ selected }: { selected: boolean }) {
  return <View style={m.radioOuter}>{selected ? <View style={m.radioInner} /> : null}</View>;
}

function PixIcon() {
  return (
    <View style={m.pix}>
      <View style={[m.pixDiamond, { top: 0, left: 10 }]} />
      <View style={[m.pixDiamond, { top: 10, left: 0 }]} />
      <View style={[m.pixDiamond, { top: 10, left: 20 }]} />
      <View style={[m.pixDiamond, { top: 20, left: 10 }]} />
    </View>
  );
}
function BoletoIcon() {
  return (
    <View style={m.barcode}>
      {Array.from({ length: 7 }).map((_, i) => (
        <View key={i} style={[m.bar, { width: i % 3 === 0 ? 2 : 1 }]} />
      ))}
    </View>
  );
}
function CardIcon() {
  return (
    <View style={m.card}>
      <View style={m.cardStripe} />
      <View style={m.cardMiniLine} />
    </View>
  );
}

export function SellerPaymentMethodsScreen({ route }: any) {
  const navigation = useNavigation<any>();

  const orderId: string | undefined = route?.params?.orderId || route?.params?.id;
  const amount: number | undefined = route?.params?.amount;

  const [selected, setSelected] = useState<Method>("PIX");
  const [modal, setModal] = useState<null | { title: string; message: string }>(null);

  if (!orderId) {
    return (
      <Screen>
        <Container>
          <Text style={{ color: t.colors.danger, fontWeight: "900" }}>orderId ausente.</Text>
          <Text style={{ marginTop: 10, color: t.colors.text2 }}>params: {JSON.stringify(route?.params ?? null)}</Text>
        </Container>
      </Screen>
    );
  }

  const activeQ = useQuery({
    queryKey: ["seller-pay-active", orderId],
    enabled: !!orderId,
    queryFn: async () => (await api.get(endpoints.payments.active(String(orderId)))).data,
    retry: false,
    staleTime: 0,
    refetchInterval: (q) => {
      const env = q.state.data as any;
      if (!env) return false;
      const status = String(env?.status ?? "").toUpperCase();
      const finalStatuses = ["PAID", "APPROVED", "REJECTED", "FAILED", "CANCELED", "CANCELLED", "EXPIRED"];
      if (finalStatuses.includes(status)) return false;
      return 2000;
    },
  });

  const env = activeQ.data;
  const hasPayment = !!env?.paymentIntentId || !!env?.method;
  const method = String(env?.method ?? "").toUpperCase();

  useFocusEffect(
    useCallback(() => {
      if (orderId) activeQ.refetch();
    }, [orderId])
  );

  const createPixMut = useMutation({
    mutationFn: async () => (await api.post(endpoints.payments.intent(orderId), { method: "PIX" })).data,
    onSuccess: async () => activeQ.refetch(),
    onError: (e: any) => {
      const fe = friendlyError(e);
      setModal({ title: fe.title || "Erro", message: fe.message || "Falha ao criar PIX." });
    },
  });

  const onContinue = async () => {
    if (!orderId) return;
    if (hasPayment) return;

    if (selected === "PIX") {
      createPixMut.mutate();
      return;
    }

    if (selected === "BOLETO") {
      navigation.navigate(SELLER_SCREENS.BoletoPayerForm, { orderId });
      return;
    }

    // ✅ CARD → SOP
    navigation.navigate(SELLER_SCREENS.CardTokenize, {
      orderId,
      amount,
      successRouteName: SELLER_SCREENS.CardEntry,
      cancelRouteName: SELLER_SCREENS.PaymentMethods,
    });
  };

  const boletoUrl = useMemo(() => {
    const na = env?.nextAction;
    if (!na) return null;
    const url = na?.ticketUrl || na?.url || na?.ticket_url;
    return url ? String(url) : null;
  }, [env?.nextAction]);

  return (
    <Screen>
      <Container style={{ flex: 1, paddingTop: 6 }}>
        {Platform.OS === "android" ? <View style={{ height: StatusBar.currentHeight ?? 0 }} /> : null}

        <View style={m.header}>
          <View style={{ flex: 1 }}>
            <Text style={m.h1}>Métodos de pagamento</Text>
          </View>

          <Pressable
            onPress={() => activeQ.refetch()}
            hitSlop={12}
            style={({ pressed }) => [m.refreshBtn, pressed && { opacity: 0.85 }]}
          >
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
                    helper="Recomendado"
                    selected={selected === "PIX"}
                    onPress={() => setSelected("PIX")}
                    icon={<PixIcon />}
                  />

                  <PaymentRow
                    title="Boleto"
                    subtitle="Compensação em até 2 dias úteis"
                    selected={selected === "BOLETO"}
                    onPress={() => setSelected("BOLETO")}
                    icon={<BoletoIcon />}
                  />

                  <PaymentRow
                    title="Cartão"
                    subtitle="Crédito ou débito"
                    selected={selected === "CARD"}
                    onPress={() => setSelected("CARD")}
                    icon={<CardIcon />}
                  />

                  <View style={{ height: 120 }} />
                </ScrollView>

                <View style={m.ctaWrap}>
                  <View style={m.hairline} />
                  <Text style={m.secure}>Pagamento seguro</Text>

                  <Pressable
                    onPress={onContinue}
                    disabled={createPixMut.isPending}
                    style={({ pressed }) => [
                      m.ctaBtn,
                      pressed && { opacity: 0.85 },
                      createPixMut.isPending && { opacity: 0.6 },
                    ]}
                  >
                    <Text style={m.ctaText}>{createPixMut.isPending ? "..." : "Continuar"}</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <View style={{ marginTop: 14, gap: 12 }}>
                <StatusCard env={env} onRefresh={() => activeQ.refetch()} />

                {method === "PIX" ? (
                  <PixPaymentSheet envelope={env} />
                ) : method === "BOLETO" ? (
                  <>
                    <BoletoPaymentSheet envelope={env} />
                    {boletoUrl ? (
                      <Pressable
                        onPress={() => navigation.navigate(SELLER_SCREENS.BoletoWebView, { url: boletoUrl, orderId })}
                        style={({ pressed }) => [
                          {
                            marginTop: 12,
                            height: 52,
                            borderRadius: 14,
                            backgroundColor: "#000",
                            alignItems: "center",
                            justifyContent: "center",
                          },
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
                    Método: {String(env?.method)} • Status: {String(env?.status)}
                  </Text>
                  {env?.expiresAt ? (
                    <Text style={{ color: t.colors.text2, fontWeight: "800", marginTop: 6 }}>
                      Expira em: {new Date(env.expiresAt).toLocaleString("pt-BR")}
                    </Text>
                  ) : null}
                </Card>
              </View>
            )}
          </>
        )}
      </Container>

      <IosAlert visible={!!modal} title={modal?.title} message={modal?.message} onClose={() => setModal(null)} />
    </Screen>
  );
}

const HPAD = 20;

const m = StyleSheet.create({
  header: { paddingHorizontal: 2, paddingTop: 8, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  h1: { color: "#000", fontSize: 20, fontWeight: "900", letterSpacing: -0.2 },
  refreshBtn: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: "rgba(0,0,0,0.25)", alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  refreshTxt: { color: "#000", fontSize: 16, fontWeight: "800" },

  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(0,0,0,0.18)", width: "100%" },

  scroll: { paddingTop: 16, paddingHorizontal: HPAD, paddingBottom: 0 },
  sectionTitle: { color: "#000", fontSize: 18, fontWeight: "900", letterSpacing: -0.2 },

  option: { borderWidth: 1, borderColor: "rgba(0,0,0,0.85)", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, flexDirection: "row", alignItems: "center", backgroundColor: "#fff" },
  optionIcon: { width: 38, height: 38, alignItems: "center", justifyContent: "center", marginRight: 12 },
  optionTitle: { color: "#000", fontSize: 16, fontWeight: "900", letterSpacing: -0.15 },
  optionSub: { marginTop: 3, color: "#000", fontSize: 13, fontWeight: "300", opacity: 0.9 },
  helper: { marginTop: 8, marginLeft: 14, color: "#000", fontSize: 12, fontWeight: "500", opacity: 0.85 },

  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: "#000", alignItems: "center", justifyContent: "center" },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#000" },

  ctaWrap: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#fff", paddingHorizontal: HPAD, paddingBottom: Platform.OS === "ios" ? 18 : 14, paddingTop: 10 },
  secure: { textAlign: "center", color: "#000", fontSize: 12, fontWeight: "600", opacity: 0.75, marginTop: 10, marginBottom: 10 },
  ctaBtn: { height: 54, borderRadius: 14, borderWidth: 1, borderColor: "#000", alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  ctaText: { color: "#000", fontSize: 16, fontWeight: "900", letterSpacing: -0.2 },

  pix: { width: 34, height: 34, position: "relative" },
  pixDiamond: { position: "absolute", width: 12, height: 12, borderWidth: 1, borderColor: "#000", transform: [{ rotate: "45deg" }], borderRadius: 2 },

  barcode: { width: 34, height: 24, borderWidth: 1, borderColor: "#000", borderRadius: 4, paddingHorizontal: 5, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bar: { height: 14, backgroundColor: "#000", opacity: 0.95, borderRadius: 1 },

  card: { width: 34, height: 24, borderWidth: 1, borderColor: "#000", borderRadius: 5, position: "relative" },
  cardStripe: { position: "absolute", left: 0, top: 6, right: 0, height: 2, backgroundColor: "#000", opacity: 0.9 },
  cardMiniLine: { position: "absolute", left: 6, bottom: 6, width: 12, height: 2, backgroundColor: "#000", opacity: 0.7, borderRadius: 1 },
});