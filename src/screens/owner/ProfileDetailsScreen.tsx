import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { ErrorState } from "../../ui/components/State";
import { t } from "../../ui/tokens";

import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";
import { useAuthStore } from "../../stores/auth.store";
import { fetchAddressByCep, formatCep } from "../../core/utils/cep";

import Ionicons from "react-native-vector-icons/Ionicons";
import { IosConfirm, type IosConfirmAction } from "../../ui/components/IosConfirm";
import { useNavigation } from "@react-navigation/native";
import { AppBackButton } from "../../ui/components/AppBackButton";

type MeDTO = any;

const onlyDigits = (v: any) => String(v ?? "").replace(/\D/g, "");
const trim = (v: any) => String(v ?? "").trim();

function formatPhoneBR(value?: string | null) {
  const d = onlyDigits(value);
  if (!d) return "Sem telefone";

  if (d.length <= 10) {
    const dd = d.slice(0, 2);
    const p1 = d.slice(2, 6);
    const p2 = d.slice(6, 10);
    if (!dd) return d;
    return `(${dd}) ${p1}${p2 ? "-" + p2 : ""}`;
  }

  const dd = d.slice(0, 2);
  const p1 = d.slice(2, 7);
  const p2 = d.slice(7, 11);
  return `(${dd}) ${p1}${p2 ? "-" + p2 : ""}`;
}

function formatCnpj(value?: string | null) {
  const d = onlyDigits(value);
  if (d.length !== 14) return value || "—";
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
}

function roleLabel(role?: string | null) {
  if (role === "SALON_OWNER") return "Proprietário do salão";
  if (role === "SELLER") return "Vendedor";
  if (role === "CUSTOMER") return "Cliente";
  return role || "Usuário";
}

function cleanMeiLikeName(value?: string | null) {
  const s = trim(value);
  if (!s) return "Seu salão";

  const cleaned = s.replace(/\s+\d{11}$/, "").trim();
  return cleaned || s;
}

function pickUserName(me: any) {
  return me?.name || me?.fullName || me?.profile?.name || me?.user?.name || "Seu nome";
}
function pickEmail(me: any) {
  return me?.email || me?.profile?.email || me?.user?.email || "Sem e-mail";
}
function pickPhone(me: any) {
  return me?.phone || me?.phoneNumber || me?.profile?.phone || me?.profile?.phoneNumber || "";
}
function pickRole(me: any) {
  return me?.role || me?.type || me?.profile?.role || "SALON_OWNER";
}
function pickUserAddress(me: any) {
  const a = me?.address || me?.profile?.address || {};
  return {
    cep: a?.cep || me?.cep || "",
    street: a?.street || me?.street || "",
    number: a?.number || me?.number || "",
    district: a?.district || me?.district || "",
    city: a?.city || me?.city || "",
    state: a?.state || me?.state || "",
    complement: a?.complement || me?.complement || "",
  };
}
function pickSalon(me: any) {
  return me?.salon || me?.profile?.salon || me?.ownerSalon || null;
}
function pickSalonAddress(me: any) {
  const salon = pickSalon(me) || {};
  return {
    cep: salon?.cep || "",
    street: salon?.street || "",
    number: salon?.number || "",
    district: salon?.district || "",
    city: salon?.city || "",
    state: salon?.state || "",
    complement: salon?.complement || "",
  };
}
function pickSalonLegalName(me: any) {
  const salon = pickSalon(me);
  return trim(salon?.name || "");
}
function pickSalonDisplayName(me: any) {
  return cleanMeiLikeName(pickSalonLegalName(me));
}

function hasAnyAddressValue(addr: any) {
  return !!(
    addr?.cep ||
    addr?.street ||
    addr?.number ||
    addr?.district ||
    addr?.city ||
    addr?.state ||
    addr?.complement
  );
}

function pickMergedAddress(me: any) {
  const saddr = pickSalonAddress(me);
  const uaddr = pickUserAddress(me);

  if (hasAnyAddressValue(saddr)) return saddr;
  return uaddr;
}

type InfoRowProps = {
  label: string;
  value: string;
  iconName: string;
  editable?: boolean;
  onPress?: () => void;
};

