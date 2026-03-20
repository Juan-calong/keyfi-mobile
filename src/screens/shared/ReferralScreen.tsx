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
            if (!isValidCode8(code)) {
                throw new Error("Código inválido. Use 8 caracteres (ex: XA84XW8P).");
            }
            return (
                await api.patch(
                    endpoints.referrals.setSalonReferrerOnce,
                    { referralToken: code },
                    { headers: { "Idempotency-Key": `apply-ref-${Date.now()}` } }
                )
            ).data;
        },
        onSuccess: () => {
            setApplyCode("");
            qc.invalidateQueries({ queryKey: ["me"] });
            Alert.alert("Tudo certo", "Código aplicado com sucesso. Esse vínculo é permanente.");
        },
        onError: (e: any) => {
            // 409 = já tem indicador (permanente)
            const status = e?.response?.status;
            const msg =
                e?.response?.data?.error ||
                e?.response?.data?.message ||
                e?.message ||
                "Falha ao aplicar código.";

            if (status === 409) {
                Alert.alert("Já existe indicador", msg);
                return;
            }
            Alert.alert("Erro", msg);
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
                            Veja seu código e aplique um código (salão)
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
                                    <Text style={{ color: "rgba(234,240,255,0.85)", fontWeight: "900" }}>Meu código</Text>

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
                                    <Text style={{ color: "rgba(234,240,255,0.85)", fontWeight: "900" }}>Meu código</Text>

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
                                <Text style={{ color: "rgba(234,240,255,0.85)", fontWeight: "900" }}>Aplicar código</Text>

                                {!isSalonOwner ? (
                                    <Text style={{ marginTop: 8, color: "rgba(234,240,255,0.65)", fontWeight: "800" }}>
                                        Apenas SALON_OWNER pode aplicar u m código (porque o vínculo é no salão).
                                    </Text>
                                ) : (
                                    <>
                                        <Text style={{ marginTop: 8, color: "rgba(234,240,255,0.65)", fontWeight: "800" }}>
                                            Digite o código de 8 caracteres de quem te indicou. Isso é permanente.
                                        </Text>

                                        <TextInput
                                            value={applyCode}
                                            onChangeText={(v) => setApplyCode(normalizeCode(v))}
                                            placeholder="Ex: XA84XW8P"
                                            placeholderTextColor="rgba(234,240,255,0.45)"
                                            autoCapitalize="characters"
                                            autoCorrect={false}
                                            maxLength={8}
                                            style={{
                                                marginTop: 10,
                                                borderWidth: 1,
                                                borderColor: "rgba(234,240,255,0.15)",
                                                borderRadius: 14,
                                                paddingHorizontal: 12,
                                                paddingVertical: 10,
                                                color: t.colors.text,
                                                fontWeight: "900",
                                                letterSpacing: 1.2,
                                            }}
                                        />

                                        <View style={{ marginTop: 12, flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
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
                                                disabled={!applyCode || applyMut.isPending}
                                            />
                                            <Button title="Atualizar" variant="ghost" onPress={() => meQ.refetch()} />
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
