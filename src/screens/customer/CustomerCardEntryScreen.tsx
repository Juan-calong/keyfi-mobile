// screens/customer/CustomerCardEntryScreen.tsx (VERSÃO CIELO + BB, sem MP)
import React, { useMemo, useRef, useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Platform, StatusBar } from "react-native";
import Icon from "react-native-vector-icons/Feather";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { Card } from "../../ui/components/Card";
import { t } from "../../ui/tokens";
import { CUSTOMER_SCREENS } from "../../navigation/customer.routes";
import { endpoints } from "../../core/api/endpoints";
import { api } from "../../core/api/client";

import { IosAlert } from "../../ui/components/IosAlert";
import { friendlyError } from "../../core/errors/friendlyError";

const onlyDigits = (v: any) => String(v ?? "").replace(/\D/g, "");
const trim = (v: any) => String(v ?? "").trim();

function formatBRL(v: number) {
  if (!Number.isFinite(v)) return "R$ —";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function CustomerCardEntryScreen({ route, navigation }: any) {
  const orderId: string | undefined = route?.params?.orderId;
  const amount: number = Number(route?.params?.amount ?? 0);
  const cardToken: string = route?.params?.cardToken;

  const [cvv, setCvv] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");

  // parcelas simples (você pode trocar por um endpoint depois)
  const installmentOptions = useMemo(() => [1, 2, 3, 4, 5, 6], []);
  const [installments, setInstallments] = useState<number>(1);

  const [confirming, setConfirming] = useState(false);
  const [modal, setModal] = useState<null | { title: string; message: string }>(null);

  const payLock = useRef(false);

  function validateOrThrow() {
    if (!orderId) throw new Error("orderId ausente.");
    if (!cardToken) throw new Error("Token do cartão ausente. Volte e tokenize novamente.");

    const c = onlyDigits(cvv);
    if (c.length < 3) throw new Error("CVV inválido.");

    const doc = onlyDigits(cpf);
    if (doc.length !== 11 && doc.length !== 14) throw new Error("CPF/CNPJ inválido.");

    const em = trim(email).toLowerCase();
    if (!em.includes("@") || !em.includes(".")) throw new Error("Email inválido.");

    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Total inválido.");
  }

  async function onConfirmPay() {
    if (payLock.current) return;
    payLock.current = true;

    try {
      setConfirming(true);
      validateOrThrow();

      // ✅ Seu backend: POST /payments/:orderId/intent
      const payload = {
        method: "CARD",
        installments: Number(installments || 1),
        cpf: onlyDigits(cpf),
        email: trim(email).toLowerCase(),
          payer: {
          cpf: onlyDigits(cpf),
          email: trim(email).toLowerCase(),
        },
        card: {
          cardToken,
          securityCode: onlyDigits(cvv),
        },
      };

      await api.post(endpoints.payments.intent(orderId!), payload);

      // Você decide o destino:
      // - se PixPayment hoje é sua tela que mostra status/qr etc, talvez não faça sentido.
      // - melhor: ir pra OrderDetails.
      navigation.replace(CUSTOMER_SCREENS.OrderDetails, { orderId });
    } catch (e: any) {
      const fe: any = friendlyError(e);
      setModal({
        title: String(fe?.title || "Erro"),
        message: String(fe?.message || e?.message || "Falha ao pagar com cartão."),
      });
    } finally {
      setConfirming(false);
      setTimeout(() => (payLock.current = false), 400);
    }
  }

  if (!orderId) {
    return (
      <Screen>
        <Container>
          <Text style={{ color: t.colors.danger, fontWeight: "900" }}>orderId ausente.</Text>
        </Container>
      </Screen>
    );
  }

  if (!cardToken) {
    return (
      <Screen>
        <Container>
          <Text style={{ color: t.colors.danger, fontWeight: "900" }}>cardToken ausente.</Text>
          <Text style={{ marginTop: 8 }}>
            Volte e tokenize novamente o cartão.
          </Text>

          <Pressable
            onPress={() => navigation.replace(CUSTOMER_SCREENS.CardTokenize, { orderId, amount })}
            style={{ marginTop: 14, padding: 12, borderWidth: 1, borderRadius: 12 }}
          >
            <Text style={{ fontWeight: "800" }}>Tokenizar cartão</Text>
          </Pressable>
        </Container>
      </Screen>
    );
  }

  return (
    <Screen>
      <Container style={{ flex: 1, paddingTop: 6 }}>
        {Platform.OS === "android" ? <View style={{ height: StatusBar.currentHeight ?? 0 }} /> : null}

        <View style={m.header}>
          <Pressable hitSlop={12} onPress={() => navigation.goBack()} style={m.backBtn}>
            <Text style={m.backText}>{"< Voltar"}</Text>
          </Pressable>

          <Text style={m.h1}>Pagamento com Cartão</Text>
          <View style={{ width: 64 }} />
        </View>

        <View style={m.hairline} />

        <ScrollView contentContainerStyle={m.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Card style={m.cardGroup}>
            <Text style={m.totalLabel}>Total: {amount > 0 ? formatBRL(amount) : "—"}</Text>

            <View style={m.groupHeader}>
              <Icon name="lock" size={18} color="#1C63D5" />
              <Text style={m.groupTitle}>Cartão tokenizado</Text>
            </View>

            <Text style={m.small}>
              Token recebido com sucesso. (CVV ainda é necessário para autorizar)
            </Text>

            <TextInput
              value={cvv}
              onChangeText={(v) => setCvv(onlyDigits(v).slice(0, 4))}
              keyboardType="number-pad"
              placeholder="CVV"
              placeholderTextColor="#00000066"
              style={m.input}
              secureTextEntry
            />

            <View style={m.innerDivider} />

            <View style={m.groupHeader}>
              <Icon name="user" size={18} color="#1C63D5" />
              <Text style={m.groupTitle}>Dados do Pagador</Text>
            </View>

            <TextInput
              value={cpf}
              onChangeText={(v) => setCpf(onlyDigits(v))}
              keyboardType="number-pad"
              placeholder="CPF/CNPJ"
              placeholderTextColor="#00000066"
              style={m.input}
            />

            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="Email"
              placeholderTextColor="#00000066"
              style={m.input}
            />
          </Card>

          <View style={{ height: 14 }} />

          <Card style={m.cardGroup}>
            <View style={m.groupHeader}>
              <Icon name="credit-card" size={18} color="#1C63D5" />
              <Text style={m.groupTitle}>Parcelas</Text>
            </View>

            <View style={{ gap: 10 }}>
              {installmentOptions.map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setInstallments(n)}
                  style={({ pressed }) => [
                    m.option,
                    pressed && { opacity: 0.9 },
                    n === installments && { borderColor: "#000000" },
                  ]}
                >
                  <Text style={m.optionTitle}>{n}x</Text>
                  <View style={{ flex: 1 }} />
                  <View style={[m.radioOuter, n === installments && { borderColor: "#000000" }]}>
                    {n === installments ? <View style={m.radioInner} /> : null}
                  </View>
                </Pressable>
              ))}
            </View>
          </Card>

          <View style={{ height: 140 }} />
        </ScrollView>

        <View style={m.ctaWrap}>
          <View style={m.hairline} />

          <View style={m.secureRow}>
            <Icon name="check-circle" size={18} color="#1C63D5" />
            <Text style={m.secureText}>Pagamento 100% seguro</Text>
          </View>

          <Pressable
            onPress={onConfirmPay}
            disabled={confirming}
            style={({ pressed }) => [m.ctaBtn, pressed && { opacity: 0.85 }, confirming && { opacity: 0.6 }]}
          >
            <Text style={m.ctaText}>{confirming ? "..." : "Confirmar e pagar"}</Text>
          </Pressable>
        </View>

        <IosAlert visible={!!modal} title={modal?.title} message={modal?.message} onClose={() => setModal(null)} />
      </Container>
    </Screen>
  );
}

