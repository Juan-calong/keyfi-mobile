import React from "react";
import { View, Text, FlatList } from "react-native";
import { Card } from "../../../ui/components/Card";
import { Button } from "../../../ui/components/Button";
import { Pill } from "../../../ui/components/Pill";
import { Loading, ErrorState, Empty } from "../../../ui/components/State";
import { adminS } from "../admin.ui";
import { formatBRL, formatDate } from "../admin.format";
import { PayoutItem } from "../admin.types";

export function PayoutsTab({
    payoutsQuery,
    approvePayoutMut,
    rejectPayoutMut,
    markPaidMut,
}: {
    payoutsQuery: any;
    approvePayoutMut: any;
    rejectPayoutMut: any;
    markPaidMut: any;
}) {
    return (
        <>
            <View style={adminS.sectionHead}>
                <Text style={adminS.sectionTitle}>Saques</Text>
                <Button title={payoutsQuery.isRefetching ? "Atualizando…" : "Atualizar"} variant="ghost" onPress={() => payoutsQuery.refetch()} />
            </View>

            {payoutsQuery.isLoading ? (
                <Loading />
            ) : payoutsQuery.isError ? (
                <ErrorState onRetry={() => payoutsQuery.refetch()} />
            ) : (
                <FlatList
                    data={payoutsQuery.data ?? []}
                    keyExtractor={(i: PayoutItem) => i.id}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    renderItem={({ item }: { item: PayoutItem }) => (
                        <Card>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={adminS.cardTitle}>{formatBRL(item.amount)}</Text>
                                    <Text style={adminS.cardSub}>
                                        Wallet: {item.wallet.ownerType} • {formatDate(item.createdAt)}
                                    </Text>
                                    <Text style={adminS.cardSub}>Status: {item.status}</Text>
                                </View>
                                <Pill text="REQUESTED" tone="warning" />
                            </View>

                            <View style={adminS.rowWrap}>
                                <Button title="Aprovar" variant="primary" onPress={() => approvePayoutMut.mutate(item.id)} loading={approvePayoutMut.isPending} />
                                <Button title="Rejeitar" variant="danger" onPress={() => rejectPayoutMut.mutate(item.id)} loading={rejectPayoutMut.isPending} />
                                <Button title="Marcar pago" variant="ghost" onPress={() => markPaidMut.mutate(item.id)} loading={markPaidMut.isPending} />
                            </View>
                        </Card>
                    )}
                    ListEmptyComponent={<Empty text="Nenhum saque solicitado." />}
                />
            )}
        </>
    );
}
