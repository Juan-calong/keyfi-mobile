import React, { useCallback, useState } from "react";
import { View, Text, TextInput, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Clipboard from "@react-native-clipboard/clipboard";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { Card } from "../../ui/components/Card";
import { Button } from "../../ui/components/Button";
import { Loading, ErrorState } from "../../ui/components/State";
import { t } from "../../ui/tokens";

import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";
import { useAuthStore } from "../../stores/auth.store";

type MeDTO = {
    role: "SALON_OWNER" | "SELLER" | "ADMIN" | string;
    salon?: {
        id: string;
        name: string;
        referralToken?: string | null;
        referredBySalonId?: string | null;
        referredBySellerId?: string | null;
    } | null;
    seller?: {
        id: string;
        referralToken?: string | null;
    } | null;
};

function normalizeCode(v: any) {
    return String(v ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

function isValidCode8(v: string) {

    return /^[A-HJ-NP-Z2-9]{8}$/.test(v);
}

export function ReferralScreen() {
    const qc = useQueryClient();
    const logout = useAuthStore((s) => s.logout);
    const hydrated = useAuthStore((s) => s.hydrated);
    const token = useAuthStore((s) => s.token);

    const meQ = useQuery<MeDTO>({
        queryKey: ["me"],
        queryFn: async () => {
            const data = (await api.get<MeDTO>(endpoints.profiles.me)).data;
            console.log("ME DATA =>", data);
            return data;
        },
        enabled: hydrated && !!token,
        staleTime: 0,
        retry: false,
    });

    useFocusEffect(
        useCallback(() => {
            meQ.refetch();
        }, [meQ])
    );

    const role = meQ.data?.role ?? "—";
    const salonCode = meQ.data?.salon?.referralToken ?? null;
    const sellerCode = meQ.data?.seller?.referralToken ?? null;
    console.log("ME:", meQ.data);
    console.log("role:", role, "sellerCode:", sellerCode, "salonCode:", salonCode);

    const isSalonOwner = role === "SALON_OWNER";

    const copy = (value: string) => {
        Clipboard.setString(value);
        Alert.alert("Copiado", "Código copiado para a área de transferência.");
    };

    const [applyCode, setApplyCode] = useState("");

    const applyMut = useMutation({
  mutationFn: async () => {
    const code = normalizeCode(applyCode);

    if (!code) {
      throw new Error("CODE_EMPTY");
    }

    const res = await api.patch(
      endpoints.referrals.setSalonReferrerOnce,
      { referralToken: code },
      { headers: { "Idempotency-Key": `apply-ref-${Date.now()}` } }
    );

    console.log("[OWNER_REFERRAL][RES]", res.data);
    return res.data;
  },

  onSuccess: (data: any) => {
    if (data?.ok === false) {
      const msg =
        data?.message ||
        data?.error ||
        "Não foi possível aplicar esse código.";

      Alert.alert("Erro", String(msg));
      return;
    }

    if (data && typeof data === "object" && "applied" in data && data.applied === false) {
      const msg =
        data?.message ||
        data?.error ||
        "Não foi possível aplicar esse código.";

      Alert.alert("Erro", String(msg));
      return;
    }

    setApplyCode("");
    qc.invalidateQueries({ queryKey: ["me"] });
    Alert.alert("Tudo certo", "Código aplicado com sucesso. Esse vínculo é permanente.");
  },

  onError: (e: any) => {
    const status = e?.response?.status;
    const reason = e?.response?.data?.reason;

    let msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      (e?.message === "CODE_EMPTY" ? "Informe um código." : null) ||
      "Falha ao aplicar código.";

    if (reason === "ALREADY_LINKED_SAME_REFERRER") {
      msg = "Esse vínculo já está aplicado.";
    } else if (reason === "ALREADY_LINKED_DIFFERENT_REFERRER") {
      msg = "Já existe um indicador definido e ele não pode ser alterado.";
    } else if (reason === "SALON_OWNERSHIP_REQUIRED") {
      msg = "Você não pode aplicar referral em um salão que não pertence a você.";
    } else if (reason === "INVALID_PAYLOAD") {
      msg = e?.response?.data?.error || "Código inválido.";
    } else if (reason === "INTERNAL_ERROR") {
      msg = "Erro interno ao aplicar o código. Tente novamente.";
    }

    if (status === 409) {
      Alert.alert("Vínculo já definido", String(msg));
      return;
    }

    if (status === 403) {
      Alert.alert("Acesso negado", String(msg));
      return;
    }

    if (status === 400) {
      Alert.alert("Dados inválidos", String(msg));
      return;
    }

    Alert.alert("Erro", String(msg));
  },
});

    return (
        <Screen>
            <Container style={{ flex: 1 }}>
                {/* Header */}
                <View style={{ marginTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 18 }}>Indicação</Text>
                        <Text style={{ color: "rgba(234,240,255,0.65)", fontWeight: "800", marginTop: 4 }}>
                            Use seu token ou aplique um token no salão.
                        </Text>
                    </View>
                    <Button title="Sair" variant="ghost" onPress={logout} />
                </View>

                {/* Body */}
                <View style={{ marginTop: 12, flex: 1, minHeight: 0 }}>
                    {meQ.isLoading ? (
                        <Loading />
                    ) : meQ.isError ? (
                        <ErrorState onRetry={() => meQ.refetch()} />
                    ) : (
                        <>
                            {/* Meu código (somente o que aplica) */}
                            {role === "SALON_OWNER" ? (
                                <Card>
                                    <Text style={{ color: "rgba(234,240,255,0.85)", fontWeight: "900" }}>Código do salão</Text>

                                    <View style={{ marginTop: 10 }}>
                                        <Text style={{ color: "rgba(234,240,255,0.65)", fontWeight: "800" }}>Código do salão</Text>

                                        <View style={{ marginTop: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                                            <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 18 }}>
                                                {salonCode ?? "—"}
                                            </Text>

                                            <Button
                                                title="Copiar"
                                                variant="ghost"
                                                onPress={() => salonCode && copy(salonCode)}
                                                disabled={!salonCode}
                                            />
                                        </View>
                                    </View>
                                </Card>
                            ) : role === "SELLER" ? (
                                <Card>
                                    <Text style={{ color: "rgba(234,240,255,0.85)", fontWeight: "900" }}>Código do vendedor</Text>

                                    <View style={{ marginTop: 10 }}>
                                        <Text style={{ color: "rgba(234,240,255,0.65)", fontWeight: "800" }}>Código do vendedor</Text>

                                        <View style={{ marginTop: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                                            <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 18 }}>
                                                {sellerCode ?? "—"}
                                            </Text>

                                            <Button
                                                title="Copiar"
                                                variant="ghost"
                                                onPress={() => sellerCode && copy(sellerCode)}
                                                disabled={!sellerCode}
                                            />
                                        </View>
                                    </View>
                                </Card>
                            ) : null}

                            <View style={{ height: 12 }} />

                            <Card>
                                <Text style={{ color: "rgba(234,240,255,0.92)", fontWeight: "900", fontSize: 18 }}>
                                Aplicar token
                                </Text>

                                {!isSalonOwner ? (
                                    <Text style={{ marginTop: 8, color: "rgba(234,240,255,0.65)", fontWeight: "800" }}>
                                        Apenas SALON_OWNER pode aplicar um código (porque o vínculo é no salão).
                                    </Text>
                                ) : (
                                    <>
                                        <Text style={{ marginTop: 8, color: "rgba(234,240,255,0.65)", fontWeight: "800" }}>
                                            Digite o token de quem indicou seu salão.
                                        </Text>

                                        <TextInput
                                            value={applyCode}
                                            onChangeText={(v) => setApplyCode(normalizeCode(v).slice(0, 8))}
                                            placeholder="Digite o token"
                                            placeholderTextColor="rgba(234,240,255,0.45)"
                                            autoCapitalize="characters"
                                            autoCorrect={false}
                                            maxLength={8}
                                            style={{
  marginTop: 8,
  height: 48,
  borderWidth: 1,
  borderColor: "rgba(234,240,255,0.12)",
  borderRadius: 12,
  paddingHorizontal: 14,
  backgroundColor: "rgba(255,255,255,0.04)",
  color: t.colors.text,
  fontWeight: "800",
  letterSpacing: 0.8,
                                            }}
                                        />

                                        <View style={{ marginTop: 22, flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                                            <Button
                                                title={applyMut.isPending ? "Aplicando..." : "Aplicar código"}
                                                variant="primary"
                                                onPress={() => {
                                                    if (!applyCode) return;
                                                    Alert.alert("Aplicar código", `Confirmar aplicar: ${normalizeCode(applyCode)} ?`, [
                                                        { text: "Cancelar", style: "cancel" },
                                                        { text: "Confirmar", onPress: () => applyMut.mutate() },
                                                    ]);
                                                }}
                                                loading={applyMut.isPending}
                                                disabled={normalizeCode(applyCode).length !== 8 || applyMut.isPending}
                                            />
                                        </View>
                                    </>
                                )}
                            </Card>
                        </>
                    )}
                </View>
            </Container>
        </Screen>
    );
}
