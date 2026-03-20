// src/screens/owner/OwnerWalletScreen.tsx
import React, { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { Card } from "../../ui/components/Card";
import { Button } from "../../ui/components/Button";
import { Pill } from "../../ui/components/Pill";
import { Loading, ErrorState, Empty } from "../../ui/components/State";
import { t } from "../../ui/tokens";

import { IosAlert } from "../../ui/components/IosAlert";
import { friendlyError } from "../../core/errors/friendlyError";

function formatBRL(value: string | number) {
  const n = Number(String(value ?? 0).replace(",", "."));
  if (!Number.isFinite(n)) return "R$ —";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateTimeBR(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleString("pt-BR");
}

function isFuture(iso?: string | null) {
  if (!iso) return false;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return false;
  return d.getTime() > Date.now();
}

type WalletTx = { id: string; type: string; amount: string; createdAt: string };

type WalletResp = {
  wallet: {
    id: string;
    ownerType: "SELLER" | "SALON" | string;
    available: string;
    pending: string;
    locked?: string;
  };
  destination: null | {
    id: string;
    pixKey: string;
    pixKeyType: string;
    pixKeyChangedAt?: string | null;
    payoutBlockedUntil?: string | null;
  };
  txs: WalletTx[];
  payouts: any[];
  limits: { txLimit: number; payoutLimit: number };
  goal: null | {
    amount: string;
    progressPct: number;
    missing: string;
    reached: boolean;
  };
  minManual: string | null;
};

export function OwnerWalletScreen() {
  const nav = useNavigation<any>();
  const [modal, setModal] = useState<null | { title: string; message: string }>(null);

  const q = useQuery({
    queryKey: ["wallet-me-owner"],
    queryFn: async () =>
      (await api.get<WalletResp>(endpoints.wallet.me, { params: { txLimit: 20, payoutLimit: 10 } })).data,
    retry: false,
    staleTime: 0,
  });

  const { refetch } = q;

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  if (q.isLoading) {
    return (
      <Screen>
        <Container style={{ flex: 1, paddingTop: 10 }}>
          <Loading />
        </Container>
      </Screen>
    );
  }

  if (q.isError) {
    const fe = friendlyError(q.error as any);
    return (
      <Screen>
        <Container style={{ flex: 1, paddingTop: 10 }}>
          <ErrorState onRetry={() => q.refetch()} />
          <View style={{ height: 12 }} />
          <Button
            title="Ver detalhes"
            variant="ghost"
            onPress={() =>
              setModal({
                title: String(fe?.title || "Erro"),
                message: String(fe?.message || "Falha ao carregar a carteira."),
              })
            }
          />
          <IosAlert visible={!!modal} title={modal?.title} message={modal?.message} onClose={() => setModal(null)} />
        </Container>
      </Screen>
    );
  }

  const data = q.data;
  if (!data) {
    return (
      <Screen>
        <Container style={{ flex: 1, paddingTop: 10 }}>
          <Empty text="Não foi possível carregar sua carteira." />
        </Container>
      </Screen>
    );
  }

  const blockedUntil = data.destination?.payoutBlockedUntil ?? null;
  const isBlocked = isFuture(blockedUntil);

  return (
    <Screen>
      <Container style={{ flex: 1, paddingTop: 10 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <View style={{ paddingTop: 24, paddingBottom: 8 }}>
            <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 28 }}>Carteira</Text>
            <Text style={{ color: t.colors.text2, fontWeight: "700", marginTop: 6 }}>
              Pagamento automático todo dia 10
            </Text>
          </View>

          <Button title={q.isRefetching ? "..." : "Atualizar"} variant="ghost" onPress={() => q.refetch()} />
        </View>

        <View style={{ height: 12 }} />

        {/* KPI */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Card style={{ flex: 1, padding: 14, borderRadius: 16, backgroundColor: t.colors.surface }}>
            <Text style={{ color: t.colors.text2, fontWeight: "700", fontSize: 12 }}>Disponível</Text>
            <Text style={{ marginTop: 8, color: t.colors.text, fontWeight: "900", fontSize: 22 }}>
              {formatBRL(data.wallet.available)}
            </Text>
            <Text style={{ marginTop: 8, color: t.colors.muted, fontWeight: "700", fontSize: 12 }}>
              Entra no pagamento
            </Text>
          </Card>

          <Card style={{ flex: 1, padding: 14, borderRadius: 16, backgroundColor: t.colors.surface }}>
            <Text style={{ color: t.colors.text2, fontWeight: "700", fontSize: 12 }}>Pendente</Text>
            <Text style={{ marginTop: 8, color: t.colors.text, fontWeight: "900", fontSize: 22 }}>
              {formatBRL(data.wallet.pending)}
            </Text>
            <Text style={{ marginTop: 8, color: t.colors.muted, fontWeight: "700", fontSize: 12 }}>
              Libera antes de pagar
            </Text>
          </Card>
        </View>

        {/* Próximo pagamento */}
        <Card style={{ marginTop: 12, padding: 14, borderRadius: 16, gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: t.colors.text, fontWeight: "900" }}>Próximo pagamento</Text>
            <Text style={{ color: t.colors.text2, fontWeight: "800" }}>Dia 10</Text>
          </View>

          <Text style={{ color: t.colors.text2, fontWeight: "700" }}>
            {data.destination ? `Chave ${data.destination.pixKeyType} cadastrada` : "Cadastre seu PIX para receber."}
          </Text>

          {isBlocked ? (
            <Text style={{ color: (t.colors as any).warning ?? t.colors.text2, fontWeight: "900" }}>
              Bloqueado por segurança até {formatDateTimeBR(blockedUntil)}
            </Text>
          ) : (
            <Text style={{ color: t.colors.muted, fontWeight: "700", fontSize: 12 }}>
              Pendente vira disponível antes de pagar.
            </Text>
          )}
        </Card>

        {/* PIX / Atalho */}
        <Card style={{ marginTop: 12, padding: 12, borderRadius: 18, gap: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <Text style={{ color: t.colors.text, fontWeight: "900" }}>PIX para receber</Text>

            {data.destination ? (
              isBlocked ? (
                <Pill text="Bloqueado" tone="warning" />
              ) : (
                <Pill text="Cadastrado" tone="success" />
              )
            ) : (
              <Pill text="Falta cadastrar" tone="warning" />
            )}
          </View>

          <Text style={{ color: t.colors.text2, fontWeight: "800" }}>
            {data.destination
              ? `Chave ${data.destination.pixKeyType} cadastrada`
              : "Cadastre seu PIX para conseguir receber."}
          </Text>

          <Text style={{ color: t.colors.muted, fontWeight: "800", fontSize: 12 }}>
            O pagamento usa o PIX cadastrado (congelado no momento do pagamento).
          </Text>

          <Button
            title={data.destination ? "Editar PIX" : "Cadastrar PIX"}
            variant="ghost"
            onPress={() => nav.navigate("OwnerPixKey")}
          />
        </Card>

        {/* Transações */}
        <View style={{ marginTop: 14, flex: 1, minHeight: 0 }}>
          <Text style={{ fontWeight: "900", color: t.colors.text, marginBottom: 10 }}>Transações</Text>

          <FlatList
            data={data.txs ?? []}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ paddingBottom: 24, gap: 10 }}
            renderItem={({ item }) => (
              <View
                style={{
                  paddingVertical: 14,
                  paddingHorizontal: 4,
                  borderBottomWidth: 1,
                  borderBottomColor: t.colors.border,
                }}
              >
                <Text style={{ fontWeight: "900", color: t.colors.text }}>{item.type}</Text>
                <Text style={{ marginTop: 6, color: t.colors.text2, fontWeight: "700", fontSize: 12 }}>
                  {formatBRL(item.amount)} • {new Date(item.createdAt).toLocaleString("pt-BR")}
                </Text>
              </View>
            )}
            ListEmptyComponent={<Empty text="Sem transações ainda." />}
            refreshing={q.isRefetching}
            onRefresh={() => q.refetch()}
          />
        </View>

        <IosAlert visible={!!modal} title={modal?.title} message={modal?.message} onClose={() => setModal(null)} />
      </Container>
    </Screen>
  );
}