function InfoRow({ label, value, iconName, editable, onPress }: InfoRowProps) {
  return (
    <>
      <Pressable
        onPress={editable ? onPress : undefined}
        disabled={!editable}
        style={({ pressed }) => [{ opacity: pressed && editable ? 0.85 : 1 }]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12 }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
              backgroundColor: "rgba(17,24,39,0.06)",
            }}
          >
            <Ionicons name={iconName as any} size={18} color="rgba(17,24,39,0.65)" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: t.colors.text2 }}>{label}</Text>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "800",
                color: t.colors.text,
                marginTop: 2,
              }}
              numberOfLines={2}
            >
              {value}
            </Text>
          </View>

          {editable ? (
            <Pressable
              onPress={onPress}
              hitSlop={10}
              style={({ pressed }) => [
                {
                  width: 34,
                  height: 34,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: pressed ? "rgba(17,24,39,0.10)" : "rgba(17,24,39,0.06)",
                },
              ]}
            >
              <Ionicons name="pencil" size={16} color="rgba(17,24,39,0.70)" />
            </Pressable>
          ) : null}
        </View>
      </Pressable>

      <View style={{ height: 1, backgroundColor: t.colors.border, opacity: 0.45 }} />
    </>
  );
}

type EditFieldKey =
  | "user.name"
  | "user.phone"
  | "user.cep"
  | "user.street"
  | "user.number"
  | "user.district"
  | "user.city"
  | "user.state"
  | "user.complement"
  | "salon.name"
  | "salon.email"
  | "salon.cep"
  | "salon.street"
  | "salon.number"
  | "salon.district"
  | "salon.city"
  | "salon.state"
  | "salon.complement";

type EditConfig = {
  title: string;
  placeholder: string;
  keyboardType?: "default" | "phone-pad" | "number-pad" | "email-address";
  schema: z.ZodTypeAny;
  normalize?: (v: string) => string;
};

const zUF = z
  .string()
  .min(2, "UF inválida")
  .max(2, "Use 2 letras")
  .transform((s) => s.toUpperCase());

const fieldConfigs: Record<EditFieldKey, EditConfig> = {
  "user.name": {
    title: "Editar seu nome",
    placeholder: "Seu nome",
    schema: z.string().min(1, "Informe seu nome"),
  },
  "user.phone": {
    title: "Editar seu telefone",
    placeholder: "11999999999",
    keyboardType: "phone-pad",
    schema: z.string().min(8, "Telefone muito curto"),
    normalize: (v) => onlyDigits(v),
  },
  "user.cep": {
    title: "Editar seu CEP",
    placeholder: "00000-000",
    keyboardType: "number-pad",
    schema: z.string().refine((v) => onlyDigits(v).length === 8, "CEP deve ter 8 dígitos"),
    normalize: (v) => onlyDigits(v),
  },
  "user.street": {
    title: "Editar sua rua",
    placeholder: "Av. Brasil",
    schema: z.string().min(2, "Informe a rua"),
  },
  "user.number": {
    title: "Editar seu número",
    placeholder: "123",
    schema: z.string().min(1, "Informe o número"),
  },
  "user.district": {
    title: "Editar seu bairro",
    placeholder: "Centro",
    schema: z.string().min(2, "Informe o bairro"),
  },
  "user.city": {
    title: "Editar sua cidade",
    placeholder: "Campinas",
    schema: z.string().min(2, "Informe a cidade"),
  },
  "user.state": {
    title: "Editar sua UF",
    placeholder: "SP",
    schema: zUF,
    normalize: (v) => trim(v).toUpperCase(),
  },
  "user.complement": {
    title: "Editar seu complemento",
    placeholder: "Apto 12",
    schema: z.string().optional(),
  },

  "salon.name": {
    title: "Editar nome do salão",
    placeholder: "Meu salão",
    schema: z.string().min(1, "Informe o nome"),
  },
  "salon.email": {
    title: "Editar e-mail do salão",
    placeholder: "contato@meusalao.com",
    keyboardType: "email-address",
    schema: z.string().email("E-mail inválido"),
    normalize: (v) => trim(v),
  },
  "salon.cep": {
    title: "Editar CEP do salão",
    placeholder: "00000-000",
    keyboardType: "number-pad",
    schema: z.string().refine((v) => onlyDigits(v).length === 8, "CEP deve ter 8 dígitos"),
    normalize: (v) => onlyDigits(v),
  },
  "salon.street": {
    title: "Editar rua do salão",
    placeholder: "Av. Brasil",
    schema: z.string().min(2, "Informe a rua"),
  },
  "salon.number": {
    title: "Editar número do salão",
    placeholder: "123",
    schema: z.string().min(1, "Informe o número"),
  },
  "salon.district": {
    title: "Editar bairro do salão",
    placeholder: "Centro",
    schema: z.string().min(2, "Informe o bairro"),
  },
  "salon.city": {
    title: "Editar cidade do salão",
    placeholder: "Campinas",
    schema: z.string().min(2, "Informe a cidade"),
  },
  "salon.state": {
    title: "Editar UF do salão",
    placeholder: "SP",
    schema: zUF,
    normalize: (v) => trim(v).toUpperCase(),
  },
  "salon.complement": {
    title: "Editar complemento do salão",
    placeholder: "Sala 12",
    schema: z.string().optional(),
  },
};

