// SellerHomeScreen.tsx
import React, { useMemo, useState } from "react";
import { View, Text, FlatList, ScrollView } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { Card } from "../../ui/components/Card";
import { Button } from "../../ui/components/Button";
import { Pill } from "../../ui/components/Pill";
import { Chip } from "../../ui/components/Chip";
import { Loading, ErrorState, Empty } from "../../ui/components/State";
import { t } from "../../ui/tokens";

import { SellerService } from "../../core/api/services/seller.service";
import { ProductsService, Product } from "../../core/api/services/products.service";
import { CategoriesService, Category } from "../../core/api/services/categories.service";

import { useAuthStore } from "../../stores/auth.store";
import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";

import { IosAlert } from "../../ui/components/IosAlert";
import { IosConfirm, type IosConfirmAction } from "../../ui/components/IosConfirm";
import { friendlyError } from "../../core/errors/friendlyError";

function formatBRL(value: string | number) {
  const n = Number(String(value ?? "0").replace(",", "."));
  if (!Number.isFinite(n)) return "R$ —";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type SellerTab = "PERMISSIONS" | "CART" | "WALLET";

type SellerPermission = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "REVOKED" | string;
  salon: { id: string; name: string };
};

type WalletDTO = {
  id: string;
  ownerType: "SALON" | "SELLER" | string;
  sellerId?: string | null;
  salonId?: string | null;
  available: string;
  pending: string;
  createdAt: string;
  txs?: WalletTx[];
  payouts?: WalletPayout[];
};

type WalletTx = {
  id: string;
  type: string;
  amount: string;
  meta?: any;
  createdAt: string;
};

type WalletPayout = {
  id: string;
  amount: string;
  status: "REQUESTED" | "APPROVED" | "PAID" | "REJECTED" | string;
  createdAt: string;
  decidedAt?: string | null;
};

function asArray<T>(v: any): T[] {
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.items)) return v.items;
  if (Array.isArray(v?.data)) return v.data;
  if (Array.isArray(v?.permissions)) return v.permissions;
  return [];
}

