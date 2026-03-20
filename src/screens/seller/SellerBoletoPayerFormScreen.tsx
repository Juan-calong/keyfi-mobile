// src/screens/seller/SellerBoletoPayerFormScreen.tsx
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

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { t } from "../../ui/tokens";

import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";

import { SELLER_SCREENS } from "../../navigation/seller.routes";

import { IosAlert } from "../../ui/components/IosAlert";
import { friendlyError } from "../../core/errors/friendlyError";

type BoletoPayer = {
  cpf: string;
  firstName: string;
  lastName: string;
  email?: string;
  address: {
    zipCode: string;
    streetName: string;
    streetNumber: string;
    neighborhood: string;
    city: string;
    federalUnit: string;
  };
};

const onlyDigits = (v: any) => String(v ?? "").replace(/\D/g, "");
const trim = (v: any) => String(v ?? "").trim();

function isDocOk(v: string) {
  const d = onlyDigits(v);
  return d.length === 11 || d.length === 14;
}
function isEmailOk(v: string) {
  const s = trim(v).toLowerCase();
  return s.includes("@") && s.includes(".");
}

function Input(props: any) {
  return <TextInput {...props} placeholderTextColor="#000000" style={s.input} />;
}

export function SellerBoletoPayerFormScreen({ route, navigation }: any) {
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
          onClose={() => navigation.goBack?.()}
        />
      </Screen>
    );
  }

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

  const payer: BoletoPayer = useMemo(
    () => ({
      cpf: onlyDigits(doc),
      firstName: trim(firstName),
      lastName: trim(lastName),
      email: trim(email),
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

      const res = await api.post(endpoints.payments.intent(orderId), {
        method: "BOLETO",
        payer,
      });

      return res.data;
    },
    onSuccess: (data: any) => {
      const na = data?.nextAction;
      const url = na?.ticketUrl || na?.url || na?.ticket_url;

      if (!url) {
        setModal({
          title: "Boleto",
          message: "Boleto gerado, mas não recebi link para abrir.",
          onClose: () => navigation.goBack(),
        });
        return;
      }

    },
    onError: (e: any) => {
      const fe = friendlyError(e);
      setModal({ title: fe.title || "Erro", message: fe.message || "Falha ao gerar boleto." });
    },
  });

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
        <Container style={{ flex: 1, paddingTop: 6 }}>
          {Platform.OS === "android" ? <View style={{ height: StatusBar.currentHeight ?? 0 }} /> : null}

          <View style={s.nav}>
            <Pressable hitSlop={12} onPress={() => navigation.goBack()} style={s.backBtn}>
              <Text style={s.backText}>{"<"}</Text>
            </Pressable>

            <Text style={s.navTitle}>Dados do boleto</Text>

            <Pressable hitSlop={12} onPress={() => {}} style={s.rightBtn}>
              <Text style={s.rightText}>{mut.isPending ? "…" : ""}</Text>
            </Pressable>
          </View>

          <View style={s.hairline} />

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
            <Text style={s.sectionTitle}>Pagador</Text>

            <Input value={doc} onChangeText={(v: string) => setDoc(onlyDigits(v))} keyboardType="number-pad" placeholder="CPF ou CNPJ (apenas números)" returnKeyType="next" />

            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Input value={firstName} onChangeText={setFirstName} placeholder="Nome" returnKeyType="next" />
              </View>
              <View style={{ flex: 1 }}>
                <Input value={lastName} onChangeText={setLastName} placeholder="Sobrenome" returnKeyType="next" />
              </View>
            </View>

            <View style={{ marginTop: 12 }}>
              <Input value={email} onChangeText={(v: string) => setEmail(v.toLowerCase())} keyboardType="email-address" autoCapitalize="none" placeholder="Email" returnKeyType="next" />
            </View>

            <View style={[s.hairline, { marginVertical: 18 }]} />

            <Text style={s.sectionTitle}>Endereço</Text>

            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              <View style={{ flex: 1.3 }}>
                <Input value={zipCode} onChangeText={(v: string) => setZipCode(onlyDigits(v))} keyboardType="number-pad" placeholder="CEP" returnKeyType="next" maxLength={8} />
              </View>

              <View style={{ flex: 0.7 }}>
                <Input value={federalUnit} onChangeText={(v: string) => setFederalUnit(trim(v).toUpperCase())} placeholder="UF" autoCapitalize="characters" maxLength={2} returnKeyType="next" />
              </View>
            </View>

            <View style={{ marginTop: 12 }}>
              <Input value={streetName} onChangeText={setStreetName} placeholder="Rua" returnKeyType="next" />
            </View>

            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Input value={streetNumber} onChangeText={setStreetNumber} placeholder="Número" returnKeyType="next" />
              </View>
              <View style={{ flex: 1 }}>
                <Input value={neighborhood} onChangeText={setNeighborhood} placeholder="Bairro" returnKeyType="next" />
              </View>
            </View>

            <View style={{ marginTop: 12 }}>
              <Input value={city} onChangeText={setCity} placeholder="Cidade" returnKeyType="done" onSubmitEditing={() => mut.mutate()} />
            </View>

            <View style={{ height: 120 }} />
          </ScrollView>

          <View style={s.ctaWrap}>
            <View style={s.hairline} />
            <Text style={s.secure}>Pagamento seguro</Text>

            <Pressable onPress={() => mut.mutate()} disabled={mut.isPending} style={({ pressed }) => [s.ctaBtn, pressed && { opacity: 0.85 }, mut.isPending && { opacity: 0.6 }]}>
              <Text style={s.ctaText}>{mut.isPending ? "..." : "Gerar boleto"}</Text>
            </Pressable>
          </View>
        </Container>
      </KeyboardAvoidingView>

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

const HPAD = 20;

const s = StyleSheet.create({
  nav: { height: 52, paddingHorizontal: HPAD, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { minWidth: 64, height: 44, justifyContent: "center" },
  backText: { color: "#000", fontSize: 22, fontWeight: "800", letterSpacing: -0.2 },
  navTitle: { color: "#000", fontSize: 17, fontWeight: "900", letterSpacing: -0.2 },
  rightBtn: { minWidth: 64, height: 44, alignItems: "flex-end", justifyContent: "center" },
  rightText: { color: "#000", fontSize: 14, fontWeight: "800" },

  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(0,0,0,0.18)", width: "100%" },

  scroll: { paddingTop: 16, paddingHorizontal: HPAD, paddingBottom: 0 },

  sectionTitle: { color: "#000", fontSize: 18, fontWeight: "900", letterSpacing: -0.2 },

  input: { height: 48, borderWidth: 1, borderColor: "rgba(0,0,0,0.35)", borderRadius: 14, paddingHorizontal: 14, color: "#000", backgroundColor: "#fff", fontSize: 15, fontWeight: "500", marginTop: 12 },

  ctaWrap: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#fff", paddingHorizontal: HPAD, paddingBottom: Platform.OS === "ios" ? 18 : 14, paddingTop: 10 },
  secure: { textAlign: "center", color: "#000", fontSize: 12, fontWeight: "600", opacity: 0.75, marginTop: 10, marginBottom: 10 },
  ctaBtn: { height: 54, borderRadius: 14, borderWidth: 1, borderColor: "#000", alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  ctaText: { color: "#000", fontSize: 16, fontWeight: "900", letterSpacing: -0.2 },
});