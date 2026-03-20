import React, { useMemo, useState, useEffect } from "react";
import { View, Text, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { Button } from "../../ui/components/Button";
import { Card } from "../../ui/components/Card";
import { t } from "../../ui/tokens";

import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";
import { CategoriesService, Category } from "../../core/api/services/categories.service";
import { StyleSheet } from "react-native";

type RouteParams =
    | { mode: "create" }
    | {
        mode: "edit";
        product: {
            id: string;
            sku: string;
            name: string;
            description?: string | null;
            price: string;
            active: boolean;
            stock?: number | null;
            categoryId?: string | null;
        };
    };

export function AdminProductFormScreen() {
    const nav = useNavigation<any>();
    const route = useRoute<any>();
    const qc = useQueryClient();

    const params = (route.params ?? { mode: "create" }) as RouteParams;
    const isEdit = params.mode === "edit";

    const initial = useMemo(() => {
        if (!isEdit) return { sku: "", name: "", description: "", price: "", active: true, categoryId: null as string | null };
        return {
            sku: params.product.sku ?? "",
            name: params.product.name ?? "",
            description: params.product.description ?? "",
            price: String(params.product.price ?? ""),
            active: !!params.product.active,
            categoryId: params.product.categoryId ?? null,
        };
    }, [isEdit, (params as any)?.product?.id]);

    const [sku, setSku] = useState(initial.sku);
    const [name, setName] = useState(initial.name);
    const [description, setDescription] = useState(initial.description);
    const [price, setPrice] = useState(initial.price);
    const [categoryId, setCategoryId] = useState<string | null>(initial.categoryId ?? null);
    const [newCatName, setNewCatName] = useState("");

    useEffect(() => {
        setSku(initial.sku);
        setName(initial.name);
        setDescription(initial.description);
        setPrice(initial.price);
        setCategoryId(initial.categoryId ?? null);
    }, [initial.sku, initial.name, initial.description, initial.price, initial.categoryId]);

    const categoriesQ = useQuery({
        queryKey: ["categories", { active: "true" }],
        queryFn: () => CategoriesService.list({ active: "true" }),
        retry: false,
    });

    const categories = categoriesQ.data ?? [];

    const canSave = sku.trim().length >= 2 && name.trim().length >= 2 && Number(String(price).replace(",", ".")) > 0;

    const createCatMut = useMutation({
        mutationFn: async () => {
            const name = newCatName.trim();
            if (name.length < 2) throw new Error("Nome da categoria muito curto");
            return CategoriesService.create(name);
        },
        onSuccess: async (cat) => {
            setNewCatName("");
            await qc.invalidateQueries({ queryKey: ["categories", { active: "true" }] });
            setCategoryId(cat.id); // já seleciona a categoria recém criada
            Alert.alert("Ok", "Categoria criada.");
        },
        onError: (e: any) => {
            const msg = e?.response?.data?.error || e?.message || "Falha ao criar categoria.";
            Alert.alert("Erro", msg);
        },
    });


    const saveMut = useMutation({
        mutationFn: async () => {
            const n = Number(String(price).replace(",", "."));
            if (!Number.isFinite(n) || n <= 0) throw new Error("Preço inválido");

            const payload = {
                sku: sku.trim().toUpperCase(),
                name: name.trim(),
                description: description.trim() ? description.trim() : null,
                price: String(n),
                active: true,
                categoryId: categoryId ?? null,
            };

            if (isEdit) {
                const id = (params as any).product.id;
                return (await api.patch(endpoints.products.update(id), payload)).data;
            }

            return (await api.post(endpoints.products.create, payload)).data;
        },
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ["products"] });
            await qc.invalidateQueries({ queryKey: ["seller-products"] });
            Alert.alert("Sucesso", isEdit ? "Produto atualizado." : "Produto criado.");
            nav.goBack();
        },
        onError: (e: any) => {
            const msg = e?.response?.data?.error || e?.response?.data?.message || e?.message || "Não foi possível salvar o produto.";
            Alert.alert("Erro", msg);
        },
    });

    return (
        <Screen>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
                <Container style={{ flex: 1 }}>
                    <View style={s.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={s.title}>{isEdit ? "Editar Produto" : "Novo Produto"}</Text>
                            <Text style={s.sub}>Admin • cadastro de produto</Text>
                        </View>
                        <Button title="Voltar" variant="ghost" onPress={() => nav.goBack()} />
                    </View>

                    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
                        <Card style={s.card}>
                            <Field label="SKU">
                                <TextInput
                                    value={sku}
                                    onChangeText={setSku}
                                    placeholder="Ex: SHAMPOO-01"
                                    placeholderTextColor={t.colors.text2}
                                    autoCapitalize="characters"
                                    style={s.input}
                                />
                            </Field>

                            <Field label="Nome">
                                <TextInput
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Ex: Shampoo Profissional"
                                    placeholderTextColor={t.colors.text2}
                                    style={s.input}
                                />
                            </Field>

                            <Field label="Descrição (opcional)">
                                <TextInput
                                    value={description}
                                    onChangeText={setDescription}
                                    placeholder="Detalhes do produto"
                                    placeholderTextColor={t.colors.text2}
                                    style={[s.input, { height: 96, textAlignVertical: "top" }]}
                                    multiline
                                />
                            </Field>

                            <Field label="Preço (BRL)">
                                <TextInput
                                    value={price}
                                    onChangeText={setPrice}
                                    placeholder="Ex: 49,90"
                                    placeholderTextColor={t.colors.text2}
                                    keyboardType="numeric"
                                    style={s.input}
                                />
                            </Field>

                            <Field label="Categoria (opcional)">
                                {categoriesQ.isLoading ? (
                                    <Text style={s.muted}>Carregando categorias…</Text>
                                ) : categoriesQ.isError ? (
                                    <Text style={s.err}>Falha ao carregar categorias.</Text>
                                ) : (
                                    <View style={{ gap: 8, marginBottom: 10 }}>
                                        <Text style={s.label}>Criar categoria (rápido)</Text>

                                        <TextInput
                                            value={newCatName}
                                            onChangeText={setNewCatName}
                                            placeholder="Ex: Shampoo"
                                            placeholderTextColor={t.colors.text2}
                                            style={s.input}
                                        />

                                        <Button
                                            title={createCatMut.isPending ? "Criando..." : "Criar categoria"}
                                            variant="primary"
                                            onPress={() => createCatMut.mutate()}
                                            disabled={newCatName.trim().length < 2 || createCatMut.isPending}
                                            loading={createCatMut.isPending}
                                        />
                                    </View>

                                )}
                            </Field>

                            <View style={s.actionsRow}>
                                <View style={{ flex: 1 }}>
                                    <Button title="Cancelar" variant="ghost" onPress={() => nav.goBack()} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Button
                                        title={saveMut.isPending ? "Salvando…" : "Salvar"}
                                        onPress={() => saveMut.mutate()}
                                        loading={saveMut.isPending}
                                        variant="primary"
                                        disabled={!canSave || saveMut.isPending}
                                    />
                                </View>
                            </View>

                            {!canSave ? <Text style={s.helper}>Preencha SKU, Nome e um Preço válido.</Text> : null}
                        </Card>
                    </ScrollView>
                </Container>
            </KeyboardAvoidingView>
        </Screen>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <View style={{ marginBottom: 12 }}>
            <Text style={s.label}>{label}</Text>
            {children}
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },

    header: {
        marginTop: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },

    title: { color: "#111111", fontWeight: "900", fontSize: 18 },
    sub: { marginTop: 4, color: "rgba(17,17,17,0.60)", fontWeight: "800" },

    card: {
        marginTop: 12,
        padding: 14,
        borderRadius: 16,
        backgroundColor: "#141414",
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.08)",
    },

    label: { color: "rgba(255,255,255,0.90)", fontWeight: "900", marginBottom: 8 },
    muted: { color: "rgba(255,255,255,0.60)", fontWeight: "800" },
    err: { color: "rgba(255,92,122,0.95)", fontWeight: "900" },

    helper: { marginTop: 10, color: "rgba(255,255,255,0.65)", fontWeight: "800", fontSize: 12 },

    input: {
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
        backgroundColor: "rgba(255,255,255,0.06)",
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: "#FFFFFF",
        fontWeight: "800",
    },

    actionsRow: {
        flexDirection: "row",
        gap: 10,
        marginTop: 12,
    },
});