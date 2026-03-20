// screens/owner/OwnerBoletoPayerFormScreen.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  StyleSheet,
  StatusBar,
} from "react-native";
import { useMutation } from "@tanstack/react-query";
import LinearGradient from "react-native-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { t } from "../../ui/tokens";

import { PaymentsService } from "../../core/api/services/payments.service";
import type { BoletoPayer } from "../../core/api/services/payments.types";
import { OWNER_SCREENS } from "../../navigation/owner.routes";

import { IosAlert } from "../../ui/components/IosAlert";
import { friendlyError } from "../../core/errors/friendlyError";

const onlyDigits = (v: any) => String(v ?? "").replace(/\D/g, "");
const trim = (v: any) => String(v ?? "").trim();

function isDocOk(v: string) {
  const d = onlyDigits(v);
  return d.length === 11 || d.length === 14; // CPF ou CNPJ
}

function isEmailOk(v: string) {
  const s = trim(v).toLowerCase();
  return s.includes("@") && s.includes(".");
}

function maskCEP(v: string) {
  const d = onlyDigits(v).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function Input({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  maxLength,
  returnKeyType,
  onSubmitEditing,
}: {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: any;
  autoCapitalize?: any;
  maxLength?: number;
  returnKeyType?: any;
  onSubmitEditing?: () => void;
}) {
  return (
    <View style={s.field}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        style={s.input}
      />
    </View>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{title}</Text>
      <View style={{ height: 10 }} />
      {children}
    </View>
  );
}

export function OwnerBoletoPayerFormScreen({ route, navigation }: any) {
  const orderId: string | undefined = route?.params?.orderId;
  const defaultPayer: Partial<BoletoPayer> | undefined = route?.params?.defaultPayer;

  const [modal, setModal] = useState<null | { title: string; message: string; onClose?: () => void }>(null);

  if (!orderId) {
    return (
      <Screen>
        <Container>
          <Text style={{ color: t.colors.danger, fontWeight: "900" }}>orderId ausente.</Text>
        </Container>
        <IosAlert
          visible={true}
          title="Erro"
          message="orderId ausente."
          onClose={() => {
            navigation.goBack?.();
          }}
        />
      </Screen>
    );
  }

  // ---- state
  const [doc, setDoc] = useState(defaultPayer?.cpf ?? "");
  const [firstName, setFirstName] = useState(defaultPayer?.firstName ?? "");
  const [lastName, setLastName] = useState(defaultPayer?.lastName ?? "");
  const [email, setEmail] = useState(defaultPayer?.email ?? "");

  const [zipCode, setZipCode] = useState(defaultPayer?.address?.zipCode ?? "");
  const [streetName, setStreetName] = useState(defaultPayer?.address?.streetName ?? "");
  const [streetNumber, setStreetNumber] = useState(defaultPayer?.address?.streetNumber ?? "");
  const [neighborhood, setNeighborhood] = useState(defaultPayer?.address?.neighborhood ?? "");
  const [city, setCity] = useState(defaultPayer?.address?.city ?? "");
  const [federalUnit, setFederalUnit] = useState(defaultPayer?.address?.federalUnit ?? "SP");

  // ---- normalized payload
  const payer: BoletoPayer = useMemo(
    () => ({
      cpf: onlyDigits(doc),
      firstName: trim(firstName),
      lastName: trim(lastName),
      email: trim(email) || undefined,
      address: {
        zipCode: onlyDigits(zipCode),
        streetName: trim(streetName),
        streetNumber: trim(streetNumber),
        neighborhood: trim(neighborhood),
        city: trim(city),
        federalUnit: trim(federalUnit).toUpperCase(),
      },
    }),
    [doc, firstName, lastName, email, zipCode, streetName, streetNumber, neighborhood, city, federalUnit]
  );

  function validateOrThrow(p: BoletoPayer) {
    if (!isDocOk(p.cpf)) throw new Error("Informe CPF (11) ou CNPJ (14).");
    if (p.firstName.length < 2) throw new Error("Informe o primeiro nome.");
    if (p.lastName.length < 2) throw new Error("Informe o sobrenome.");
    if (!p.email || !isEmailOk(p.email)) throw new Error("Informe um email válido.");

    if (p.address.zipCode.length !== 8) throw new Error("CEP inválido (8 dígitos).");
    if (!p.address.streetName) throw new Error("Informe a rua.");
    if (!p.address.streetNumber) throw new Error("Informe o número.");
    if (!p.address.neighborhood) throw new Error("Informe o bairro.");
    if (!p.address.city) throw new Error("Informe a cidade.");

    const uf = p.address.federalUnit;
    if (!/^[A-Z]{2}$/.test(uf)) throw new Error("UF inválida (ex: SP).");
  }

  const mut = useMutation({
    mutationFn: async () => {
      validateOrThrow(payer);
      return PaymentsService.intentBOLETO(orderId, payer);
    },
    onSuccess: (data: any) => {
      const url = data?.nextAction?.ticketUrl;

      if (!url) {
        setModal({
          title: "Boleto",
          message: "Boleto gerado, mas não recebi link para abrir.",
          onClose: () => navigation.goBack(),
        });
        return;
      }

      // ✅ abre dentro do app (WebView) e remove o form da pilha
      navigation.replace(OWNER_SCREENS.BoletoWebView, { url });
    },
    onError: (e: any) => {
      console.log("[BOLETO][ERROR]", {
        status: e?.response?.status,
        data: e?.response?.data,
        message: e?.message,
      });

      const fe = friendlyError(e);
      setModal({ title: fe.title || "Erro", message: fe.message || "Falha ao gerar boleto." });
    },
  });

  return (
    <Screen>
      <LinearGradient colors={["#F7FAFF", "#FFFFFF", "#F6FFF9"]} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          <Container style={{ flex: 1, paddingTop: 6 }}>
            {Platform.OS === "android" ? <View style={{ height: StatusBar.currentHeight ?? 0 }} /> : null}

            {/* NAV */}
            <View style={s.nav}>
              <Pressable hitSlop={12} onPress={() => navigation.goBack()} style={s.backBtn}>
                <Ionicons name="chevron-back" size={20} color="#0F172A" />
                <Text style={s.backText}>Voltar</Text>
              </Pressable>

              <Text style={s.navTitle}>Dados do boleto</Text>

              <View style={{ width: 72 }} />
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={s.scroll}
              showsVerticalScrollIndicator={false}
            >
              {/* PAGADOR */}
              <Card title="Pagador">
                <Input
                  label="CPF ou CNPJ"
                  value={doc}
                  onChangeText={(v) => setDoc(onlyDigits(v))}
                  keyboardType="number-pad"
                  placeholder="Digite seu CPF/CNPJ (apenas números)"
                  returnKeyType="next"
                  maxLength={14}
                />

                <View style={s.row}>
                  <View style={s.col}>
                    <Input
                      label="Nome"
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="Ex.: João"
                      returnKeyType="next"
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={s.gap} />

                  <View style={s.col}>
                    <Input
                      label="Sobrenome"
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Ex.: Silva"
                      returnKeyType="next"
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                <Input
                  label="Email"
                  value={email}
                  onChangeText={(v) => setEmail(v.toLowerCase())}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="voce@exemplo.com"
                  returnKeyType="next"
                />
              </Card>

              {/* ENDEREÇO */}
              <Card title="Endereço">
                <View style={s.row}>
                  <View style={[s.col, { flex: 1.25 }]}>
                    <Input
                      label="CEP"
                      value={maskCEP(zipCode)}
                      onChangeText={(v) => setZipCode(onlyDigits(v))}
                      keyboardType="number-pad"
                      placeholder="00000-000"
                      returnKeyType="next"
                      maxLength={9}
                    />
                  </View>

                  <View style={s.gap} />

                  <View style={[s.col, { flex: 0.75 }]}>
                    <Input
                      label="UF"
                      value={federalUnit}
                      onChangeText={(v) => setFederalUnit(trim(v).toUpperCase())}
                      placeholder="SP"
                      autoCapitalize="characters"
                      maxLength={2}
                      returnKeyType="next"
                    />
                  </View>
                </View>

                <Input label="Rua" value={streetName} onChangeText={setStreetName} placeholder="Ex.: Av. Brasil" returnKeyType="next" />

                <View style={s.row}>
                  <View style={s.col}>
                    <Input
                      label="Número"
                      value={streetNumber}
                      onChangeText={setStreetNumber}
                      placeholder="Ex.: 123"
                      returnKeyType="next"
                    />
                  </View>

                  <View style={s.gap} />

                  <View style={s.col}>
                    <Input
                      label="Bairro"
                      value={neighborhood}
                      onChangeText={setNeighborhood}
                      placeholder="Ex.: Centro"
                      returnKeyType="next"
                    />
                  </View>
                </View>

                <Input
                  label="Cidade"
                  value={city}
                  onChangeText={setCity}
                  placeholder="Ex.: Campinas"
                  returnKeyType="done"
                  onSubmitEditing={() => mut.mutate()}
                />

                <View style={s.securityRow}>
                  <Ionicons name="shield-checkmark" size={18} color="#16A34A" />
                  <Text style={s.securityText}>Pagamento seguro</Text>
                </View>
              </Card>

              {/* espaço pro CTA fixo */}
              <View style={{ height: 130 }} />
            </ScrollView>

            {/* CTA FIXO */}
            <View style={s.ctaWrap}>
              <View style={s.ctaDivider} />

              <Pressable
                onPress={() => mut.mutate()}
                disabled={mut.isPending}
                style={({ pressed }) => [s.ctaBtn, pressed && { opacity: 0.92 }, mut.isPending && { opacity: 0.6 }]}
              >
                <Text style={s.ctaText}>{mut.isPending ? "Gerando..." : "Gerar boleto"}</Text>
              </Pressable>
            </View>
          </Container>
        </KeyboardAvoidingView>
      </LinearGradient>

      <IosAlert
        visible={!!modal}
        title={modal?.title}
        message={modal?.message}
        onClose={() => {
          const cb = modal?.onClose;
          setModal(null);
          cb?.();
        }}
      />
    </Screen>
  );
}

const HPAD = 16;

const s = StyleSheet.create({
  // NAV
  nav: {
    height: 52,
    paddingHorizontal: HPAD,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    minWidth: 72,
    height: 44,
    paddingHorizontal: 8,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backText: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  navTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.2,
  },

  scroll: {
    paddingTop: 10,
    paddingHorizontal: HPAD,
    paddingBottom: 0,
    gap: 12,
  },

  // CARD
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.2,
  },

  // FORM
  field: {
    gap: 6,
    marginTop: 10,
  },
  label: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#334155",
  },
  input: {
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.60)",
    backgroundColor: "rgba(248, 250, 252, 0.95)",
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "600",
  },

  row: { flexDirection: "row" },
  col: { flex: 1 },
  gap: { width: 12 },

  securityRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  securityText: {
    fontSize: 13.5,
    color: "#166534",
    fontWeight: "900",
  },

  // CTA
  ctaWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: HPAD,
    paddingBottom: Platform.OS === "ios" ? 18 : 14,
    paddingTop: 10,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  ctaDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(15, 23, 42, 0.10)",
    width: "100%",
    marginBottom: 10,
  },
  ctaBtn: {
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
});