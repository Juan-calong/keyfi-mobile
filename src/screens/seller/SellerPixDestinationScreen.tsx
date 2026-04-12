import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, ScrollView } from "react-native";
import Clipboard from "@react-native-clipboard/clipboard";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { Card } from "../../ui/components/Card";
import { Button } from "../../ui/components/Button";
import { Pill } from "../../ui/components/Pill";
import { Loading, ErrorState } from "../../ui/components/State";
import { t } from "../../ui/tokens";

import { IosAlert } from "../../ui/components/IosAlert";
import { friendlyError } from "../../core/errors/friendlyError";

type PixKeyType = "CPF" | "CNPJ";

type DestinationDTO = {
  id: string;
  walletId: string;
  pixKey: string;
  pixKeyType: PixKeyType;
  holderName: string;
  holderDoc: string;
  bankName: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

type WalletAPI = {
  wallet?: { id: string; available: string; pending: string };
  destination?: DestinationDTO | null;
  txs?: any[];
  payouts?: any[];
  limits?: any;
};

function onlyDigits(v: string) {
  return String(v ?? "").replace(/\D+/g, "");
}

function maskCpf(value: string) {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function maskCnpj(value: string) {
  const d = onlyDigits(value).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function normalizePixKey(type: PixKeyType, key: string) {
  const raw = String(key ?? "").trim();
  if (type === "CPF") return onlyDigits(raw);

  return onlyDigits(raw);
}

function validatePixKey(type: PixKeyType, key: string) {
  const k = normalizePixKey(type, key);

  if (!k) return "Informe a chave PIX.";

  if (type === "CPF") {
    if (k.length !== 11) return "CPF inválido (precisa ter 11 dígitos).";
  }

  if (type === "CNPJ") {
    if (k.length !== 14) return "CNPJ inválido (precisa ter 14 dígitos).";
  }
  return null;
}

function labelForType(type: PixKeyType) {
  if (type === "CPF") return "CPF";
  return "CNPJ";
}

export function SellerPixDestinationScreen() {
  const qc = useQueryClient();

  const [modal, setModal] = useState<null | { title: string; message: string }>(null);

  const walletQ = useQuery<WalletAPI>({
    queryKey: ["wallet", { txLimit: 1, payoutLimit: 1 }],
    queryFn: async () =>
      (await api.get<WalletAPI>(endpoints.wallet.me, { params: { txLimit: 1, payoutLimit: 1 } })).data,
    retry: false,
    staleTime: 0,
  });

  const destination = walletQ.data?.destination ?? null;
  const hasPix = !!destination;

  const [pixKeyType, setPixKeyType] = useState<PixKeyType>("CPF");
  const [pixKey, setPixKey] = useState("");
  const [holderName, setHolderName] = useState("");
  const [holderDoc, setHolderDoc] = useState("");
  const [bankName, setBankName] = useState("");
  const [notes, setNotes] = useState("");

  // carregar valores se já existir destination
  useEffect(() => {
    if (!destination) return;
    setPixKeyType(destination.pixKeyType === "CPF" || destination.pixKeyType === "CNPJ" ? destination.pixKeyType : "CPF");
    setPixKey(destination.pixKey ?? "");
    setHolderName(destination.holderName ?? "");
    setHolderDoc(destination.holderDoc ?? "");
    setBankName(destination.bankName ?? "");
    setNotes(destination.notes ?? "");
  }, [destination]);

  const normalizedKey = useMemo(() => normalizePixKey(pixKeyType, pixKey), [pixKeyType, pixKey]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const err = validatePixKey(pixKeyType, pixKey);
      if (err) throw new Error(err);

      const payload = {
        pixKeyType,
        pixKey: normalizedKey,
        holderName: String(holderName ?? "").trim(),
        holderDoc: onlyDigits(holderDoc ?? ""),
        bankName: String(bankName ?? "").trim(),
        notes: String(notes ?? "").trim() || null,
      };

      if (!payload.holderName) throw new Error("Informe o nome do titular.");
      if (!payload.holderDoc) throw new Error("Informe o CPF/CNPJ do titular (somente números).");
      if (!payload.bankName) throw new Error("Informe o banco.");

      // Backend: idealmente PUT /wallet/destination (upsert)
      const res = await api.put(endpoints.wallet.destination, payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
      setModal({ title: "Salvo", message: "Seu PIX foi atualizado com sucesso." });
    },
    onError: (e: any) => {
      const fe = friendlyError(e);
      setModal({ title: fe.title || "Erro", message: fe.message || "Falha ao salvar PIX." });
    },
  });

  function copyKey() {
    if (!normalizedKey) return;
    Clipboard.setString(normalizedKey);
    setModal({ title: "Copiado", message: "Chave PIX copiada." });
  }

  return (
    <Screen>
      <Container style={{ flex: 1, paddingTop: 10 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 18 }}>PIX para receber</Text>
            <Text style={{ color: t.colors.text2, fontWeight: "800", marginTop: 4 }}>
              O admin paga suas comissões nesse PIX
            </Text>
          </View>
          <Button title="Atualizar" variant="ghost" onPress={() => walletQ.refetch()} />
        </View>

        <View style={{ height: 12 }} />

        {walletQ.isLoading ? (
          <Loading />
        ) : walletQ.isError ? (
          <ErrorState onRetry={() => walletQ.refetch()} />
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 24, gap: 12 }}>
            {/* Status */}
            <Card style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                <Text style={{ color: t.colors.text, fontWeight: "900" }}>Status</Text>
                <Pill text={hasPix ? "Cadastrado" : "Não cadastrado"} tone={hasPix ? "success" : "warning"} />
              </View>

              <Text style={{ color: t.colors.text2, fontWeight: "800" }}>
                {hasPix
                  ? "Seu PIX está salvo. Quando o admin for pagar, ele usará esses dados."
                  : "Você ainda não cadastrou o PIX. Cadastre agora para conseguir receber."}
              </Text>

              {hasPix ? (
                <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                  <Button title="Copiar chave PIX" variant="ghost" onPress={copyKey} />
                </View>
              ) : null}
            </Card>

            {/* Form */}
            <Card style={{ gap: 10 }}>
              <Text style={{ color: t.colors.text, fontWeight: "900" }}>Dados do PIX</Text>

              {/* Tipo */}
              <Text style={{ color: t.colors.muted, fontWeight: "900", fontSize: 12 }}>Tipo de chave</Text>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                {(["CPF", "CNPJ"] as PixKeyType[]).map((tp) => {
                  const active = pixKeyType === tp;
                  return (
                    <Button
                      key={tp}
                      title={labelForType(tp)}
                      variant={active ? "primary" : "ghost"}
                      onPress={() => setPixKeyType(tp)}
                      disabled={saveMut.isPending}
                    />
                  );
                })}
              </View>

              {/* Chave */}
              <Text style={{ color: t.colors.muted, fontWeight: "900", fontSize: 12 }}>Chave PIX</Text>
              <TextInput
                value={pixKey}
                onChangeText={(value) => setPixKey(pixKeyType === "CPF" ? maskCpf(value) : maskCnpj(value))}
                placeholder="Digite CPF ou CNPJ"
                placeholderTextColor={"rgba(255,255,255,0.35)"}
                keyboardType="numeric"
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  height: 46,
                  borderRadius: t.radius.md,
                  borderWidth: 1,
                  borderColor: t.colors.border,
                  backgroundColor: t.colors.surface,
                  paddingHorizontal: 12,
                  color: t.colors.text,
                  fontWeight: "800",
                }}
              />

              {/* Titular */}
              <Text style={{ color: t.colors.muted, fontWeight: "900", fontSize: 12 }}>Nome do titular</Text>
              <TextInput
                value={holderName}
                onChangeText={setHolderName}
                placeholder="Ex: Fulano de Tal"
                placeholderTextColor={"rgba(255,255,255,0.35)"}
                autoCapitalize="words"
                autoCorrect={false}
                style={{
                  height: 46,
                  borderRadius: t.radius.md,
                  borderWidth: 1,
                  borderColor: t.colors.border,
                  backgroundColor: t.colors.surface,
                  paddingHorizontal: 12,
                  color: t.colors.text,
                  fontWeight: "800",
                }}
              />

              {/* Documento */}
              <Text style={{ color: t.colors.muted, fontWeight: "900", fontSize: 12 }}>CPF/CNPJ do titular</Text>
              <TextInput
                value={holderDoc}
                onChangeText={setHolderDoc}
                placeholder="Somente números"
                placeholderTextColor={"rgba(255,255,255,0.35)"}
                keyboardType="numeric"
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  height: 46,
                  borderRadius: t.radius.md,
                  borderWidth: 1,
                  borderColor: t.colors.border,
                  backgroundColor: t.colors.surface,
                  paddingHorizontal: 12,
                  color: t.colors.text,
                  fontWeight: "800",
                }}
              />

              {/* Banco */}
              <Text style={{ color: t.colors.muted, fontWeight: "900", fontSize: 12 }}>Banco</Text>
              <TextInput
                value={bankName}
                onChangeText={setBankName}
                placeholder="Ex: Banco do Brasil"
                placeholderTextColor={"rgba(255,255,255,0.35)"}
                autoCapitalize="words"
                autoCorrect={false}
                style={{
                  height: 46,
                  borderRadius: t.radius.md,
                  borderWidth: 1,
                  borderColor: t.colors.border,
                  backgroundColor: t.colors.surface,
                  paddingHorizontal: 12,
                  color: t.colors.text,
                  fontWeight: "800",
                }}
              />

              {/* Observações */}
              <Text style={{ color: t.colors.muted, fontWeight: "900", fontSize: 12 }}>Observações (opcional)</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Opcional"
                placeholderTextColor={"rgba(255,255,255,0.35)"}
                autoCapitalize="sentences"
                autoCorrect={false}
                multiline
                style={{
                  minHeight: 46,
                  borderRadius: t.radius.md,
                  borderWidth: 1,
                  borderColor: t.colors.border,
                  backgroundColor: t.colors.surface,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: t.colors.text,
                  fontWeight: "800",
                }}
              />

              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
                <Button
                  title={saveMut.isPending ? "Salvando..." : "Salvar PIX"}
                  onPress={() => saveMut.mutate()}
                  loading={saveMut.isPending}
                />
                <Button title="Copiar chave" variant="ghost" onPress={copyKey} disabled={!normalizedKey} />
              </View>

              <Text style={{ color: t.colors.muted, fontWeight: "800", fontSize: 12, lineHeight: 18 }}>
                Importante: esses dados serão usados pelo admin para pagar suas comissões via PIX.
              </Text>
            </Card>
          </ScrollView>
        )}
      </Container>

      <IosAlert visible={!!modal} title={modal?.title} message={modal?.message} onClose={() => setModal(null)} />
    </Screen>
  );
}