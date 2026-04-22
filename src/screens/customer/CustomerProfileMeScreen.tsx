import React, { useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
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
import { IosAlert } from "../../ui/components/IosAlert";
import { IosConfirm, type IosConfirmAction } from "../../ui/components/IosConfirm";
import { friendlyError } from "../../core/errors/friendlyError";

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

function formatCpf(value?: string | null) {
  const d = onlyDigits(value);
  if (d.length !== 11) return value || "—";
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

function roleLabel(role?: string | null) {
  if (role === "CUSTOMER") return "Cliente";
  if (role === "SALON_OWNER") return "Proprietário do salão";
  if (role === "SELLER") return "Vendedor";
  return role || "Usuário";
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
function pickCPF(me: any) {
  return me?.cpf || me?.profile?.cpf || me?.user?.cpf || "";
}
function pickRole(me: any) {
  return me?.role || me?.type || me?.profile?.role || "CUSTOMER";
}
function pickAddress(me: any) {
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
  | "user.cpf"
  | "user.cep"
  | "user.street"
  | "user.number"
  | "user.district"
  | "user.city"
  | "user.state"
  | "user.complement";

type EditConfig = {
  title: string;
  placeholder: string;
  keyboardType?: "default" | "phone-pad" | "number-pad";
  schema: z.ZodTypeAny;
  normalize?: (v: string) => string;
};

const fieldConfigs: Record<EditFieldKey, EditConfig> = {
  "user.name": {
    title: "Editar nome",
    placeholder: "Seu nome",
    schema: z.string().min(1, "Informe seu nome"),
  },
  "user.phone": {
    title: "Editar telefone",
    placeholder: "11999999999",
    keyboardType: "phone-pad",
    schema: z.string().min(8, "Telefone muito curto"),
    normalize: (v) => onlyDigits(v),
  },
  "user.cpf": {
    title: "Editar CPF",
    placeholder: "000.000.000-00",
    keyboardType: "number-pad",
    schema: z.string().refine((v) => onlyDigits(v).length === 11, "CPF inválido"),
    normalize: (v) => onlyDigits(v),
  },
  "user.cep": {
    title: "Editar CEP",
    placeholder: "00000-000",
    keyboardType: "number-pad",
    schema: z.string().refine((v) => onlyDigits(v).length === 8, "CEP deve ter 8 dígitos"),
    normalize: (v) => onlyDigits(v),
  },
  "user.street": {
    title: "Editar rua",
    placeholder: "Av. Brasil",
    schema: z.string().min(2, "Informe a rua"),
  },
  "user.number": {
    title: "Editar número",
    placeholder: "123",
    schema: z.string().min(1, "Informe o número"),
  },
  "user.district": {
    title: "Editar bairro",
    placeholder: "Centro",
    schema: z.string().min(2, "Informe o bairro"),
  },
  "user.city": {
    title: "Editar cidade",
    placeholder: "Campinas",
    schema: z.string().min(2, "Informe a cidade"),
  },
  "user.state": {
    title: "Editar UF",
    placeholder: "SP",
    schema: z.string().min(2, "UF inválida").max(2, "Use 2 letras").transform((s) => s.toUpperCase()),
    normalize: (v) => trim(v).toUpperCase(),
  },
  "user.complement": {
    title: "Editar complemento",
    placeholder: "Apto 12",
    schema: z.string().optional(),
  },
};

function buildPatch(field: EditFieldKey, value: string) {
  const key = field.replace("user.", "");
  return { user: { [key]: value } };
}

function getCurrentValue(me: any, field: EditFieldKey) {
  const a = pickAddress(me);

  switch (field) {
    case "user.name":
      return me?.name ?? "";
    case "user.phone":
      return me?.phone ?? "";
    case "user.cpf":
      return me?.cpf ?? "";
    case "user.cep":
      return a.cep ?? "";
    case "user.street":
      return a.street ?? "";
    case "user.number":
      return a.number ?? "";
    case "user.district":
      return a.district ?? "";
    case "user.city":
      return a.city ?? "";
    case "user.state":
      return a.state ?? "";
    case "user.complement":
      return a.complement ?? "";
    default:
      return "";
  }
}

function formatCooldown(retryAfterSec?: number | null) {
  const s = Math.max(0, Number(retryAfterSec || 0) | 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r}s`;
  return `${m}m ${String(r).padStart(2, "0")}s`;
}

export function CustomerProfileMeScreen() {
  const qc = useQueryClient();
  const logout = useAuthStore((s) => s.logout);

  const saveLock = useRef(false);

  const [modal, setModal] = useState<null | { title: string; message: string }>(null);
  const [confirm, setConfirm] = useState<null | { title: string; message: string; actions: IosConfirmAction[] }>(null);

  const [banner, setBanner] = useState<null | { title: string; message: string }>(null);
  const [bannerKey, setBannerKey] = useState(0);

  function showBanner(title: string, message: string) {
    setBannerKey((k) => k + 1);
    setBanner({ title, message });
  }

  React.useEffect(() => {
    if (!banner) return;
    const tmr = setTimeout(() => setBanner(null), 3500);
    return () => clearTimeout(tmr);
  }, [bannerKey, banner]);

  const meQ = useQuery<MeDTO>({
    queryKey: ["me"],
    queryFn: async () => (await api.get(endpoints.profiles.me)).data,
    retry: false,
  });

  const me = meQ.data;

  const userName = pickUserName(me);
  const email = pickEmail(me);
  const phone = formatPhoneBR(pickPhone(me));
  const cpf = formatCpf(pickCPF(me));
  const role = pickRole(me);
  const addr = pickAddress(me);
  const cpfDigits = onlyDigits(pickCPF(me));
  const canEditCpf = cpfDigits.length === 0;

  const formattedCep = addr.cep ? formatCep(String(addr.cep)) : "—";

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
      showBanner("Salvo", "Suas alterações foram salvas.");
      await qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (err: any) => {
      const fe: any = friendlyError(err);

      if (fe?.status === 429 && fe?.retryAfterSec) {
        setModal({
          title: "Muitas tentativas",
          message: `Tente novamente em ${formatCooldown(fe.retryAfterSec)}.`,
        });
        return;
      }

      setEditError(String(fe?.message || "Falha ao salvar"));
    },
  });

  function openEdit(field: EditFieldKey) {
    if (!me) return;

    if (field === "user.cpf" && !canEditCpf) {
      setModal({
        title: "CPF bloqueado",
        message: "O CPF não pode ser alterado após ser definido.",
      });
      return;
    }

    const current = getCurrentValue(me, field);

    setEditField(field);
    setEditValue(current ? String(current) : "");
    setEditError(null);
    setEditOpen(true);
  }

  async function buildCepAutoPatch(cepValue: string) {
    const cleanCep = onlyDigits(cepValue);
    const data = await fetchAddressByCep(cleanCep);
    const current = pickAddress(me);

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

  async function handleSave() {
    if (saveLock.current) return;
    if (!editField) return;
        if (editField === "user.cpf" && !canEditCpf) {
      setModal({
        title: "CPF bloqueado",
        message: "O CPF não pode ser alterado após ser definido.",
      });
      return;
    }

    const cfg = fieldConfigs[editField];
    const raw = String(editValue ?? "");
    const normalized = cfg.normalize ? cfg.normalize(raw) : raw;

    const parsed = cfg.schema.safeParse(normalized);
    if (!parsed.success) {
      const first = parsed.error.issues?.[0]?.message || "Valor inválido";
      setEditError(first);
      return;
    }

    saveLock.current = true;

    try {
      if (editField === "user.cep") {
        const patch = await buildCepAutoPatch(String(parsed.data ?? ""));
        await patchM.mutateAsync(patch);
      } else {
        await patchM.mutateAsync(buildPatch(editField, String(parsed.data ?? "")));
      }
    } finally {
      setTimeout(() => {
        saveLock.current = false;
      }, 250);
    }
  }

  const loading = meQ.isLoading || !me;
  const cepEditing = editField === "user.cep";

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
            {banner ? (
              <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 14,
                    backgroundColor: "#F1F5F9",
                    borderWidth: 1,
                    borderColor: "rgba(17,24,39,0.10)",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#0F172A", fontSize: 13, fontWeight: "900", letterSpacing: -0.2 }}>
                      {banner.title}
                    </Text>
                    <Text
                      style={{
                        marginTop: 2,
                        color: "#334155",
                        fontSize: 12,
                        fontWeight: "700",
                        lineHeight: 16,
                      }}
                    >
                      {banner.message}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => setBanner(null)}
                    hitSlop={10}
                    style={({ pressed }) => [
                      {
                        paddingVertical: 6,
                        paddingHorizontal: 10,
                        borderRadius: 10,
                        backgroundColor: "#FFFFFF",
                        borderWidth: 1,
                        borderColor: "rgba(17,24,39,0.10)",
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text style={{ color: "#0B63F6", fontSize: 12, fontWeight: "900", letterSpacing: -0.2 }}>
                      OK
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, paddingTop: 24 }}>
              <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 24, marginBottom: 12 }}>
                Meu perfil
              </Text>

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
  label={canEditCpf ? "CPF" : "CPF bloqueado"}
  value={cpf}
  iconName="card-outline"
  editable={canEditCpf}
  onPress={canEditCpf ? () => openEdit("user.cpf") : undefined}
/>

                <InfoRow label="CEP" value={formattedCep} iconName="pricetag-outline" editable onPress={() => openEdit("user.cep")} />
                <InfoRow label="Rua" value={String(addr.street || "—")} iconName="map-outline" editable onPress={() => openEdit("user.street")} />
                <InfoRow label="Número" value={String(addr.number || "—")} iconName="keypad-outline" editable onPress={() => openEdit("user.number")} />
                <InfoRow label="Bairro" value={String(addr.district || "—")} iconName="pin-outline" editable onPress={() => openEdit("user.district")} />
                <InfoRow label="Cidade" value={String(addr.city || "—")} iconName="business-outline" editable onPress={() => openEdit("user.city")} />
                <InfoRow label="UF" value={String(addr.state || "—")} iconName="flag-outline" editable onPress={() => openEdit("user.state")} />
                <InfoRow label="Complemento" value={String(addr.complement || "—")} iconName="add-outline" editable onPress={() => openEdit("user.complement")} />

                <InfoRow label="Perfil" value={String(role)} iconName="briefcase-outline" />
              </View>

              <View style={{ height: 16 }} />

              <Pressable
                onPress={() => {
                  setConfirm({
                    title: "Sair da conta",
                    message: "Deseja sair?",
                    actions: [
                      { text: "Cancelar", style: "cancel" },
                      {
                        text: "Sair",
                        style: "destructive",
                        onPress: async () => logout(),
                      },
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
                        if (editField === "user.cep") {
                          setEditValue(formatCep(txt));
                        } else {
                          setEditValue(txt);
                        }
                        setEditError(null);
                      }}
                      placeholder={editField ? fieldConfigs[editField].placeholder : ""}
                      keyboardType={editField ? fieldConfigs[editField].keyboardType : "default"}
                      editable={!patchM.isPending}
                      autoCapitalize={editField === "user.state" ? "characters" : "sentences"}
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

            <IosAlert visible={!!modal} title={modal?.title} message={modal?.message} onClose={() => setModal(null)} />
            <IosConfirm
              visible={!!confirm}
              title={confirm?.title}
              message={confirm?.message}
              actions={confirm?.actions || []}
              onClose={() => setConfirm(null)}
            />
          </>
        )}
      </Container>
    </Screen>
  );
}