function buildSimplePatch(field: EditFieldKey, value: string) {
  if (field.startsWith("user.")) {
    const key = field.replace("user.", "");
    return { user: { [key]: value } };
  }

  if (field.startsWith("salon.")) {
    const key = field.replace("salon.", "");
    return { salon: { [key]: value } };
  }

  return {};
}

function getCurrentValue(me: any, field: EditFieldKey) {
  const salon = pickSalon(me) || {};
  const uaddr = pickUserAddress(me);
  const saddr = pickSalonAddress(me);

  switch (field) {
    case "user.name":
      return me?.name ?? "";
    case "user.phone":
      return me?.phone ?? "";
    case "user.cep":
      return uaddr.cep ?? "";
    case "user.street":
      return uaddr.street ?? "";
    case "user.number":
      return uaddr.number ?? "";
    case "user.district":
      return uaddr.district ?? "";
    case "user.city":
      return uaddr.city ?? "";
    case "user.state":
      return uaddr.state ?? "";
    case "user.complement":
      return uaddr.complement ?? "";

    case "salon.name":
      return salon?.name ?? "";
    case "salon.email":
      return salon?.email ?? "";
    case "salon.cep":
      return saddr.cep ?? "";
    case "salon.street":
      return saddr.street ?? "";
    case "salon.number":
      return saddr.number ?? "";
    case "salon.district":
      return saddr.district ?? "";
    case "salon.city":
      return saddr.city ?? "";
    case "salon.state":
      return saddr.state ?? "";
    case "salon.complement":
      return saddr.complement ?? "";
    default:
      return "";
  }
}

