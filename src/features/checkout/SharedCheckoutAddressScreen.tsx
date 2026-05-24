import React from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";
import { friendlyError } from "../../core/errors/friendlyError";

import {
  CheckoutAddressValues,
  resolveCheckoutAddressFromProfile,
} from "./checkoutAddressProfile";
export type { CheckoutAddressValues } from "./checkoutAddressProfile";

type Props = {
  title?: string;
  subtitle?: string;
  profileMode: "customer" | "owner";
  initialCouponCode?: string;
  items: { productId: string; qty: number }[];
  initialAddress?: Partial<CheckoutAddressValues> | null;
  onContinue: (address: CheckoutAddressValues) => void;
};

function onlyDigits(v: string) {
  return String(v || "").replace(/\D/g, "");
}

function maskCep(v: string) {
  const d = onlyDigits(v).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function SharedCheckoutAddressScreen({
  title = "Endereço de entrega",
  subtitle = "Confirme o endereço antes de calcular o frete",
  profileMode,
  items,
  initialAddress,
  onContinue,
}: Props) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  const [form, setForm] = React.useState<CheckoutAddressValues>({
    zipCode: "",
    zipcode: "",
    streetName: "",
    streetNumber: "",
    neighborhood: "",
    city: "",
    federalUnit: "",
    complement: "",
  });

  const [didHydrate, setDidHydrate] = React.useState(false);

  const meQ = useQuery({
    queryKey: ["profile-me-checkout-address", profileMode],
    queryFn: async () => {
      const res = await api.get(endpoints.profiles.me);
      return res.data;
    },
    retry: false,
    staleTime: 30_000,
  });

  React.useEffect(() => {
    if (didHydrate) return;
    if (!initialAddress) return;

    const initialZipcode = onlyDigits(
      String(initialAddress.zipCode || initialAddress.zipcode || "")
    );

    setForm((prev) => ({
      ...prev,
      ...initialAddress,
      zipCode: maskCep(initialZipcode),
      zipcode: initialZipcode,
    }));

    setDidHydrate(true);
  }, [didHydrate, initialAddress]);

  React.useEffect(() => {
    if (didHydrate) return;
    if (!meQ.data) return;

    const next = resolveCheckoutAddressFromProfile(meQ.data, profileMode);

    setForm((prev) => ({
      ...prev,
      ...next,
    }));

    setDidHydrate(true);
  }, [meQ.data, didHydrate, profileMode]);

  const cepLookupMut = useMutation({
    mutationFn: async (cepRaw: string) => {
      const cep = onlyDigits(cepRaw);
      const res = await api.get(endpoints.utils.cep(cep));
      return res.data;
    },
    onSuccess: (data: any) => {
      setForm((prev) => ({
        ...prev,
        zipCode: maskCep(prev.zipCode),
        zipcode: onlyDigits(prev.zipCode),
        streetName: String(
          data?.street || data?.logradouro || prev.streetName || ""
        ),
        neighborhood: String(
          data?.district || data?.bairro || prev.neighborhood || ""
        ),
        city: String(data?.city || data?.cidade || prev.city || ""),
        federalUnit: String(
          data?.state || data?.uf || prev.federalUnit || ""
        ).toUpperCase(),
        complement: String(data?.complement || prev.complement || ""),
      }));
    },
    onError: (e: any) => {
      const fe = friendlyError(e);
      Alert.alert(
        "CEP não encontrado",
        fe.message || "Não foi possível buscar o CEP."
      );
    },
  });

  const updateField = (key: keyof CheckoutAddressValues, value: string) => {
    if (key === "zipCode" || key === "zipcode") {
      const cleanZip = onlyDigits(value);
      setForm((prev) => ({
        ...prev,
        zipCode: maskCep(value),
        zipcode: cleanZip,
      }));
      return;
    }

    if (key === "federalUnit") {
      setForm((prev) => ({
        ...prev,
        federalUnit: value.toUpperCase().slice(0, 2),
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validateAndContinue = () => {
    const cleanZip = onlyDigits(form.zipCode);

    if (items.length <= 0) {
      Alert.alert("Carrinho vazio", "Adicione itens antes de continuar.");
      return;
    }

    if (cleanZip.length !== 8) {
      Alert.alert("CEP inválido", "Informe um CEP válido.");
      return;
    }

    if (!form.streetName.trim()) {
      Alert.alert("Rua obrigatória", "Preencha a rua.");
      return;
    }

    if (!form.streetNumber.trim()) {
      Alert.alert("Número obrigatório", "Preencha o número.");
      return;
    }

    if (!form.neighborhood.trim()) {
      Alert.alert("Bairro obrigatório", "Preencha o bairro.");
      return;
    }

    if (!form.city.trim()) {
      Alert.alert("Cidade obrigatória", "Preencha a cidade.");
      return;
    }

    if (form.federalUnit.trim().length !== 2) {
      Alert.alert("UF inválida", "Informe a UF com 2 letras.");
      return;
    }

    onContinue({
      zipCode: cleanZip,
      zipcode: cleanZip,
      streetName: form.streetName.trim(),
      streetNumber: form.streetNumber.trim(),
      neighborhood: form.neighborhood.trim(),
      city: form.city.trim(),
      federalUnit: form.federalUnit.trim().toUpperCase(),
      complement: form.complement?.trim() || "",
    });
  };

  const cleanZip = onlyDigits(form.zipCode);
  const canSearchCep = cleanZip.length === 8 && !cepLookupMut.isPending;
  const loading = meQ.isLoading && !didHydrate;

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header com botão de voltar */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backBtnText}>{"< Voltar"}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          s.content,
          { paddingBottom: 160 + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.title}>{title}</Text>
        <Text style={s.subtitle}>{subtitle}</Text>

        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator color="#000" />
            <Text style={s.loadingText}>Carregando endereço...</Text>
          </View>
        ) : null}

        <View style={s.formContainer}>
          <Text style={s.label}>CEP</Text>
          <View style={s.cepRow}>
            <TextInput
              value={form.zipCode}
              onChangeText={(v) => updateField("zipCode", v)}
              placeholder="00000-000"
              keyboardType="numeric"
              style={[s.input, s.cepInput]}
              maxLength={9}
            />
            <TouchableOpacity
              style={[s.cepButton, !canSearchCep && s.cepButtonDisabled]}
              disabled={!canSearchCep}
              onPress={() => cepLookupMut.mutate(form.zipCode)}
            >
              {cepLookupMut.isPending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={s.cepButtonText}>Buscar</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={s.label}>Rua</Text>
          <TextInput
            value={form.streetName}
            onChangeText={(v) => updateField("streetName", v)}
            placeholder="Rua / Avenida"
            style={s.input}
          />

          <View style={s.row}>
            <View style={s.col}>
              <Text style={s.label}>Número</Text>
              <TextInput
                value={form.streetNumber}
                onChangeText={(v) => updateField("streetNumber", v)}
                placeholder="123"
                style={s.input}
              />
            </View>

            <View style={s.col}>
              <Text style={s.label}>UF</Text>
              <TextInput
                value={form.federalUnit}
                onChangeText={(v) => updateField("federalUnit", v)}
                placeholder="SP"
                style={s.input}
                maxLength={2}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <Text style={s.label}>Bairro</Text>
          <TextInput
            value={form.neighborhood}
            onChangeText={(v) => updateField("neighborhood", v)}
            placeholder="Bairro"
            style={s.input}
          />

          <Text style={s.label}>Cidade</Text>
          <TextInput
            value={form.city}
            onChangeText={(v) => updateField("city", v)}
            placeholder="Cidade"
            style={s.input}
          />

          <Text style={s.label}>Complemento</Text>
          <TextInput
            value={form.complement}
            onChangeText={(v) => updateField("complement", v)}
            placeholder="Apartamento, bloco, casa..."
            style={s.input}
          />
        </View>
      </ScrollView>

      {/* Footer Fixo */}
      <View style={[s.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
        <Text style={s.disclaimerText}>
          Aviso: O endereço informado aqui será usado apenas para esta entrega e não alterará os dados salvos no seu perfil.
        </Text>
        <TouchableOpacity style={s.primaryBtn} onPress={validateAndContinue}>
          <Text style={s.primaryBtnText}>Salvar endereço</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { 
    flex: 1, 
    backgroundColor: "#FFFFFF" 
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: {
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  backBtnText: {
    fontSize: 16,
    color: "#111",
    fontWeight: "600",
  },
  content: { 
    paddingHorizontal: 20, 
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111",
    marginTop: 8,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 24,
    color: "#666",
    fontSize: 15,
  },
  loadingBox: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: { 
    color: "#555" 
  },
  formContainer: {
    // Removido o card cinza/com borda para um design mais "clean"
  },
  label: {
    fontSize: 14,
    color: "#333",
    marginBottom: 6,
    marginTop: 12,
    fontWeight: "600",
  },
  input: {
    height: 50,
    borderRadius: 10,
    paddingHorizontal: 16,
    backgroundColor: "#F3F4F6", // Fundo cinza bem claro
    color: "#111",
    fontSize: 15,
  },
  cepRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  cepInput: { 
    flex: 1 
  },
  cepButton: {
    height: 50,
    minWidth: 100,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#111", // Botão Preto
    alignItems: "center",
    justifyContent: "center",
  },
  cepButtonDisabled: {
    opacity: 0.6,
  },
  cepButtonText: {
    color: "#FFF", // Texto Branco
    fontWeight: "700",
    fontSize: 14,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  col: {
    flex: 1,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 16,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  disclaimerText: {
    fontSize: 12,
    color: "#777",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 16,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 12,
    backgroundColor: "#111", // Botão Preto
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#FFF", // Texto Branco
    fontWeight: "700",
    fontSize: 16,
  },
});