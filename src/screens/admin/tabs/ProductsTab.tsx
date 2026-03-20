import React, { useMemo, useState } from "react";
import {
    View,
    Text,
    FlatList,
    TextInput,
    ScrollView,
    Modal,
    Pressable,
    SectionList,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useBreakpoints } from "../../../ui/responsive";
import { Card } from "../../../ui/components/Card";
import { Button } from "../../../ui/components/Button";
import { Chip } from "../../../ui/components/Chip";
import { Pill } from "../../../ui/components/Pill";
import { Loading, ErrorState, Empty } from "../../../ui/components/State";

import { adminS } from "../admin.ui";
import { formatBRL } from "../admin.format";
import { Product } from "../admin.types";
import { ADMIN_SCREENS } from "../../../navigation/admin.routes";


import { CategoriesService, Category } from "../../../core/api/services/categories.service";

type CategoryFilter = { kind: "all" } | { kind: "none" } | { kind: "id"; id: string };

type Section = { title: string; data: Product[] };

export function ProductsTab({
    q,
    setQ,
    activeFilter,
    setActiveFilter,
    productsQuery,
    toggleProductMut,
}: {
    q: string;
    setQ: (v: string) => void;
    activeFilter: "all" | "true" | "false";
    setActiveFilter: (v: "all" | "true" | "false") => void;
    productsQuery: any;
    toggleProductMut: any;
}) {
    const nav = useNavigation<any>();
    const qc = useQueryClient();
    const bp = useBreakpoints();
    const numCols = bp.isTablet ? 2 : 1;

    const [catFilter, setCatFilter] = useState<CategoryFilter>({ kind: "all" });
    const [catModalOpen, setCatModalOpen] = useState(false);

    const categoriesQ = useQuery({
        queryKey: ["categories", { active: "true" }],
        queryFn: () => CategoriesService.list({ active: "true" }),
        retry: false,
    });

    const categories: Category[] = (categoriesQ.data ?? []) as any;

    const catLabel = useMemo(() => {
        if (catFilter.kind === "all") return "Todas";
        if (catFilter.kind === "none") return "Sem categoria";
        const found = categories.find((c) => c.id === catFilter.id);
        return found?.name ?? "Categoria";
    }, [catFilter, categories]);

    const [showCreateCat, setShowCreateCat] = useState(false);
    const [newCatName, setNewCatName] = useState("");

    const createCatMut = useMutation({
        mutationFn: async () => {
            const name = newCatName.trim();
            if (name.length < 2) throw new Error("Nome muito curto");
            return CategoriesService.create(name);
        },
        onSuccess: async (created: any) => {
            setNewCatName("");
            setShowCreateCat(false);
            await qc.invalidateQueries({ queryKey: ["categories", { active: "true" }] });
            if (created?.id) setCatFilter({ kind: "id", id: created.id });
        },
    });

    const raw = productsQuery.data;
    const items: Product[] = Array.isArray(raw) ? raw : raw?.items ?? [];

    const filteredItems = useMemo(() => {
        if (catFilter.kind === "all") return items;
        if (catFilter.kind === "none") return items.filter((p: any) => !p.categoryId);
        return items.filter((p: any) => String(p.categoryId ?? "") === catFilter.id);
    }, [items, catFilter]);

    // Sections (somente quando "all")
    const sections: Section[] = useMemo(() => {
        if (catFilter.kind !== "all") return [];

        const map = new Map<string, Product[]>();

        for (const p of items) {
            const title = (p as any)?.category?.name ?? "Sem categoria";
            const arr = map.get(title) ?? [];
            arr.push(p);
            map.set(title, arr);
        }

        const titles = Array.from(map.keys()).sort((a, b) => {
            if (a === "Sem categoria") return 1;
            if (b === "Sem categoria") return -1;
            return a.localeCompare(b, "pt-BR");
        });

        return titles.map((t) => ({ title: t, data: map.get(t) ?? [] }));
    }, [items, catFilter.kind]);

    const activeCount = useMemo(() => (items ?? []).filter((p: any) => !!p.active).length, [items]);

    const [actionsOpen, setActionsOpen] = useState(false);
    const [actionsItem, setActionsItem] = useState<Product | null>(null);

    const openActions = (p: Product) => {
        setActionsItem(p);
        setActionsOpen(true);
    };

    const closeActions = () => {
        setActionsOpen(false);
        setActionsItem(null);
    };


    return (
        <>
            <View style={adminS.sectionHead}>
                <Text style={adminS.sectionTitle}>Produtos</Text>
                <Button
                    title={productsQuery.isRefetching ? "Atualizando…" : "Atualizar"}
                    variant="ghost"
                    onPress={() => productsQuery.refetch()}
                />
            </View>

            { }
            <View style={{ marginBottom: 12 }}>
                <View
                    style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                    }}
                >
                    <Text style={adminS.cardTitle}>Categoria</Text>

                    <Button title={`Filtro: ${catLabel} ▾`} variant="ghost" onPress={() => setCatModalOpen(true)} />
                </View>

                { }
                <View
                    style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                    }}
                >
                    <Text style={adminS.cardSub}>Gerenciar</Text>
                    <Button
                        title={showCreateCat ? "Fechar" : "+ Categoria"}
                        variant="ghost"
                        onPress={() => setShowCreateCat((v) => !v)}
                    />
                </View>

                {showCreateCat ? (
                    <Card style={{ padding: 12 }}>
                        <Text style={adminS.cardSub}>Criar nova categoria</Text>
                        <View style={{ height: 8 }} />
                        <TextInput
                            value={newCatName}
                            onChangeText={setNewCatName}
                            placeholder="Ex: Manicure"
                            placeholderTextColor={"rgba(234,240,255,0.45)"}
                            style={{
                                borderWidth: 1,
                                borderColor: "rgba(255,255,255,0.10)",
                                backgroundColor: "rgba(255,255,255,0.06)",
                                borderRadius: 14,
                                paddingHorizontal: 12,
                                paddingVertical: 10,
                                color: "#EAF0FF",
                                fontWeight: "800",
                            }}
                        />
                        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                            <View style={{ flex: 1 }}>
                                <Button title="Cancelar" variant="ghost" onPress={() => setShowCreateCat(false)} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Button
                                    title={createCatMut.isPending ? "Salvando…" : "Salvar"}
                                    variant="primary"
                                    onPress={() => createCatMut.mutate()}
                                    loading={createCatMut.isPending}
                                    disabled={newCatName.trim().length < 2 || createCatMut.isPending}
                                />
                            </View>
                        </View>

                        {createCatMut.isError ? (
                            <Text style={{ marginTop: 8, color: "rgba(255,92,122,0.95)", fontWeight: "900" as const }}>
                                {((createCatMut.error as any)?.message ?? "Erro ao criar categoria")}
                            </Text>
                        ) : null}
                    </Card>
                ) : null}

                { }
                <Modal visible={actionsOpen} transparent animationType="fade" onRequestClose={closeActions}>
                    <Pressable
                        onPress={closeActions}
                        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", padding: 16, justifyContent: "center" }}
                    >
                        <Pressable
                            onPress={() => { }}
                            style={{ backgroundColor: "#fff", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "rgba(0,0,0,0.10)" }}
                        >
                            <Text style={{ fontWeight: "900" as const, fontSize: 16, marginBottom: 10 }}>
                                Ações: {actionsItem?.name ?? "—"}
                            </Text>

                            <View style={{ gap: 10 }}>
                                <Button
                                    title="Editar"
                                    variant="primary"
                                    onPress={() => {
                                        if (!actionsItem) return;
                                        closeActions();
                                        nav.navigate(ADMIN_SCREENS.ProductForm, { mode: "edit", product: actionsItem });
                                    }}
                                />

                                <Button
                                    title="Estoque"
                                    variant="ghost"
                                    onPress={() => {
                                        if (!actionsItem) return;
                                        const id = actionsItem.id;
                                        closeActions();
                                        nav.navigate(ADMIN_SCREENS.StockAdjust, { productId: id });
                                    }}
                                />

                                <Button
                                    title={actionsItem?.active ? "Desativar" : "Ativar"}
                                    variant={actionsItem?.active ? "danger" : "primary"}
                                    onPress={() => {
                                        if (!actionsItem) return;
                                        const id = actionsItem.id;
                                        const next = !actionsItem.active;
                                        closeActions();
                                        toggleProductMut.mutate({ id, active: next });
                                    }}
                                    loading={toggleProductMut.isPending}
                                />

                                <Button title="Fechar" variant="ghost" onPress={closeActions} />
                            </View>
                        </Pressable>
                    </Pressable>
                </Modal>
            </View>

            {/* LISTAGEM */}
            {productsQuery.isLoading ? (
                <Loading />
            ) : productsQuery.isError ? (
                <ErrorState onRetry={() => productsQuery.refetch()} />
            ) : catFilter.kind === "all" ? (
                <SectionList
                    sections={sections}
                    keyExtractor={(item: Product) => item.id}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    stickySectionHeadersEnabled={false}
                    renderSectionHeader={({ section }) => (
                        <View style={{ marginTop: 12, marginBottom: 8 }}>
                            <Text style={adminS.sectionTitle}>{section.title}</Text>
                            <Text style={adminS.cardSub}>{section.data.length} itens</Text>
                        </View>
                    )}
                    renderItem={({ item }: { item: Product }) => (
                        <View style={{ marginBottom: 12 }}>
                            <Card>
                                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={adminS.cardTitle} numberOfLines={1}>
                                            {item.name}
                                        </Text>
                                        <Text style={adminS.cardSub} numberOfLines={2}>
                                            SKU: {item.sku} • {formatBRL(item.price)}
                                        </Text>
                                    </View>

                                    <View style={{ alignItems: "flex-end", gap: 8 }}>
                                        <Pill text={item.active ? "ATIVO" : "INATIVO"} tone={item.active ? "success" : "muted"} />

                                        <Pressable
                                            onPress={() => openActions(item)}
                                            style={{
                                                paddingHorizontal: 10,
                                                paddingVertical: 6,
                                                borderRadius: 12,
                                                borderWidth: 1,
                                                borderColor: "rgba(0,0,0,0.10)",
                                                backgroundColor: "rgba(0,0,0,0.04)",
                                            }}
                                            android_ripple={{ color: "rgba(0,0,0,0.08)" }}
                                        >
                                            <Text style={{ fontSize: 18, fontWeight: "900" as const, color: "rgba(0,0,0,0.85)" }}>⋯</Text>
                                        </Pressable>
                                    </View>
                                </View>
                            </Card>
                        </View>
                    )}
                    ListEmptyComponent={<Empty text="Nenhum produto encontrado." />}
                />
            ) : (
                <FlatList
                    data={filteredItems}
                    style={{ flex: 1 }}
                    keyExtractor={(i: Product) => i.id}
                    contentContainerStyle={{ paddingBottom: 120, gap: 12 }}
                    renderItem={({ item }: { item: Product }) => {
                        const catName = (item as any)?.category?.name ?? null;
                        const hasCat = !!(item as any)?.categoryId;

                        return (
                            <Card>
                                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={adminS.cardTitle} numberOfLines={1}>
                                            {item.name}
                                        </Text>
                                        <Text style={adminS.cardSub} numberOfLines={2}>
                                            SKU: {item.sku} • {formatBRL(item.price)}
                                        </Text>
                                        <Text style={[adminS.cardSub, { marginTop: 6 }]}>
                                            Categoria: {hasCat ? (catName ?? "—") : "Sem categoria"}
                                        </Text>
                                    </View>

                                    <View style={{ alignItems: "flex-end", gap: 8 }}>
                                        <Pill text={item.active ? "ATIVO" : "INATIVO"} tone={item.active ? "success" : "muted"} />

                                        <Pressable
                                            onPress={() => openActions(item)}
                                            style={{
                                                paddingHorizontal: 10,
                                                paddingVertical: 6,
                                                borderRadius: 12,
                                                borderWidth: 1,
                                                borderColor: "rgba(0,0,0,0.10)",
                                                backgroundColor: "rgba(0,0,0,0.04)",
                                            }}
                                            android_ripple={{ color: "rgba(0,0,0,0.08)" }}
                                        >
                                            <Text style={{ fontSize: 18, fontWeight: "900" as const, color: "rgba(0,0,0,0.85)" }}>⋯</Text>
                                        </Pressable>
                                    </View>
                                </View>


                            </Card>
                        );
                    }}
                    ListEmptyComponent={<Empty text="Nenhum produto encontrado." />}
                />
            )}
        </>
    );
}