export function OwnerProfileDetailsScreen() {
  const nav = useNavigation<any>();
  const qc = useQueryClient();
  const logout = useAuthStore((s) => s.logout);

  const [confirm, setConfirm] = useState<null | { title: string; message: string; actions: IosConfirmAction[] }>(null);

  const meQ = useQuery<MeDTO>({
    queryKey: ["me"],
    queryFn: async () => (await api.get(endpoints.profiles.me)).data,
    retry: false,
  });

  const me = meQ.data;

  const userName = pickUserName(me);
  const email = pickEmail(me);
  const phone = formatPhoneBR(pickPhone(me));
  const role = pickRole(me);

  const salon = pickSalon(me);
  const salonDisplayName = pickSalonDisplayName(me);

  const salonEmail = salon?.email || "—";
  const salonCnpj = formatCnpj(salon?.cnpj || "");

  const mergedAddr = pickMergedAddress(me);
  const formattedCep = mergedAddr.cep ? formatCep(String(mergedAddr.cep)) : "—";

  const addressPrefix = salon ? "salon" : "user";

  const cepField = `${addressPrefix}.cep` as EditFieldKey;
  const streetField = `${addressPrefix}.street` as EditFieldKey;
  const numberField = `${addressPrefix}.number` as EditFieldKey;
  const districtField = `${addressPrefix}.district` as EditFieldKey;
  const cityField = `${addressPrefix}.city` as EditFieldKey;
  const stateField = `${addressPrefix}.state` as EditFieldKey;
  const complementField = `${addressPrefix}.complement` as EditFieldKey;

  const [editOpen, setEditOpen] = useState(false);
  const [editField, setEditField] = useState<EditFieldKey | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const patchM = useMutation({
    mutationFn: async (patch: any) => (await api.patch(endpoints.profiles.me, patch)).data,
    onSuccess: async () => {
      setEditOpen(false);
      setEditField(null);
      setEditError(null);
      await qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.response?.data?.message || "Falha ao salvar";
      setEditError(String(msg));
    },
  });

  function openEdit(field: EditFieldKey) {
    if (!me) return;
    const current = getCurrentValue(me, field);

    setEditField(field);
    setEditValue(current ? String(current) : "");
    setEditError(null);
    setEditOpen(true);
  }

  async function buildCepAutoPatch(field: "user.cep" | "salon.cep", cepValue: string) {
    const cleanCep = onlyDigits(cepValue);
    const data = await fetchAddressByCep(cleanCep);

    if (field === "user.cep") {
      const current = pickUserAddress(me);

      return {
        user: {
          cep: cleanCep,
          street: data.street || current.street || "",
          district: data.district || current.district || "",
          city: data.city || current.city || "",
          state: data.state || current.state || "",
          number: current.number || "",
          complement: current.complement || "",
        },
      };
    }

    const current = pickSalonAddress(me);

    return {
      salon: {
        cep: cleanCep,
        street: data.street || current.street || "",
        district: data.district || current.district || "",
        city: data.city || current.city || "",
        state: data.state || current.state || "",
        number: current.number || "",
        complement: current.complement || "",
      },
    };
  }

  async function handleSave() {
    if (!editField) return;

    const cfg = fieldConfigs[editField];
    const raw = String(editValue ?? "");
    const normalized = cfg.normalize ? cfg.normalize(raw) : raw;

    const parsed = cfg.schema.safeParse(normalized);
    if (!parsed.success) {
      const first = parsed.error.issues?.[0]?.message || "Valor inválido";
      setEditError(first);
      return;
    }

    try {
      if (editField === "user.cep" || editField === "salon.cep") {
        const patch = await buildCepAutoPatch(editField, String(parsed.data ?? ""));
        await patchM.mutateAsync(patch);
        return;
      }

      await patchM.mutateAsync(buildSimplePatch(editField, String(parsed.data ?? "")));
    } catch {
      // o erro principal já cai no onError da mutation
    }
  }

  const loading = meQ.isLoading || !me;
  const cepEditing = editField === "user.cep" || editField === "salon.cep";

  return (
    <Screen>
      <Container style={{ flex: 1 }}>
        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={t.colors.text} />
          </View>
        ) : meQ.isError ? (
          <ErrorState onRetry={() => meQ.refetch()} />
        ) : (
          <>
<ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, paddingTop: 12 }}>
  <View
    style={{
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginBottom: 12,
    }}
  >
    <AppBackButton
      onPress={() => nav.goBack()}
      showLabel={false}
      color={t.colors.text}
      iconSize={24}
      style={{
        minWidth: 40,
        minHeight: 40,
        paddingRight: 0,
      }}
    />

    <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 24 }}>
      Meu perfil
    </Text>
  </View>

              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 24,
                  padding: 20,
                  borderWidth: 1,
                  borderColor: t.colors.border,
                  shadowColor: "#000",
                  shadowOpacity: 0.06,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 3,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 24,
                      backgroundColor: "rgba(17,24,39,0.06)",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 16,
                    }}
                  >
                    <Ionicons name="person" size={34} color="rgba(17,24,39,0.65)" />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 22, fontWeight: "800", color: t.colors.text }} numberOfLines={1}>
                      {userName}
                    </Text>
                    <Text
                      style={{ marginTop: 4, fontSize: 14, fontWeight: "600", color: t.colors.text2 }}
                      numberOfLines={1}
                    >
                      {roleLabel(role)}
                    </Text>
                  </View>
                </View>

                <View style={{ height: 1, backgroundColor: t.colors.border, opacity: 0.6, marginVertical: 16 }} />

                <InfoRow label="Nome" value={userName} iconName="person-outline" editable onPress={() => openEdit("user.name")} />
                <InfoRow label="Email" value={email} iconName="mail-outline" />
                <InfoRow label="Telefone" value={phone} iconName="call-outline" editable onPress={() => openEdit("user.phone")} />

                <InfoRow
                  label="Nome do salão"
                  value={String(salonDisplayName || "Seu salão")}
                  iconName="storefront-outline"
                  editable
                  onPress={() => openEdit("salon.name")}
                />

                <InfoRow label="CNPJ" value={String(salonCnpj)} iconName="briefcase-outline" />

                <InfoRow
                  label="E-mail do salão"
                  value={String(salonEmail)}
                  iconName="mail-outline"
                  editable
                  onPress={() => openEdit("salon.email")}
                />

                <InfoRow
                  label="CEP"
                  value={formattedCep}
                  iconName="pricetag-outline"
                  editable
                  onPress={() => openEdit(cepField)}
                />
                <InfoRow
                  label="Rua"
                  value={String(mergedAddr.street || "—")}
                  iconName="map-outline"
                  editable
                  onPress={() => openEdit(streetField)}
                />
                <InfoRow
                  label="Número"
                  value={String(mergedAddr.number || "—")}
                  iconName="keypad-outline"
                  editable
                  onPress={() => openEdit(numberField)}
                />
                <InfoRow
                  label="Bairro"
                  value={String(mergedAddr.district || "—")}
                  iconName="pin-outline"
                  editable
                  onPress={() => openEdit(districtField)}
                />
                <InfoRow
                  label="Cidade"
                  value={String(mergedAddr.city || "—")}
                  iconName="business-outline"
                  editable
                  onPress={() => openEdit(cityField)}
                />
                <InfoRow
                  label="UF"
                  value={String(mergedAddr.state || "—")}
                  iconName="flag-outline"
                  editable
                  onPress={() => openEdit(stateField)}
                />
                <InfoRow
                  label="Complemento"
                  value={String(mergedAddr.complement || "—")}
                  iconName="add-outline"
                  editable
                  onPress={() => openEdit(complementField)}
                />

                <InfoRow label="Perfil" value={roleLabel(role)} iconName="briefcase-outline" />
              </View>

              <View style={{ height: 16 }} />

              <Pressable
                onPress={() => {
                  setConfirm({
                    title: "Sair da conta",
                    message: "Deseja sair?",
                    actions: [
                      { text: "Cancelar", style: "cancel" },
                      { text: "Sair", style: "destructive", onPress: async () => logout() },
                    ],
                  });
                }}
                style={({ pressed }) => [
                  {
                    backgroundColor: "#FFFFFF",
                    borderRadius: 18,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderWidth: 1,
                    borderColor: "#FECACA",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 12,
                      backgroundColor: "#FEF2F2",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 10,
                    }}
                  >
                    <Ionicons name="exit-outline" size={18} color="#DC2626" />
                  </View>

                  <Text style={{ fontSize: 16, fontWeight: "800", color: "#DC2626" }}>Sair da conta</Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color="rgba(220,38,38,0.65)" />
              </Pressable>
            </ScrollView>

            <Modal
              visible={editOpen}
              transparent
              animationType="fade"
              onRequestClose={() => (patchM.isPending ? null : setEditOpen(false))}
            >
              <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", padding: 16, justifyContent: "center" }}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
                  <View
                    style={{
                      backgroundColor: "#FFF",
                      borderRadius: 20,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: t.colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 18, fontWeight: "900", color: t.colors.text, marginBottom: 10 }}>
                      {editField ? fieldConfigs[editField].title : "Editar"}
                    </Text>

                    <TextInput
                      value={editValue}
                      onChangeText={(txt) => {
                        if (editField === "user.cep" || editField === "salon.cep") {
                          setEditValue(formatCep(txt));
                        } else {
                          setEditValue(txt);
                        }
                        setEditError(null);
                      }}
                      placeholder={editField ? fieldConfigs[editField].placeholder : ""}
                      keyboardType={editField ? fieldConfigs[editField].keyboardType : "default"}
                      editable={!patchM.isPending}
                      autoCapitalize={
                        editField === "user.state" || editField === "salon.state" ? "characters" : "sentences"
                      }
                      style={{
                        borderWidth: 1,
                        borderColor: editError ? "#FCA5A5" : t.colors.border,
                        borderRadius: 14,
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                        fontSize: 16,
                        color: t.colors.text,
                      }}
                    />

                    {cepEditing ? (
                      <Text
                        style={{
                          marginTop: 8,
                          color: "#64748B",
                          fontSize: 12,
                          fontWeight: "700",
                          lineHeight: 17,
                        }}
                      >
                        Ao salvar o CEP, rua, bairro, cidade e UF serão atualizados automaticamente.
                      </Text>
                    ) : null}

                    {editError ? (
                      <Text style={{ marginTop: 8, color: "#DC2626", fontWeight: "700" }}>{editError}</Text>
                    ) : null}

                    <View style={{ height: 14 }} />

                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <Pressable
                        onPress={() => setEditOpen(false)}
                        disabled={patchM.isPending}
                        style={{
                          flex: 1,
                          borderRadius: 14,
                          paddingVertical: 12,
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: 1,
                          borderColor: t.colors.border,
                          backgroundColor: "#FFF",
                          opacity: patchM.isPending ? 0.6 : 1,
                        }}
                      >
                        <Text style={{ fontWeight: "800", color: t.colors.text }}>Cancelar</Text>
                      </Pressable>

                      <Pressable
                        onPress={handleSave}
                        disabled={patchM.isPending || !editField}
                        style={{
                          flex: 1,
                          borderRadius: 14,
                          paddingVertical: 12,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "#111827",
                          opacity: patchM.isPending ? 0.7 : 1,
                        }}
                      >
                        {patchM.isPending ? (
                          <ActivityIndicator color="#FFF" />
                        ) : (
                          <Text style={{ fontWeight: "900", color: "#FFF" }}>Salvar</Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                </KeyboardAvoidingView>
              </View>
            </Modal>
          </>
        )}
      </Container>

      <IosConfirm
        visible={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        actions={confirm?.actions || []}
        onClose={() => setConfirm(null)}
      />
    </Screen>
  );
}