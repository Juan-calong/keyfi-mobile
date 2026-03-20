import React from "react";
import { View, Text, FlatList, Pressable, Alert } from "react-native";
import { Card } from "../../../ui/components/Card";
import { Button } from "../../../ui/components/Button";
import { Pill } from "../../../ui/components/Pill";
import { Loading, ErrorState, Empty } from "../../../ui/components/State";
import { adminS } from "../admin.ui";
import { formatBRL, formatDate } from "../admin.format";
import { OrderListItem } from "../admin.types";

export function ApprovalsTab({
    approvalsQuery,
    orderDetailQuery,
    approveOrderMut,
    rejectOrderMut,
    selectedOrderId,
    setSelectedOrderId,
}: {
    approvalsQuery: any;
    orderDetailQuery: any;
    approveOrderMut: any;
    rejectOrderMut: any;
    selectedOrderId: string | null;
    setSelectedOrderId: (id: string | null) => void;
}) {
    // ✅ NORMALIZA: aceita array OU {items: []}
    const raw = approvalsQuery.data;
    const items: OrderListItem[] = Array.isArray(raw) ? raw : raw?.items ?? [];

    return (
        <>
            <View style={adminS.sectionHead}>
                <Text style={adminS.sectionTitle}>Pedidos (pagos → aguardando aceite)</Text>
                <Button
                    title={approvalsQuery.isRefetching ? "Atualizando…" : "Atualizar"}
                    variant="ghost"
                    onPress={() => approvalsQuery.refetch()}
                />
            </View>

            {approvalsQuery.isLoading ? (
                <Loading />
            ) : approvalsQuery.isError ? (
                <ErrorState onRetry={() => approvalsQuery.refetch()} />
            ) : (
                <>
                    <FlatList
                        data={items}
                        style={{ flex: 1 }} // ✅ ESSENCIAL
                        keyExtractor={(i: OrderListItem) => i.id}
                        contentContainerStyle={{ paddingBottom: 12 }}
                        renderItem={({ item }: { item: OrderListItem }) => {
                            const selected = selectedOrderId === item.id;
                            return (
                                <Pressable onPress={() => setSelectedOrderId(item.id)} style={{ marginBottom: 12 }}>
                                    <Card style={selected ? { borderColor: "rgba(108,124,255,0.5)" } : undefined}>
                                        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={adminS.cardTitle}>Pedido #{item.code}</Text>
                                                <Text style={adminS.cardSub} numberOfLines={2}>
                                                    {formatBRL(item.totalAmount)} • pagamento: {item.paymentStatus} • {formatDate(item.createdAt)}
                                                </Text>
                                                {(item as any)?.salon?.name ? (
                                                    <Text style={adminS.cardSub}>Salão: {(item as any).salon.name}</Text>
                                                ) : null}
                                            </View>

                                            <Pill text="PENDENTE" tone="warning" />
                                        </View>
                                    </Card>
                                </Pressable>
                            );
                        }}
                        ListEmptyComponent={<Empty text="Nenhum pedido pendente." />}
                    />

                    {selectedOrderId && (
                        <View style={adminS.detailWrap}>
                            <Card>
                                {orderDetailQuery.isLoading ? (
                                    <Loading small />
                                ) : orderDetailQuery.data ? (
                                    <>
                                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                            <View style={{ flex: 1, paddingRight: 12 }}>
                                                <Text style={adminS.detailTitle}>Detalhes</Text>
                                                <Text style={adminS.detailSub}>
                                                    #{orderDetailQuery.data.code} • {formatBRL(orderDetailQuery.data.totalAmount)}
                                                </Text>
                                            </View>
                                            <Pressable onPress={() => setSelectedOrderId(null)} style={adminS.closeX}>
                                                <Text style={adminS.closeXText}>✕</Text>
                                            </Pressable>
                                        </View>

                                        <View style={{ marginTop: 12, gap: 10 }}>
                                            {orderDetailQuery.data.items?.map((it: any) => (
                                                <View key={it.id} style={adminS.itemRow}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={adminS.itemName} numberOfLines={1}>
                                                            {it.product?.name ?? it.productId}
                                                        </Text>
                                                        <Text style={adminS.itemMeta} numberOfLines={1}>
                                                            SKU {it.product?.sku ?? "—"} • {it.qty}x
                                                        </Text>
                                                    </View>
                                                    <Text style={adminS.itemPrice}>{formatBRL(it.total)}</Text>
                                                </View>
                                            ))}
                                        </View>

                                        <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                                            <View style={{ flex: 1 }}>
                                                <Button
                                                    title={approveOrderMut.isPending ? "Aprovando…" : "Aceitar"}
                                                    variant="primary"
                                                    onPress={() => {
                                                        Alert.alert("Aceitar pedido", "Confirmar aceite?", [
                                                            { text: "Cancelar", style: "cancel" },
                                                            { text: "Aceitar", onPress: () => approveOrderMut.mutate(selectedOrderId) },
                                                        ]);
                                                    }}
                                                    loading={approveOrderMut.isPending}
                                                />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Button
                                                    title={rejectOrderMut.isPending ? "Rejeitando…" : "Recusar"}
                                                    variant="danger"
                                                    onPress={() => {
                                                        Alert.alert("Recusar pedido", "Confirmar recusa? (estorno)", [
                                                            { text: "Cancelar", style: "cancel" },
                                                            {
                                                                text: "Recusar",
                                                                style: "destructive",
                                                                onPress: () => rejectOrderMut.mutate(selectedOrderId),
                                                            },
                                                        ]);
                                                    }}
                                                    loading={rejectOrderMut.isPending}
                                                />
                                            </View>
                                        </View>
                                    </>
                                ) : (
                                    <Text style={adminS.cardSub}>Selecione um pedido para ver detalhes.</Text>
                                )}
                            </Card>
                        </View>
                    )}
                </>
            )}
        </>
    );
}
