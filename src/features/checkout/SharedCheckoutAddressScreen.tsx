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

import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";
import { friendlyError } from "../../core/errors/friendlyError";

export type CheckoutAddressValues = {
  zipCode: string;
  zipcode?: string;
  streetName: string;
  streetNumber: string;
  neighborhood: string;
  city: string;
  federalUnit: string;
  complement?: string;
};

type Props = {
  title?: string;
  subtitle?: string;
  profileMode: "customer" | "owner";
  initialCouponCode?: string;
  items: { productId: string; qty: number }[];
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

function pickAddressFromProfile(
  me: any,
  mode: "customer" | "owner"
): CheckoutAddressValues {
  const baseUser = me?.user ?? me ?? {};
  const userProfile = me?.profile ?? baseUser?.profile ?? {};
  const rootAddress = me?.address ?? {};
  const profileAddress = userProfile?.address ?? {};
  const userAddress = baseUser?.address ?? {};
  const salon = me?.salon ?? baseUser?.salon ?? userProfile?.salon ?? {};

  const customerSource = {
    zipCode:
      rootAddress?.cep ??
      rootAddress?.zipCode ??
      profileAddress?.cep ??
      profileAddress?.zipCode ??
      userAddress?.cep ??
      userAddress?.zipCode ??
      baseUser?.cep ??
      baseUser?.zipCode ??
      userProfile?.cep ??
      userProfile?.zipCode ??
      "",
    streetName:
      rootAddress?.street ??
      rootAddress?.streetName ??
      profileAddress?.street ??
      profileAddress?.streetName ??
      userAddress?.street ??
      userAddress?.streetName ??
      baseUser?.street ??
      baseUser?.streetName ??
      userProfile?.street ??
      userProfile?.streetName ??
      "",
    streetNumber:
      rootAddress?.number ??
      rootAddress?.streetNumber ??
      profileAddress?.number ??
      profileAddress?.streetNumber ??
      userAddress?.number ??
      userAddress?.streetNumber ??
      baseUser?.number ??
      baseUser?.streetNumber ??
      userProfile?.number ??
      userProfile?.streetNumber ??
      "",
    neighborhood:
      rootAddress?.district ??
      rootAddress?.neighborhood ??
      profileAddress?.district ??
      profileAddress?.neighborhood ??
      userAddress?.district ??
      userAddress?.neighborhood ??
      baseUser?.district ??
      baseUser?.neighborhood ??
      userProfile?.district ??
      userProfile?.neighborhood ??
      "",
    city:
      rootAddress?.city ??
      profileAddress?.city ??
      userAddress?.city ??
      baseUser?.city ??
      userProfile?.city ??
      "",
    federalUnit:
      rootAddress?.state ??
      rootAddress?.federalUnit ??
      profileAddress?.state ??
      profileAddress?.federalUnit ??
      userAddress?.state ??
      userAddress?.federalUnit ??
      baseUser?.state ??
      baseUser?.federalUnit ??
      userProfile?.state ??
      userProfile?.federalUnit ??
      "",
    complement:
      rootAddress?.complement ??
      profileAddress?.complement ??
      userAddress?.complement ??
      baseUser?.complement ??
      userProfile?.complement ??
      "",
  };

  const ownerSource = {
    zipCode:
      salon?.cep ??
      salon?.zipCode ??
      baseUser?.cep ??
      baseUser?.zipCode ??
      userProfile?.cep ??
      userProfile?.zipCode ??
      "",
    streetName:
      salon?.street ??
      salon?.streetName ??
      baseUser?.street ??
      baseUser?.streetName ??
      userProfile?.street ??
      userProfile?.streetName ??
      "",
    streetNumber:
      salon?.number ??
      salon?.streetNumber ??
      baseUser?.number ??
      baseUser?.streetNumber ??
      userProfile?.number ??
      userProfile?.streetNumber ??
      "",
    neighborhood:
      salon?.district ??
      salon?.neighborhood ??
      baseUser?.district ??
      baseUser?.neighborhood ??
      userProfile?.district ??
      userProfile?.neighborhood ??
      "",
    city:
      salon?.city ??
      baseUser?.city ??
      userProfile?.city ??
      "",
    federalUnit:
      salon?.state ??
      salon?.federalUnit ??
      baseUser?.state ??
      baseUser?.federalUnit ??
      userProfile?.state ??
      userProfile?.federalUnit ??
      "",
    complement:
      salon?.complement ??
      baseUser?.complement ??
      userProfile?.complement ??
      "",
  };

  const source = mode === "owner" ? ownerSource : customerSource;

  const cleanZip = onlyDigits(String(source.zipCode || ""));

  return {
    zipCode: maskCep(cleanZip),
    zipcode: cleanZip,
    streetName: String(source.streetName || ""),
    streetNumber: String(source.streetNumber || ""),
    neighborhood: String(source.neighborhood || ""),
    city: String(source.city || ""),
    federalUnit: String(source.federalUnit || "").toUpperCase(),
    complement: String(source.complement || ""),
  };
}

export function SharedCheckoutAddressScreen({
  title = "Endereço de entrega",
  subtitle = "Confirme o endereço antes de calcular o frete",
  profileMode,
  items,
  onContinue,
}: Props) {
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
    if (!meQ.data) return;

    const next = pickAddressFromProfile(meQ.data, profileMode);

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
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={s.title}>{title}</Text>
        <Text style={s.subtitle}>{subtitle}</Text>

        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator />
            <Text style={s.loadingText}>Carregando endereço...</Text>
          </View>
        ) : null}

        <View style={s.card}>
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
                <ActivityIndicator color="#111" />
              ) : (
                <Text style={s.cepButtonText}>Buscar CEP</Text>
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

      <View style={s.footer}>
        <TouchableOpacity style={s.primaryBtn} onPress={validateAndContinue}>
          <Text style={s.primaryBtnText}>Continuar para entrega</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F7F7F7" },
  content: { padding: 18, paddingBottom: 120 },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111",
    marginTop: 18,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 18,
    color: "#666",
    fontSize: 14,
  },
  loadingBox: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: { color: "#555" },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ECECEC",
  },
  label: {
    fontSize: 13,
    color: "#555",
    marginBottom: 6,
    marginTop: 10,
    fontWeight: "600",
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: "#FFF",
    color: "#111",
  },
  cepRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  cepInput: { flex: 1 },
  cepButton: {
    height: 48,
    minWidth: 110,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#F1D07A",
    alignItems: "center",
    justifyContent: "center",
  },
  cepButtonDisabled: {
    opacity: 0.5,
  },
  cepButtonText: {
    color: "#111",
    fontWeight: "700",
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
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#ECECEC",
    backgroundColor: "#F7F7F7",
  },
  primaryBtn: {
    height: 52,
    borderRadius: 999,
    backgroundColor: "#F1D07A",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#111",
    fontWeight: "800",
    fontSize: 16,
  },
});