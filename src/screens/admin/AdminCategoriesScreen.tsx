import React, { useMemo, useState } from "react";
import { View, Text, TextInput, FlatList, Alert } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { Card } from "../../ui/components/Card";
import { Button } from "../../ui/components/Button";
import { Chip } from "../../ui/components/Chip";
import { Pill } from "../../ui/components/Pill";
import { Loading, ErrorState, Empty } from "../../ui/components/State";
import { t } from "../../ui/tokens";

import { CategoriesService, Category } from "../../core/api/services/categories.service";

export function AdminCategoriesScreen() {
    const qc = useQueryClient();
    const [name, setName] = useState("");
    const [filter, setFilter] = useState<"all" | "true" | "false">("all");

    const q = useQuery({
        queryKey: ["admin-categories", filter],
        queryFn: async () => {
            const params = filter === "all" ? undefined : { active: filter };
            return CategoriesService.list(params);
        },
        retry: false,
    });

    const items = useMemo(() => q.data ?? [], [q.data]);

    const createMut = useMutation({
        mutationFn: async () => {
            const n = name.trim();
            if (!n) throw new Error("Nome obrigatório");
            return CategoriesService.create(n);
        },
        onSuccess: async () => {
            setName("");
            await qc.invalidateQueries({ queryKey: ["admin-categories"] });
            Alert.alert("OK", "Categoria criada.");
        },
        onError: (e: any) => Alert.alert("Erro", e?.response?.data?.error || e?.message || "Falha"),
    });

    const toggleMut = useMutation({
        mutationFn: ({ id, active }: { id: string; active: boolean }) =>
            CategoriesService.update(id, { active }),
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ["admin-categories"] });
        },
        onError: (e: any) => Alert.alert("Erro", e?.response?.data?.error || "Falha"),
    });

    const renameMut = useMutation({
        mutationFn: ({ id, name }: { id: string; name: string }) =>
            CategoriesService.update(id, { name }),
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ["admin-categories"] });
        },
        onError: (e: any) => Alert.alert("Erro", e?.response?.data?.error || "Falha"),
    });

    return (
        <Screen>
            <Container style={{ flex: 1 }}>
                <View style={{ marginTop: 10, flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 18 }}>Categorias</Text>
                        <Text style={{ color: t.colors.text2, fontWeight: "800", marginTop: 4 }}>
                            Crie e organize produtos por categoria
                        </Text>
                    </View>
                    <Button title={q.isRefetching ? "Atualizando..." : "Atualizar"} variant="ghost" onPress={() => q.refetch()} />
                </View>

                <View style={{ marginTop: 12, flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                    <Chip label="Todos" active={filter === "all"} onPress={() => setFilter("all")} />
                    <Chip label="Ativas" active={filter === "true"} onPress={() => setFilter("true")} />
                    <Chip label="Inativas" active={filter === "false"} onPress={() => setFilter("false")} />
                </View>

                <View style={{ marginTop: 12 }}>
                    <Card>
                        <Text style={{ color: t.colors.text, fontWeight: "900" }}>Nova categoria</Text>
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            placeholder="Ex: Cabelo, Unhas, Skin Care..."
                            placeholderTextColor={t.colors.text2}
                            style={{
                                marginTop: 10,
                                borderWidth: 1,
                                borderColor: t.colors.border,
                                borderRadius: t.radius.md,
                                paddingHorizontal: 12,
                                paddingVertical: 10,
                                color: t.colors.text,
                                fontWeight: "900",
                            }}
                        />
                        <View style={{ marginTop: 12 }}>
                            <Button
                                title={createMut.isPending ? "Criando..." : "Criar"}
                                variant="primary"
                                onPress={() => createMut.mutate()}
                                disabled={!name.trim() || createMut.isPending}
                                loading={createMut.isPending}
                            />
                        </View>
                    </Card>
                </View>

                <View style={{ marginTop: 12, flex: 1, minHeight: 0 }}>
                    {q.isLoading ? (
                        <Loading />
                    ) : q.isError ? (
                        <ErrorState onRetry={() => q.refetch()} />
                    ) : (
                        <FlatList
                            data={items}
                            keyExtractor={(i: Category) => i.id}
                            contentContainerStyle={{ paddingBottom: 120, gap: 12 }}
                            renderItem={({ item }) => {
                                const tone = item.active ? "success" : "muted";
                                return (
                                    <Card>
                                        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ color: t.colors.text, fontWeight: "900" }} numberOfLines={1}>
                                                    {item.name}
                                                </Text>
                                                <Text style={{ color: t.colors.text2, fontWeight: "800", marginTop: 6 }} numberOfLines={1}>
                                                    {item.id}
                                                </Text>
                                            </View>
                                            <Pill text={item.active ? "ATIVA" : "INATIVA"} tone={tone as any} />
                                        </View>

                                        <View style={{ marginTop: 12, flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                                            <Button
                                                title={item.active ? "Desativar" : "Ativar"}
                                                variant={item.active ? "danger" : "primary"}
                                                onPress={() => toggleMut.mutate({ id: item.id, active: !item.active })}
                                                loading={toggleMut.isPending}
                                            />
                                            <Button
                                                title="Renomear"
                                                variant="ghost"
                                                onPress={() => {
                                                    Alert.prompt?.(
                                                        "Renomear",
                                                        "Novo nome:",
                                                        (txt) => {
                                                            const n = String(txt ?? "").trim();
                                                            if (!n) return;
                                                            renameMut.mutate({ id: item.id, name: n });
                                                        }
                                                    );

                                                }}
                                            />
                                        </View>
                                    </Card>
                                );
                            }}
                            ListEmptyComponent={<Empty text="Sem categorias." />}
                        />
                    )}
                </View>
            </Container>
        </Screen>
    );
}
