import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Alert, ScrollView, Switch } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { Card } from "../../ui/components/Card";
import { Button } from "../../ui/components/Button";
import { t } from "../../ui/tokens";
import { OnboardingService } from "../../core/api/services/onboarding.service";
import { useAuthStore } from "../../stores/auth.store";

function onlyDigits(v: any) {
  return String(v ?? "").replace(/\D/g, "");
}

function normalizeCode(v: any) {
  return String(v ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

function normalizeStateRegistration(v: any) {
  return String(v ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

export function OnboardingSalonScreen() {
  const setNeedsOnboarding = useAuthStore((s) => s.setNeedsOnboarding);

  const [name, setName] = useState("Meu Salão");
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [hasStateRegistration, setHasStateRegistration] = useState(false);
  const [stateRegistration, setStateRegistration] = useState("");
  const [referralToken, setReferralToken] = useState("");

  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [complement, setComplement] = useState("");

  const payload = useMemo(() => {
    const cnpj14 = onlyDigits(cnpj);
    const ref = normalizeCode(referralToken);
    const legalNameValue = legalName.trim();
    const tradeNameValue = tradeName.trim();
    const stateRegistrationValue = normalizeStateRegistration(stateRegistration);

    return {
      salon: {
        name: name.trim(),
        legalName: legalNameValue,
        tradeName: tradeNameValue,
        cnpj: cnpj14,
        hasStateRegistration,
        ...(hasStateRegistration
          ? { stateRegistration: stateRegistrationValue || undefined }
          : {}),
        cep: cep.trim() || undefined,
        street: street.trim() || undefined,
        number: number.trim() || undefined,
        district: district.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        complement: complement.trim() || undefined,
      },
      referralToken: ref ? ref : undefined,
    };
  }, [
    name,
    legalName,
    tradeName,
    cnpj,
    hasStateRegistration,
    stateRegistration,
    referralToken,
    cep,
    street,
    number,
    district,
    city,
    state,
    complement,
  ]);

  const stateRegistrationOk = !hasStateRegistration || stateRegistration.trim().length > 0;

  const can =
    payload.salon.name.length >= 2 &&
    payload.salon.legalName.length >= 2 &&
    payload.salon.tradeName.length >= 2 &&
    payload.salon.cnpj.length === 14 &&
    stateRegistrationOk;

  const mut = useMutation({
    mutationFn: async () => OnboardingService.salon(payload),
    onSuccess: () => {
      setNeedsOnboarding(false);
      Alert.alert("OK", "Cadastro do salão concluído!");
      // RootNavigator vai te mandar automaticamente pro OwnerStack
    },
    onError: (e: any) => {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "Falha ao concluir cadastro.";
      Alert.alert("Erro", msg);
    },
  });

  return (
    <Screen>
      <Container style={{ flex: 1 }}>
        <View style={{ marginTop: 24 }}>
          <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 20 }}>
            Cadastro do Salão
          </Text>
          <Text style={{ color: "rgba(234,240,255,0.65)", fontWeight: "800", marginTop: 6 }}>
            Informe os dados do seu CNPJ. Vamos validar CNAE.
          </Text>
        </View>

        <ScrollView style={{ marginTop: 16 }} contentContainerStyle={{ paddingBottom: 24 }}>
          <Card>
            <Text style={labelStyle}>Nome do salão</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              style={styles.input}
              placeholderTextColor="rgba(234,240,255,0.45)"
            />

            <Text style={labelStyle}>Razão social</Text>
            <TextInput
              value={legalName}
              onChangeText={setLegalName}
              style={styles.input}
              placeholder="Razão social do CNPJ"
              placeholderTextColor="rgba(234,240,255,0.45)"
            />

            <Text style={labelStyle}>Nome fantasia</Text>
            <TextInput
              value={tradeName}
              onChangeText={setTradeName}
              style={styles.input}
              placeholder="Nome fantasia do CNPJ"
              placeholderTextColor="rgba(234,240,255,0.45)"
            />

            <Text style={labelStyle}>CNPJ (14 dígitos)</Text>
            <TextInput
              value={cnpj}
              onChangeText={(v) => setCnpj(onlyDigits(v))}
              keyboardType="numeric"
              maxLength={14}
              style={styles.input}
              placeholder="Somente números"
              placeholderTextColor="rgba(234,240,255,0.45)"
            />

            <View style={styles.switchRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={labelStyle}>Possui inscrição estadual</Text>
                <Text style={styles.helperText}>
                  Se marcado, a inscrição estadual será obrigatória.
                </Text>
              </View>
              <Switch
                value={hasStateRegistration}
                onValueChange={(next) => {
                  setHasStateRegistration(next);
                  if (!next) setStateRegistration("");
                }}
              />
            </View>

            {hasStateRegistration ? (
              <>
                <Text style={labelStyle}>Inscrição estadual</Text>
                <TextInput
                  value={stateRegistration}
                  onChangeText={(v) => setStateRegistration(normalizeStateRegistration(v))}
                  autoCapitalize="characters"
                  style={styles.input}
                  placeholder="Digite a inscrição estadual"
                  placeholderTextColor="rgba(234,240,255,0.45)"
                />
              </>
            ) : null}

            <Text style={labelStyle}>Código de convite (opcional, 8 chars)</Text>
            <TextInput
              value={referralToken}
              onChangeText={(v) => setReferralToken(normalizeCode(v))}
              autoCapitalize="characters"
              maxLength={8}
              style={styles.input}
              placeholder="Ex: XA84XW8P"
              placeholderTextColor="rgba(234,240,255,0.45)"
            />
          </Card>

          <View style={{ height: 12 }} />

          <Card>
            <Text style={{ color: "rgba(234,240,255,0.85)", fontWeight: "900" }}>
              Endereço (opcional por enquanto)
            </Text>

            <Text style={labelStyle}>CEP</Text>
            <TextInput
              value={cep}
              onChangeText={(v) => setCep(onlyDigits(v))}
              keyboardType="numeric"
              style={styles.input}
              placeholderTextColor="rgba(234,240,255,0.45)"
            />

            <Text style={labelStyle}>Rua</Text>
            <TextInput value={street} onChangeText={setStreet} style={styles.input} placeholderTextColor="rgba(234,240,255,0.45)" />

            <Text style={labelStyle}>Número</Text>
            <TextInput value={number} onChangeText={setNumber} style={styles.input} placeholderTextColor="rgba(234,240,255,0.45)" />

            <Text style={labelStyle}>Bairro</Text>
            <TextInput value={district} onChangeText={setDistrict} style={styles.input} placeholderTextColor="rgba(234,240,255,0.45)" />

            <Text style={labelStyle}>Cidade</Text>
            <TextInput value={city} onChangeText={setCity} style={styles.input} placeholderTextColor="rgba(234,240,255,0.45)" />

            <Text style={labelStyle}>UF</Text>
            <TextInput
              value={state}
              onChangeText={setState}
              style={styles.input}
              placeholder="SP"
              placeholderTextColor="rgba(234,240,255,0.45)"
              maxLength={2}
            />

            <Text style={labelStyle}>Complemento</Text>
            <TextInput value={complement} onChangeText={setComplement} style={styles.input} placeholderTextColor="rgba(234,240,255,0.45)" />
          </Card>

          <View style={{ marginTop: 14 }}>
            <Button
              title={mut.isPending ? "Salvando…" : "Concluir cadastro"}
              variant="primary"
              onPress={() => mut.mutate()}
              loading={mut.isPending}
              style={!can ? { opacity: 0.5 } : undefined}
              disabled={!can || mut.isPending}
            />

            {!can ? (
              <Text style={{ marginTop: 10, color: "rgba(234,240,255,0.6)", fontWeight: "800", fontSize: 12 }}>
                Preencha nome, razão social, nome fantasia e um CNPJ com 14 dígitos.
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </Container>
    </Screen>
  );
}

const labelStyle = {
  marginTop: 10,
  color: "rgba(234,240,255,0.65)",
  fontWeight: "800" as const,
};

const styles = {
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#EAF0FF",
    fontWeight: "800" as const,
  },
  switchRow: {
    marginTop: 14,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: 12,
  },
  helperText: {
    marginTop: 4,
    color: "rgba(234,240,255,0.60)",
    fontSize: 12,
    fontWeight: "700" as const,
    lineHeight: 16,
  },
};