const HPAD = 20;

const m = StyleSheet.create({
  header: { paddingHorizontal: HPAD, paddingTop: 8, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  h1: { color: "#000000", fontSize: 20, fontWeight: "700", letterSpacing: -0.2 },
  backBtn: { minWidth: 64, height: 44, justifyContent: "center" },
  backText: { color: "#000000", fontSize: 15, fontWeight: "900", letterSpacing: -0.2 },
  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(15,23,42,0.08)", width: "100%" },
  scroll: { paddingTop: 16, paddingHorizontal: HPAD, paddingBottom: 0 },
  cardGroup: { padding: 16, borderRadius: 18, backgroundColor: "#F2F5FF", gap: 10 },
  totalLabel: { color: "#0F172A", fontSize: 12, fontWeight: "600", marginBottom: 4 },
  groupHeader: { flexDirection: "row", alignItems: "center", marginTop: 4, marginBottom: 6 },
  groupTitle: { marginLeft: 8, color: "#1C63D5", fontSize: 16, fontWeight: "600" },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#E1E5F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    color: "#000000",
    backgroundColor: "#FFFFFF",
    fontSize: 15,
    fontWeight: "500",
    marginTop: 8,
  },
  innerDivider: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(15,23,42,0.08)", marginVertical: 10 },
  option: {
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.15)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  optionTitle: { color: "#0F172A", fontSize: 14, fontWeight: "600", letterSpacing: -0.15 },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: "#000000", alignItems: "center", justifyContent: "center" },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#000000" },
  small: { color: "#0F172A", opacity: 0.75, fontSize: 12, fontWeight: "600", marginTop: 6 },
  ctaWrap: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#FFFFFF", paddingHorizontal: HPAD, paddingBottom: Platform.OS === "ios" ? 18 : 14, paddingTop: 10 },
  secureRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 10, marginBottom: 10 },
  secureText: { marginLeft: 6, color: "#1C63D5", fontSize: 12, fontWeight: "600" },
  ctaBtn: { height: 54, borderRadius: 14, borderWidth: 1, borderColor: "#000000", alignItems: "center", justifyContent: "center", backgroundColor: "#000000" },
  ctaText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900", letterSpacing: -0.2 },
});