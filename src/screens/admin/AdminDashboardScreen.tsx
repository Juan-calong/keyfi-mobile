import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TextInput } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../../core/api/client";
import { ADMIN_ROUTES } from "./adminRoutes";
import { ADMIN_SCREENS } from "../../navigation/admin.routes";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { Segmented } from "../../ui/components/Segmented";
import { Button } from "../../ui/components/Button";
import { Pill } from "../../ui/components/Pill";
import { adminS } from "./admin.ui";

import { TabKey, Product, OrderListItem, OrderDetail } from "./admin.types";
import { ProductsTab } from "./tabs/ProductsTab";
import { ApprovalsTab } from "./tabs/ApprovalsTab";
import { useAuthStore } from "../../stores/auth.store";
import { t } from "../../ui/tokens"
import { Card } from "../../ui/components/Card";

export function AdminDashboardScreen() {
    console.log("ADMIN DASHBOARD v2 (produtos + pedidos)");

    const nav = useNavigation<any>();
    const qc = useQueryClient();
    const logout = useAuthStore((s) => s.logout);

    const [tab, setTab] = useState<TabKey>("PRODUCTS");
    const [q, setQ] = useState("");
    const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">("all");
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

    const productsKey = useMemo(() => ["products", { q, activeFilter }] as const, [q, activeFilter]);

    const productsQuery = useQuery<Product[]>({
        queryKey: productsKey,
        queryFn: async () => {
            const res = await api.get<{ items: Product[] }>(ADMIN_ROUTES.products.list, {
                params: {
                    take: 200,
                    q: q || undefined,
                    active: activeFilter === "all" ? undefined : activeFilter,
                },
            });
            return res.data.items ?? [];
        },
        enabled: tab === "PRODUCTS",
        retry: false,
    });

    const toggleProductMut = useMutation({
        mutationFn: async (vars: { id: string; active: boolean }) =>
            (await api.patch(ADMIN_ROUTES.products.update(vars.id), { active: vars.active })).data,
        onSuccess: () => qc.invalidateQueries({ queryKey: productsKey }),
    });

    const approvalsKey = useMemo(() => ["admin-orders", "pending-paid"] as const, []);

    const approvalsQuery = useQuery<OrderListItem[]>({
        queryKey: approvalsKey,
        queryFn: async () => {
            const res = await api.get<{ items: OrderListItem[] }>(ADMIN_ROUTES.orders.list, {
                params: { take: 100 },
            });

            const items = res.data?.items ?? [];

            // ✅ filtro correto: só pagos e pendentes
            return items.filter((o) => o.paymentStatus === "PAID" && o.adminApprovalStatus === "PENDING");
        },
        enabled: tab === "APPROVALS",
        retry: false,
        staleTime: 0,
    });

    const orderDetailQuery = useQuery<OrderDetail | null>({
        queryKey: ["order", selectedOrderId] as const,
        queryFn: async () => {
            if (!selectedOrderId) return null;
            const res = await api.get<OrderDetail>(ADMIN_ROUTES.orders.byId(selectedOrderId));
            return res.data;
        },
        enabled: tab === "APPROVALS" && !!selectedOrderId,
        retry: false,
    });

    useEffect(() => {
        if (!selectedOrderId) return;
        const stillExists = (approvalsQuery.data ?? []).some((o) => o.id === selectedOrderId);
        if (!stillExists) setSelectedOrderId(null);
    }, [selectedOrderId, approvalsQuery.data]);

    const approveOrderMut = useMutation({
        mutationFn: async (orderId: string) => {
            const res = await api.patch(
                `/admin/orders/${orderId}`,
                { action: "approve" },
                { headers: { "Idempotency-Key": `approve-${orderId}-${Date.now()}` } }
            );
            console.log("[APPROVE] res:", res.status, res.data);
            return res.data;
        },
        onSuccess: (_data, orderId) => {

            setSelectedOrderId(null);


            qc.setQueryData<OrderListItem[]>(approvalsKey, (old) => (old ?? []).filter((o) => o.id !== orderId));


            qc.invalidateQueries({ queryKey: approvalsKey });


            qc.invalidateQueries({ queryKey: ["order", orderId] });
        },
        onError: (e: any) => {
            console.log("[APPROVE][ERROR]", e?.response?.status, e?.response?.data);
        },
    });

    const rejectOrderMut = useMutation({
        mutationFn: async (orderId: string) => {
            const res = await api.patch(
                `/admin/orders/${orderId}`,
                { action: "reject" },
                { headers: { "Idempotency-Key": `reject-${orderId}-${Date.now()}` } }
            );
            console.log("[REJECT] res:", res.status, res.data);
            return res.data;
        },
        onSuccess: (_data, orderId) => {
            setSelectedOrderId(null);

            qc.setQueryData<OrderListItem[]>(approvalsKey, (old) => (old ?? []).filter((o) => o.id !== orderId));
            qc.invalidateQueries({ queryKey: approvalsKey });
            qc.invalidateQueries({ queryKey: ["order", orderId] });
        },
        onError: (e: any) => {
            console.log("[REJECT][ERROR]", e?.response?.status, e?.response?.data);
        },
    });

    const stats = useMemo(() => {
        const totalProducts = (productsQuery.data ?? []).length;
        const inativos = (productsQuery.data ?? []).filter((p) => !p.active).length;

        const pendingPaidOrders = (approvalsQuery.data ?? []).length;

        return [
            { label: "Produtos", value: totalProducts, tone: "primary" as const },
            { label: "Inativos", value: inativos, tone: "muted" as const },
            { label: "Pendentes", value: pendingPaidOrders, tone: "warning" as const },
        ];
    }, [productsQuery.data, approvalsQuery.data]);

    const onRefresh = () => {
        if (tab === "PRODUCTS") productsQuery.refetch();
        if (tab === "APPROVALS") approvalsQuery.refetch();
    };

    const cta = useMemo(() => {
        if (tab === "PRODUCTS") {
            return { label: "+ Novo produto", onPress: () => nav.navigate(ADMIN_SCREENS.ProductForm, { mode: "create" }) };
        }
        return { label: "Atualizar", onPress: onRefresh };
    }, [tab, nav, onRefresh]);

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
                        <Text style={adminS.hTitle}>KEYFI</Text>
                        <Text style={adminS.hSub}>Admin</Text>
                    </View>

                    <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                        <Button title="↻" variant="ghost" onPress={onRefresh} />
                        <Button title="Sair" variant="ghost" onPress={logout} />
                    </View>
                </View>

                {/* STATS (GRADE, SEM SCROLL) */}
                <View style={{ marginTop: 12, flexDirection: "row", gap: 10 }}>
                    {stats.map((it) => (
                        <View key={it.label} style={{ flex: 1 }}>
                            <Card style={{ padding: 12 }}>
                                <Text style={adminS.statLabel}>{it.label}</Text>
                                <Text style={adminS.statValue}>{it.value}</Text>
                                <View style={{ marginTop: 8 }}>
                                    <Pill text={it.label} tone={it.tone as any} />
                                </View>
                            </Card>
                        </View>
                    ))}
                </View>

                {/* TABS */}
                <View style={{ marginTop: 12 }}>
                    <Segmented<TabKey>
                        value={tab}
                        onChange={(v) => {
                            setTab(v);
                            setSelectedOrderId(null);
                        }}
                        items={[
                            { key: "PRODUCTS", label: "Produtos" },
                            { key: "APPROVALS", label: "Pedidos" },
                        ]}
                    />
                </View>

                {/* BODY */}
                <View style={{ marginTop: 12, flex: 1, minHeight: 0 }}>
                    {tab === "PRODUCTS" && (
                        <ProductsTab
                            q={q}
                            setQ={setQ}
                            activeFilter={activeFilter}
                            setActiveFilter={setActiveFilter}
                            productsQuery={productsQuery}
                            toggleProductMut={toggleProductMut}
                        />
                    )}

                    {tab === "APPROVALS" && (
                        <ApprovalsTab
                            approvalsQuery={approvalsQuery}
                            orderDetailQuery={orderDetailQuery}
                            approveOrderMut={approveOrderMut}
                            rejectOrderMut={rejectOrderMut}
                            selectedOrderId={selectedOrderId}
                            setSelectedOrderId={setSelectedOrderId}
                        />
                    )}
                </View>

                {/* FAB */}
                <View style={adminS.fabWrap}>
                    <Container>
                        <Button title={cta.label} onPress={cta.onPress} />
                    </Container>
                </View>
            </Container>
        </Screen>
    );
}