function toNum(v: any) {
  const n = Number(String(v ?? 0).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function SellerHomeScreen() {
  console.log("SellerHomeScreen OLD loaded");
  const qc = useQueryClient();
  const nav = useNavigation<any>();

  const [tab, setTab] = useState<SellerTab>("PERMISSIONS");

  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const logout = useAuthStore((s) => s.logout);
  const role = useAuthStore((s) => s.activeRole);
  const canFetch = hydrated && !!token && role === "SELLER";

  const [modal, setModal] = useState<null | { title: string; message: string }>(null);
  const [confirm, setConfirm] = useState<null | { title: string; message: string; actions: IosConfirmAction[] }>(null);

  const permsQ = useQuery({
    queryKey: ["seller-permissions"],
    queryFn: () => SellerService.listPermissions(),
    enabled: hydrated && !!token && role === "SELLER" && tab === "PERMISSIONS",
    retry: false,
  });

  const perms = useMemo(() => asArray<SellerPermission>(permsQ.data), [permsQ.data]);
  const approvedSalons = useMemo(() => perms.filter((p) => p.status === "APPROVED"), [perms]);

  const [selectedSalonId, setSelectedSalonId] = useState<string | null>(null);
  const selectedSalon = useMemo(() => {
    if (!selectedSalonId) return null;
    return approvedSalons.find((p) => p.salon.id === selectedSalonId)?.salon ?? null;
  }, [approvedSalons, selectedSalonId]);

  const goToCartForSalon = (salonId: string) => {
    setSelectedSalonId(salonId);
    setTab("CART");
  };

  const [catFilter, setCatFilter] = useState<"ALL" | "NONE" | string>("ALL");

  const categoriesQ = useQuery({
    queryKey: ["categories", { active: "true" }],
    queryFn: () => CategoriesService.list({ active: "true" }),
    enabled: hydrated && !!token && role === "SELLER" && tab === "CART",
    retry: false,
    staleTime: 0,
  });

  const categories: Category[] = useMemo(() => asArray<Category>(categoriesQ.data), [categoriesQ.data]);

  const productsQ = useQuery({
    queryKey: ["seller-products", { q: "", active: "true", take: 200 }],
    queryFn: () => ProductsService.list({ take: 200, active: "true" }),
    enabled: hydrated && !!token && role === "SELLER" && tab === "CART",
    retry: false,
    staleTime: 0,
  });

  const productsAll: Product[] = (productsQ.data as any)?.items ?? [];

  const productsFiltered: Product[] = useMemo(() => {
    if (catFilter === "ALL") return productsAll;

    if (catFilter === "NONE") {
      return productsAll.filter((p) => !(p as any)?.categoryId);
    }

    return productsAll.filter((p) => String((p as any)?.categoryId ?? "") === String(catFilter));
  }, [productsAll, catFilter]);

  const [qtyById, setQtyById] = useState<Record<string, number>>({});

  const cartItems = useMemo(() => {
    return Object.entries(qtyById)
      .map(([productId, qty]) => ({ productId, qty }))
      .filter((x) => x.qty > 0);
  }, [qtyById]);

  const total = useMemo(() => {
    let sum = 0;
    for (const it of cartItems) {
      const p = productsAll.find((x) => x.id === it.productId);
      if (!p) continue;

      const price = Number(String((p as any).price).replace(",", "."));
      if (!Number.isFinite(price)) continue;

      sum += price * it.qty;
    }
    return sum;
  }, [cartItems, productsAll]);

  const cartLocked = !selectedSalonId;

  const createDraftMut = useMutation({
    mutationFn: async () => {
      if (!selectedSalonId) throw new Error("Selecione um salão aprovado.");
      if (cartItems.length === 0) throw new Error("Carrinho vazio.");
      return SellerService.createDraftOrderForSalon(selectedSalonId, cartItems);
    },
    onSuccess: (data: any) => {
      setModal({
        title: "Pedido enviado",
        message: `Draft criado com sucesso.\nCódigo: ${data?.code ?? "—"}`,
      });

      setQtyById({});
      setTab("PERMISSIONS");
      setCatFilter("ALL");
    },
    onError: (e: any) => {
      const fe = friendlyError(e);
      setModal({ title: fe.title || "Erro", message: fe.message || "Falha ao criar pedido." });
    },
  });

  const walletQ = useQuery<WalletDTO>({
    queryKey: ["wallet", { txLimit: 20, payoutLimit: 10 }],
    queryFn: async () => (await api.get<WalletDTO>(endpoints.wallet.me, { params: { txLimit: 20, payoutLimit: 10 } })).data,
    enabled: canFetch && tab === "WALLET",
    retry: false,
    staleTime: 0,
  });

  const settleMut = useMutation({
    mutationFn: async () => (await api.post(endpoints.wallet.settle)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wallet"] }),
    onError: (e: any) => {
      const fe = friendlyError(e);
      setModal({ title: fe.title || "Erro", message: fe.message || "Falha ao liquidar." });
    },
  });

  const payoutMut = useMutation({
    mutationFn: async (amount: number) => {
      return (await api.post(endpoints.wallet.payout, { amount }, { headers: { "Idempotency-Key": `payout-${Date.now()}` } })).data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wallet"] }),
    onError: (e: any) => {
      const fe = friendlyError(e);
      setModal({ title: fe.title || "Erro", message: fe.message || "Falha ao solicitar saque." });
    },
  });

  const onRefresh = () => {
    if (tab === "PERMISSIONS") permsQ.refetch();
    if (tab === "CART") {
      categoriesQ.refetch();
      productsQ.refetch();
    }
    if (tab === "WALLET") walletQ.refetch();
  };

  return (
    <Screen>
      <Container style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ marginTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 18 }}>Vendedor</Text>
            <Text style={{ color: t.colors.text2, fontWeight: "800", marginTop: 4 }}>Permissões, carrinho e carteira</Text>
          </View>
          <Button title="Meu código" variant="ghost" onPress={() => nav.navigate("Referral")} />
          <Button
            title="Sair"
            variant="ghost"
            onPress={() => {
              setConfirm({
                title: "Sair da conta",
                message: "Deseja sair?",
                actions: [
                  { text: "Cancelar", style: "cancel" },
                  { text: "Sair", style: "destructive", onPress: () => logout() },
                ],
              });
            }}
          />
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
          <Chip label="Vínculos" active={tab === "PERMISSIONS"} onPress={() => setTab("PERMISSIONS")} />
          <Chip label="Carrinho" active={tab === "CART"} onPress={() => setTab("CART")} />
          <Chip label="Carteira" active={tab === "WALLET"} onPress={() => setTab("WALLET")} />
          <View style={{ flex: 1 }} />
          <Button
            title={permsQ.isRefetching || productsQ.isRefetching || walletQ.isRefetching ? "Atualizando…" : "Atualizar"}
            variant="ghost"
            onPress={onRefresh}
          />
        </View>

        {/* Body */}
        <View style={{ marginTop: 12, flex: 1, minHeight: 0 }}>
          {/* PERMISSIONS */}
          {tab === "PERMISSIONS" && (
            <>
              {permsQ.isLoading ? (
                <Loading />
              ) : permsQ.isError ? (
                <ErrorState onRetry={() => permsQ.refetch()} />
              ) : (
                <FlatList
                  data={asArray<SellerPermission>(permsQ.data)}
                  keyExtractor={(i) => i.id}
                  contentContainerStyle={{ paddingBottom: 120, gap: 12 }}
                  renderItem={({ item }: { item: SellerPermission }) => (
                    <Card>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: t.colors.text, fontWeight: "900" }} numberOfLines={1}>
                            {item.salon.name}
                          </Text>
                        </View>

                        <Pill
                          text={item.status}
                          tone={
                            item.status === "APPROVED"
                              ? "success"
                              : item.status === "PENDING"
                              ? "warning"
                              : item.status === "REJECTED"
                              ? "danger"
                              : "muted"
                          }
                        />
                      </View>

                      {item.status === "APPROVED" ? (
                        <View style={{ marginTop: 12, flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                          <Button title="Criar carrinho" variant="primary" onPress={() => goToCartForSalon(item.salon.id)} />
                        </View>
                      ) : (
                        <View style={{ marginTop: 12 }}>
                          <Text style={{ color: "rgba(234,240,255,0.65)", fontWeight: "800" }}>
                            Você ainda não pode criar carrinho para este salão.
                          </Text>
                        </View>
                      )}
                    </Card>
                  )}
                  ListEmptyComponent={<Empty text="Sem vínculos." />}
                  refreshing={permsQ.isRefetching}
                  onRefresh={() => permsQ.refetch()}
                />
              )}
            </>
          )}

          {/* CART */}
          {tab === "CART" && (
            <>
              <Card>
                <Text style={{ color: "rgba(234,240,255,0.85)", fontWeight: "900" }}>Salão selecionado</Text>

                <View style={{ marginTop: 10, flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                  {approvedSalons.length === 0 ? (
                    <Text style={{ color: "rgba(234,240,255,0.65)", fontWeight: "800" }}>
                      Você não tem nenhum salão aprovado ainda.
                    </Text>
                  ) : (
                    approvedSalons.map((p) => (
                      <Chip
                        key={p.salon.id}
                        label={p.salon.name}
                        active={selectedSalonId === p.salon.id}
                        onPress={() => setSelectedSalonId(p.salon.id)}
                      />
                    ))
                  )}
                </View>

                {selectedSalon ? (
                  <Text style={{ marginTop: 10, color: "rgba(234,240,255,0.65)", fontWeight: "800" }}>
                    Criando pedido para: {selectedSalon.name}
                  </Text>
                ) : (
                  <Text style={{ color: t.colors.text2, fontWeight: "800" }}>
                    Selecione um salão aprovado para montar o carrinho.
                  </Text>
                )}
              </Card>

              <View style={{ height: 12 }} />

              <Card>
                <Text style={{ color: "rgba(234,240,255,0.85)", fontWeight: "900" }}>Categorias</Text>

                {categoriesQ.isLoading ? (
                  <Text style={{ marginTop: 8, color: "rgba(234,240,255,0.65)", fontWeight: "800" }}>Carregando…</Text>
                ) : categoriesQ.isError ? (
                  <Text style={{ marginTop: 8, color: "rgba(255,92,122,0.9)", fontWeight: "900" }}>
                    Falha ao carregar categorias.
                  </Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 10 }}>
                    <Chip label="Todas" active={catFilter === "ALL"} onPress={() => setCatFilter("ALL")} />
                    <Chip label="Sem categoria" active={catFilter === "NONE"} onPress={() => setCatFilter("NONE")} />
                    {categories.map((c) => (
                      <Chip key={c.id} label={c.name} active={catFilter === c.id} onPress={() => setCatFilter(c.id)} />
                    ))}
                  </ScrollView>
                )}

                <Text style={{ marginTop: 10, color: "rgba(234,240,255,0.60)", fontWeight: "800", fontSize: 12 }}>
                  Mostrando:{" "}
                  {catFilter === "ALL"
                    ? "todas"
                    : catFilter === "NONE"
                    ? "sem categoria"
                    : categories.find((c) => c.id === catFilter)?.name ?? "categoria"}
                </Text>
              </Card>

              <View style={{ height: 12 }} />

              {productsQ.isLoading ? (
                <Loading />
              ) : productsQ.isError ? (
                <ErrorState onRetry={() => productsQ.refetch()} />
              ) : (
                <FlatList
                  data={productsFiltered}
                  keyExtractor={(i: Product) => i.id}
                  contentContainerStyle={{ paddingBottom: 160, gap: 12 }}
                  renderItem={({ item }: { item: Product }) => {
                    const qty = qtyById[item.id] ?? 0;

                    return (
                      <Card>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: t.colors.text, fontWeight: "900" }} numberOfLines={1}>
                              {item.name}
                            </Text>
                            <Text style={{ color: "rgba(234,240,255,0.65)", fontWeight: "800", marginTop: 6 }}>
                              SKU: {item.sku} • {formatBRL((item as any).price)}
                            </Text>
                          </View>

                          <Pill text={`QTY: ${qty}`} tone={qty > 0 ? "success" : "muted"} />
                        </View>

                        <View style={{ marginTop: 12, flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                          <Button
                            title="-"
                            variant="ghost"
                            onPress={() =>
                              setQtyById((prev) => ({
                                ...prev,
                                [item.id]: Math.max(0, (prev[item.id] ?? 0) - 1),
                              }))
                            }
                            disabled={cartLocked}
                          />
                          <Button
                            title="+"
                            variant="ghost"
                            onPress={() =>
                              setQtyById((prev) => ({
                                ...prev,
                                [item.id]: (prev[item.id] ?? 0) + 1,
                              }))
                            }
                            disabled={cartLocked}
                          />
                          <Button
                            title="Zerar"
                            variant="ghost"
                            onPress={() =>
                              setQtyById((prev) => {
                                const copy = { ...prev };
                                delete copy[item.id];
                                return copy;
                              })
                            }
                            disabled={cartLocked}
                          />
                        </View>

                        {cartLocked ? (
                          <Text style={{ color: t.colors.muted, fontWeight: "800", fontSize: 12 }}>
                            Selecione um salão para liberar o carrinho.
                          </Text>
                        ) : null}
                      </Card>
                    );
                  }}
                  ListEmptyComponent={<Empty text="Sem produtos nessa categoria." />}
                  refreshing={productsQ.isRefetching}
                  onRefresh={() => productsQ.refetch()}
                />
              )}
            </>
          )}

          {/* WALLET */}
          {tab === "WALLET" && (
            <>
              {walletQ.isLoading ? (
                <Loading />
              ) : walletQ.isError ? (
                <ErrorState onRetry={() => walletQ.refetch()} />
              ) : !walletQ.data ? (
                <Empty text="Carteira não encontrada." />
              ) : (
                <>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Card style={{ flex: 1, padding: 12 }}>
                      <Text style={{ opacity: 0.7, color: t.colors.text2 }}>Disponível</Text>
                      <Text style={{ fontSize: 18, fontWeight: "900", marginTop: 6, color: t.colors.text }}>
                        {formatBRL(walletQ.data.available)}
                      </Text>
                    </Card>

                    <Card style={{ flex: 1, padding: 12 }}>
                      <Text style={{ opacity: 0.7, color: t.colors.text2 }}>Pendente</Text>
                      <Text style={{ fontSize: 18, fontWeight: "900", marginTop: 6, color: t.colors.text }}>
                        {formatBRL(walletQ.data.pending)}
                      </Text>
                    </Card>
                  </View>

                  <View style={{ marginTop: 12, flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                    <Button
                      title={settleMut.isPending ? "Liquidando..." : "Liquidar (pending → available)"}
                      variant="ghost"
                      onPress={() => settleMut.mutate()}
                      loading={settleMut.isPending}
                    />

                    <Button
                      title={payoutMut.isPending ? "Solicitando..." : "Solicitar saque (tudo disponível)"}
                      variant="primary"
                      onPress={() => {
                        const available = toNum(walletQ.data?.available);
                        if (available <= 0) {
                          setModal({ title: "Sem saldo", message: "Você não tem saldo disponível." });
                          return;
                        }

                        setConfirm({
                          title: "Solicitar saque",
                          message: `Confirmar saque de ${formatBRL(available)}?`,
                          actions: [
                            { text: "Cancelar", style: "cancel" },
                            { text: "Confirmar", onPress: () => payoutMut.mutate(available) },
                          ],
                        });
                      }}
                      loading={payoutMut.isPending}
                    />
                  </View>

                  <View style={{ marginTop: 14, flex: 1, minHeight: 0 }}>
                    <Text style={{ fontWeight: "900", color: t.colors.text, marginBottom: 10 }}>Transações</Text>

                    <FlatList
                      data={walletQ.data.txs ?? []}
                      keyExtractor={(i) => i.id}
                      contentContainerStyle={{ paddingBottom: 120, gap: 10 }}
                      renderItem={({ item }) => (
                        <Card style={{ padding: 12 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontWeight: "900", color: t.colors.text }}>{item.type}</Text>
                              <Text style={{ marginTop: 6, opacity: 0.7, color: t.colors.text2 }}>
                                {formatBRL(item.amount)} • {new Date(item.createdAt).toLocaleString("pt-BR")}
                              </Text>
                            </View>
                            <Pill text={item.type} tone="muted" />
                          </View>
                        </Card>
                      )}
                      ListEmptyComponent={<Empty text="Sem transações ainda." />}
                      refreshing={walletQ.isRefetching}
                      onRefresh={() => walletQ.refetch()}
                    />
                  </View>
                </>
              )}
            </>
          )}
        </View>

        {/* Resumo + CTA (somente no CART) */}
        {tab === "CART" ? (
          <View style={{ marginTop: 10, paddingBottom: 12 }}>
            <Card>
              <Text style={{ color: t.colors.text, fontWeight: "900" }}>Resumo</Text>
              <Text style={{ marginTop: 6, color: "rgba(234,240,255,0.65)", fontWeight: "800" }}>
                Itens: {cartItems.length} • Total: {formatBRL(String(total))}
              </Text>

              <View style={{ marginTop: 12, flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                <Button
                  title={createDraftMut.isPending ? "Enviando..." : "Enviar para o salão"}
                  onPress={() => createDraftMut.mutate()}
                  loading={createDraftMut.isPending}
                  variant="primary"
                  disabled={!selectedSalonId || cartItems.length === 0 || createDraftMut.isPending}
                />
                <Button title="Voltar" variant="ghost" onPress={() => setTab("PERMISSIONS")} />
              </View>

              {!selectedSalonId ? (
                <Text style={{ marginTop: 10, color: "rgba(234,240,255,0.60)", fontWeight: "800", fontSize: 12 }}>
                  Selecione um salão aprovado para enviar o pedido.
                </Text>
              ) : cartItems.length === 0 ? (
                <Text style={{ marginTop: 10, color: "rgba(234,240,255,0.60)", fontWeight: "800", fontSize: 12 }}>
                  Adicione itens no carrinho para enviar.
                </Text>
              ) : null}
            </Card>
          </View>
        ) : null}
      </Container>

      <IosAlert visible={!!modal} title={modal?.title} message={modal?.message} onClose={() => setModal(null)} />

      <IosConfirm
        visible={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        actions={confirm?.actions || []}
        onClose={() => setConfirm(null)}
      />
    </Screen>
  );
}