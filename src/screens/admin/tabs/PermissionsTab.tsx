import React from "react";
import { View, Text, FlatList, Alert } from "react-native";
import { Card } from "../../../ui/components/Card";
import { Button } from "../../../ui/components/Button";
import { Pill } from "../../../ui/components/Pill";
import { Loading, ErrorState, Empty } from "../../../ui/components/State";
import { adminS } from "../admin.ui";
import { formatDate } from "../admin.format";
import { PermissionItem } from "../admin.types";

export function PermissionsTab({
    permissionsQuery,
    approvePermMut,
    rejectPermMut,
    revokePermMut,
}: {
    permissionsQuery: any;
    approvePermMut: any;
    rejectPermMut: any;
    revokePermMut: any;
}) {
    return (
        <>
            <View style={adminS.sectionHead}>
                <Text style={adminS.sectionTitle}>Permissões (Seller ↔ Salão)</Text>
                <Button title={permissionsQuery.isRefetching ? "Atualizando…" : "Atualizar"} variant="ghost" onPress={() => permissionsQuery.refetch()} />
            </View>

            {permissionsQuery.isLoading ? (
                <Loading />
            ) : permissionsQuery.isError ? (
                <ErrorState onRetry={() => permissionsQuery.refetch()} />
            ) : (
                <FlatList
                    data={permissionsQuery.data ?? []}
                    keyExtractor={(i: PermissionItem) => i.id}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    renderItem={({ item }: { item: PermissionItem }) => (
                        <Card>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={adminS.cardTitle} numberOfLines={1}>
                                        {item.salon.name}
                                    </Text>
                                    <Text style={adminS.cardSub} numberOfLines={2}>
                                        Seller: {item.seller.user.name} • {item.seller.user.email}
                                    </Text>
                                    <Text style={adminS.cardSub}>Status: {item.status} • {formatDate(item.createdAt)}</Text>
                                </View>
                                <Pill text="PENDENTE" tone="warning" />
                            </View>

                            <View style={adminS.rowWrap}>
                                <Button title="Aprovar" variant="primary" onPress={() => approvePermMut.mutate(item.id)} loading={approvePermMut.isPending} />
                                <Button title="Rejeitar" variant="danger" onPress={() => rejectPermMut.mutate(item.id)} loading={rejectPermMut.isPending} />
                                <Button
                                    title="Revogar"
                                    variant="ghost"
                                    onPress={() => {
                                        Alert.alert("Revogar", "Revogar permissão deste seller para este salão?", [
                                            { text: "Cancelar", style: "cancel" },
                                            { text: "Revogar", style: "destructive", onPress: () => revokePermMut.mutate(item.id) },
                                        ]);
                                    }}
                                    loading={revokePermMut.isPending}
                                />
                            </View>
                        </Card>
                    )}
                    ListEmptyComponent={<Empty text="Nenhuma permissão pendente." />}
                />
            )}
        </>
    );
}
