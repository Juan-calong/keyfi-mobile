import React, { useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Platform, StatusBar, ScrollView, Image } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
    <View style={m.optionShell}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={`${title}, ${subtitle}${selected ? ", selecionado" : ""}`}
        style={({ pressed }) => [
          m.option,
          selected && m.optionSelected,
          pressed ? { opacity: 0.96 } : null,
        ]}
      >
        <View style={m.optionContent}>
          <View style={m.iconOnly}>{icon}</View>

          <View style={m.optionMain}>
            <Text style={m.optionTitle}>{title}</Text>
            <Text style={m.optionSub} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>

          <View style={selected ? m.selectorSelected : m.selector}>
            {selected ? <View style={m.selectorDot} /> : null}
          </View>
        </View>
      </Pressable>
    </View>
  );
}

export function OwnerPixPaymentScreen({ route }: any) {
  const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();

  const onExitPayment = React.useCallback(() => {
    if (navigation.canGoBack?.()) {
      navigation.goBack();
      return;
    }

    navigation.navigate(OWNER_SCREENS.Orders);
  }, [navigation]);
  const orderId: string | undefined = route?.params?.orderId || route?.params?.id;
  const routeAmount = Number(route?.params?.amount || 0);

  const [selected, setSelected] = useState<Method>("PIX");
  const continueLock = useRef(false);
  const didNavigateToOrderDetailsRef = useRef(false);

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

    React.useEffect(() => {
    const paid = ["PAID", "APPROVED"].includes(String(payment?.status ?? "").toUpperCase());
    if (!paid || didNavigateToOrderDetailsRef.current || !orderId) return;
    didNavigateToOrderDetailsRef.current = true;
    navigation.replace(OWNER_SCREENS.OrderDetails, { orderId, showPaymentSuccessOnPaid: true });
  }, [navigation, orderId, payment?.status]);

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
      const resolvedAmount = Number(
        routeAmount ||
          env?.order?.amountDue ||
          env?.order?.totalAmount ||
          payment?.amount ||
          0
      );
      if (methods?.card?.provider === "MERCADOPAGO") {
          if (!(resolvedAmount > 0)) {
          setModal({
            title: "Valor indisponível",
            message: "Não foi possível identificar o valor do pedido. Volte e tente novamente.",
          });
          return;
        }
        navigation.navigate(OWNER_SCREENS.MercadoPagoCardEntry, {
          orderId,
          amount: resolvedAmount,
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

  const boletoUrl = useMemo(() => {
    const na = env?.nextAction;
    return normalizeUrl(na?.ticketUrl || na?.url || na?.ticket_url || null);
  }, [env?.nextAction]);

  return (
    <Screen>
      <Container style={{ flex: 1, paddingTop: Platform.OS === "ios" ? Math.max(insets.top, 10) : 6 }}>
        {Platform.OS === "android" ? <View style={{ height: StatusBar.currentHeight ?? 0 }} /> : null}

<View style={m.header}>
  <Pressable
    onPress={onExitPayment}
    hitSlop={12}
    style={({ pressed }) => [m.backBtn, pressed && { opacity: 0.85 }]}
  >
    <Text style={m.backTxt}>{"<"}</Text>
  </Pressable>

  <View pointerEvents="none" style={m.headerTitleWrap}>
    <Text style={m.h1}>Pagamentos</Text>
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
                    selected={selected === "PIX"}
                    onPress={() => setSelected("PIX")}
                    icon={<Image source={require("../../assets/payments/pix.png")} style={{ width: 36, height: 36, resizeMode: "contain" }} />}
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
                  <PixPaymentSheet envelope={env} onViewOrders={() => navigation.navigate(OWNER_SCREENS.Orders)} viewOrdersLabel="Ver pedidos" />
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

header: {
  position: "relative",
  paddingHorizontal: 2,
  paddingTop: 8,
  paddingBottom: 12,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
},

headerTitleWrap: {
  position: "absolute",
  left: 56,
  right: 56,
  top: 8,
  bottom: 12,
  alignItems: "center",
  justifyContent: "center",
},

h1: {
  color: "#000000",
  fontSize: 24,
  fontWeight: "900",
  letterSpacing: -0.4,
  textAlign: "center",
},

sub: {
  marginTop: 8,
  color: "#000000",
  fontSize: 14,
  fontWeight: "600",
  opacity: 0.7,
  lineHeight: 18,
},

backBtn: {
  width: 44,
  height: 44,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#FFFFFF",
},

backTxt: {
  color: "#000000",
  fontSize: 24,
  fontWeight: "800",
  marginTop: -1,
  lineHeight: 28,
},

refreshBtn: {
  width: 44,
  height: 44,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "rgba(0,0,0,0.10)",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#FFFFFF",
},
  refreshTxt: { color: "#000", fontSize: 16, fontWeight: "800" },
  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(0,0,0,0.10)", width: "100%" },

  scroll: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 0 },
  sectionTitle: { color: "#000", fontSize: 22, fontWeight: "900", letterSpacing: -0.3 },

option: {
  borderWidth: 1.5,
  borderColor: "rgba(15,23,42,0.14)",
  borderRadius: 18,
  paddingHorizontal: 16,
  paddingVertical: 16,
  backgroundColor: "#FFFFFF",
},

optionSelected: {
  borderColor: "#3B82F6",
  backgroundColor: "#F7FAFF",
},

optionContent: {
  flexDirection: "row",
  alignItems: "center",
  gap: 14,
},

iconOnly: {
  width: 44,
  height: 44,
  borderRadius: 14,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#F8FAFC",
},

optionMain: {
  flex: 1,
},

optionTitle: {
  color: "#111111",
  fontSize: 18,
  fontWeight: "900",
  letterSpacing: -0.2,
},

optionSub: {
  marginTop: 5,
  color: "rgba(17,17,17,0.62)",
  fontSize: 14,
  fontWeight: "700",
},

optionShell: {
  marginTop: 14,
  marginHorizontal: -4,
},

selector: {
  width: 24,
  height: 24,
  borderRadius: 999,
  borderWidth: 2,
  borderColor: "#D1D5DB",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#FFFFFF",
},

selectorSelected: {
  width: 24,
  height: 24,
  borderRadius: 999,
  borderWidth: 2,
  borderColor: "#3B82F6",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#FFFFFF",
},

selectorDot: {
  width: 10,
  height: 10,
  borderRadius: 999,
  backgroundColor: "#3B82F6",
},

  ctaWrap: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#fff", paddingHorizontal: 20, paddingBottom: Platform.OS === "ios" ? 18 : 14, paddingTop: 10 },
  secureRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 10, marginBottom: 10 },
  lockIcon: { fontSize: 16 },
  secureText: { color: "rgba(0,0,0,0.55)", fontSize: 13, fontWeight: "800" },
ctaBtn: {
  height: 56,
  borderRadius: 18,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#000000",
},

ctaText: {
  color: "#FFFFFF",
  fontSize: 17,
  fontWeight: "900",
  letterSpacing: -0.2,
},
});