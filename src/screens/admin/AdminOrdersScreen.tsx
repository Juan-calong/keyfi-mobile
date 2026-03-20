import React, { useMemo } from "react";
import { View, Text, Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { Card } from "../../ui/components/Card";
import { Button } from "../../ui/components/Button";
import { Pill } from "../../ui/components/Pill";
import { Loading, ErrorState } from "../../ui/components/State";
import { t } from "../../ui/tokens";
import { OrdersService } from "../../core/api/services/orders.service";
import { ScrollView } from "react-native";



function formatBRL(value: string) {
    const n = Number(String(value).replace(",", "."));
    if (!Number.isFinite(n)) return "R$ —";
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatDate(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("pt-BR");
}
function shortId(id: string) {
    if (!id) return "—";
    return id.slice(0, 8);
}

export function AdminOrderDetailsScreen() {
    const nav = useNavigation<any>();
    const route = useRoute<any>();
    const qc = useQueryClient();

    const orderId: string | undefined = route.params?.orderId;


    if (!orderId) {
        return (
            <Screen>
                <Container style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                        <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 18 }}>Pedido</Text>
                        <Button title="Voltar" variant="ghost" onPress={() => nav.goBack()} />
                    </View>

                    <View style={{ marginTop: 12 }}>
                        <Card>
                            <Text style={{ color: t.colors.text, fontWeight: "900" }}>Pedido inválido</Text>
                            <Text style={{ marginTop: 6, color: "rgba(234,240,255,0.65)", fontWeight: "800" }}>
                                Não veio orderId na navegação.
                            </Text>

                            <View style={{ marginTop: 12 }}>
                                <Button title="Voltar" variant="primary" onPress={() => nav.goBack()} />
                            </View>
                        </Card>
                    </View>
                </Container>
            </Screen>
        );
    }


    const q = useQuery({
        queryKey: ["admin-order-detail", orderId],
        queryFn: () => OrdersService.byId(orderId),
    });


    const refundMut = useMutation({
        mutationFn: () => OrdersService.refund(orderId),
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ["admin-orders"] });
            await qc.invalidateQueries({ queryKey: ["admin-order-detail", orderId] });
            Alert.alert("Ok", "Refund solicitado.");
        },
        onError: (e: any) => Alert.alert("Erro", e?.response?.data?.error ?? "Falha ao fazer refund."),
    });

    if (q.isLoading) {
        return (
            <Screen>
                <Container style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                        <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 18 }}>Pedido</Text>
                        <Button title="Voltar" variant="ghost" onPress={() => nav.goBack()} />
                    </View>
                    <Loading />
                </Container>
            </Screen>
        );
    }

    if (q.isError || !q.data) {
        return (
            <Screen>
                <Container style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                        <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 18 }}>Pedido</Text>
                        <Button title="Voltar" variant="ghost" onPress={() => nav.goBack()} />
                    </View>

                    <ErrorState onRetry={() => q.refetch()} />
                </Container>
            </Screen>
        );
    }

    const data = q.data;

    const canRefund = useMemo(() => {
        const pay = data?.paymentStatus;
        return pay === "PAID";
    }, [data?.paymentStatus]);

    return (
        <Screen>
            <Container style={{ flex: 1, paddingTop: 8 }}>
                {/* HEADER */}
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        marginTop: 6,
                    }}
                >
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 18 }}>Pedido</Text>
                        <Text style={{ color: "rgba(234,240,255,0.65)", fontWeight: "800", marginTop: 4 }}>
                            Detalhes e itens
                        </Text>
                    </View>
                    <Button title="Voltar" variant="ghost" onPress={() => nav.goBack()} />
                </View>

                <ScrollView contentContainerStyle={{ paddingTop: 12, paddingBottom: 24, gap: 12 }}>
                    {/* RESUMO */}
                    <Card>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 16 }}>#{data.code}</Text>

                                <Text style={{ color: "rgba(234,240,255,0.65)", fontWeight: "800", marginTop: 8 }}>
                                    {data.buyerType} • {formatDate(data.createdAt)}
                                </Text>

                                <Text style={{ color: t.colors.text, fontWeight: "900", marginTop: 6 }}>
                                    Total: {formatBRL(data.totalAmount)}
                                </Text>
                            </View>

                            <View style={{ alignItems: "flex-end", gap: 8 }}>
                                <Pill text={data.status} tone="muted" />
                                <Pill text={data.paymentStatus} tone={data.paymentStatus === "PAID" ? "success" : "warning"} />
                                <Pill
                                    text={data.adminApprovalStatus ?? "—"}
                                    tone={
                                        data.adminApprovalStatus === "APPROVED"
                                            ? "success"
                                            : data.adminApprovalStatus === "PENDING"
                                                ? "warning"
                                                : "danger"
                                    }
                                />
                            </View>
                        </View>

                        {/* AÇÕES */}
                        <View style={{ marginTop: 14, flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                            <Button
                                title={refundMut.isPending ? "Processando…" : "Refund"}
                                variant="danger"
                                loading={refundMut.isPending}
                                onPress={() =>
                                    Alert.alert("Refund", "Confirmar refund deste pedido?", [
                                        { text: "Cancelar", style: "cancel" },
                                        { text: "Confirmar", style: "destructive", onPress: () => refundMut.mutate() },
                                    ])
                                }
                                disabled={!canRefund || refundMut.isPending}
                            />
                        </View>

                        {!canRefund ? (
                            <Text style={{ marginTop: 10, color: "rgba(234,240,255,0.55)", fontWeight: "800", fontSize: 12 }}>
                                Refund indisponível para este pedido.
                            </Text>
                        ) : null}
                    </Card>

                    {/* ITENS */}
                    <Card>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                            <Text style={{ color: "rgba(234,240,255,0.85)", fontWeight: "900" }}>Itens</Text>
                            <Pill text={`${(data.items ?? []).length}`} tone="muted" />
                        </View>

                        <View style={{ marginTop: 12, gap: 10 }}>
                            {(data.items ?? []).map((it: any, idx: number) => (
                                <View
                                    key={it.id}
                                    style={{
                                        padding: 12,
                                        borderRadius: 14,
                                        backgroundColor: "rgba(255,255,255,0.04)",
                                        borderWidth: 1,
                                        borderColor: "rgba(255,255,255,0.06)",
                                    }}
                                >
                                    <Text style={{ color: t.colors.text, fontWeight: "900" }} numberOfLines={1}>
                                        Item {idx + 1} • {shortId(it.productId)}
                                    </Text>

                                    <Text style={{ color: "rgba(234,240,255,0.65)", fontWeight: "800", marginTop: 6 }}>
                                        {it.qty}x • {formatBRL(it.unitPrice)} • subtotal {formatBRL(it.total)}
                                    </Text>
                                </View>
                            ))}

                            {(data.items ?? []).length === 0 ? (
                                <Text style={{ marginTop: 4, color: "rgba(234,240,255,0.65)", fontWeight: "800" }}>
                                    Sem itens.
                                </Text>
                            ) : null}
                        </View>
                    </Card>
                </ScrollView>
            </Container>
        </Screen>
    );
}