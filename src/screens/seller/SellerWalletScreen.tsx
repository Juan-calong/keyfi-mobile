// src/screens/seller/SellerWalletScreen.tsx
import React, { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
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

function getTxLabel(type: string) {
  const normalized = String(type || "").toUpperCase();

  switch (normalized) {
    case "COMMISSION":
      return "Comissão recebida";
    case "PAYOUT":
      return "Pagamento enviado";
    case "ADJUSTMENT":
      return "Ajuste";
    case "REFUND":
      return "Estorno";
    case "BONUS":
      return "Bônus";
    default:
      return type || "Movimentação";
  }
}

type WalletTx = {
  id: string;
  type: string;
  amount: string;
  createdAt: string;
};

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

export function SellerWalletScreen() {
  const nav = useNavigation<any>();
  const [modal, setModal] = useState<null | { title: string; message: string }>(null);

  const q = useQuery({
    queryKey: ["wallet-me-seller"],
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

  const payoutConfigMissing = useMemo(() => {
    const status = (q.error as any)?.response?.status;
    const err = String((q.error as any)?.response?.data?.error || "");
    return status === 409 && err.toLowerCase().includes("config de payout");
  }, [q.error]);

  if (q.isLoading) {
    return (
      <Screen>
        <Container style={styles.centerContainer}>
          <Loading />
        </Container>
      </Screen>
    );
  }

  if (q.isError) {
    const fe = friendlyError(q.error as any);

    return (
      <Screen>
        <Container style={styles.centerContainer}>
          {payoutConfigMissing ? (
            <Card style={styles.errorCard}>
              <Text style={styles.errorTitle}>Carteira em configuração</Text>

              <Text style={styles.errorText}>
                O admin ainda não definiu a meta ou limite de pagamento.
                {"\n"}
                Assim que ele configurar, sua carteira vai aparecer aqui.
              </Text>

              <View style={styles.errorActions}>
                <Button title="Atualizar" variant="ghost" onPress={() => q.refetch()} />
                <Button
                  title="Detalhes do erro"
                  variant="ghost"
                  onPress={() =>
                    setModal({
                      title: "Sem configuração",
                      message: fe?.message || "O admin ainda não configurou as regras de payout.",
                    })
                  }
                />
              </View>
            </Card>
          ) : (
            <>
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
            </>
          )}

          <IosAlert visible={!!modal} title={modal?.title} message={modal?.message} onClose={() => setModal(null)} />
        </Container>
      </Screen>
    );
  }

  const data = q.data;

  if (!data) {
    return (
      <Screen>
        <Container style={styles.centerContainer}>
          <Empty text="Não foi possível carregar sua carteira." />
        </Container>
      </Screen>
    );
  }

  const blockedUntil = data.destination?.payoutBlockedUntil ?? null;
  const isBlocked = isFuture(blockedUntil);

  return (
    <Screen>
      <Container style={styles.container}>
        <FlatList
          data={data.txs ?? []}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshing={q.isRefetching}
          onRefresh={() => q.refetch()}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View>
              <View style={styles.header}>
                <View style={styles.headerTextWrap}>
                  <Text style={styles.eyebrow}>Minha carteira</Text>
                  <Text style={styles.title}>Comissões</Text>
                  <Text style={styles.subtitle}>Acompanhe seus valores e o próximo repasse.</Text>
                </View>

                <Button title={q.isRefetching ? "..." : "Atualizar"} variant="ghost" onPress={() => q.refetch()} />
              </View>

              <Card style={styles.heroCard}>
                <View style={styles.heroTopRow}>
                  <Text style={styles.heroLabel}>Saldo disponível</Text>
                  <Pill text="Atualizado" tone="success" />
                </View>

                <Text style={styles.heroAmount}>{formatBRL(data.wallet.available)}</Text>

                <Text style={styles.heroHint}>Esse valor entra no pagamento automático do dia 10.</Text>

                <View style={styles.heroDivider} />

                <View style={styles.heroFooterRow}>
                  <View style={styles.heroInfoBlock}>
                    <Text style={styles.heroInfoLabel}>Pendente</Text>
                    <Text style={styles.heroInfoValue}>{formatBRL(data.wallet.pending)}</Text>
                  </View>

                  <View style={styles.heroInfoBlock}>
                    <Text style={styles.heroInfoLabel}>Pagamento</Text>
                    <Text style={styles.heroInfoValue}>Todo dia 10</Text>
                  </View>
                </View>
              </Card>

              <View style={styles.gridRow}>
                <Card style={styles.infoCard}>
                  <Text style={styles.infoTitle}>Próximo pagamento</Text>
                  <Text style={styles.infoBig}>Dia 10</Text>
                  <Text style={styles.infoText}>O valor pendente precisa ser liberado antes do fechamento.</Text>
                </Card>

                <Card style={styles.infoCard}>
                  <Text style={styles.infoTitle}>Status do PIX</Text>

                  {data.destination ? (
                    isBlocked ? (
                      <Pill text="Bloqueado" tone="warning" />
                    ) : (
                      <Pill text="Cadastrado" tone="success" />
                    )
                  ) : (
                    <Pill text="Não cadastrado" tone="warning" />
                  )}

                  <Text style={[styles.infoText, { marginTop: 10 }]}>
                    {data.destination
                      ? `Chave ${data.destination.pixKeyType} pronta para recebimento.`
                      : "Cadastre sua chave PIX para receber seus pagamentos."}
                  </Text>
                </Card>
              </View>

              <Card style={styles.pixCard}>
                <View style={styles.sectionHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionTitle}>PIX para receber</Text>
                    <Text style={styles.sectionSubtitle}>Conta usada no momento do pagamento</Text>
                  </View>

                  {data.destination ? (
                    isBlocked ? (
                      <Pill text="Bloqueado" tone="warning" />
                    ) : (
                      <Pill text="Ativo" tone="success" />
                    )
                  ) : (
                    <Pill text="Pendente" tone="warning" />
                  )}
                </View>

                <View style={styles.pixBody}>
                  <Text style={styles.pixMainText}>
                    {data.destination
                      ? `Chave ${data.destination.pixKeyType} cadastrada`
                      : "Você ainda não cadastrou uma chave PIX."}
                  </Text>

                  {data.destination?.pixKey ? (
                    <Text style={styles.pixKeyText} numberOfLines={1}>
                      {data.destination.pixKey}
                    </Text>
                  ) : null}

                  {isBlocked ? (
                    <Text style={styles.warningText}>
                      Você alterou o PIX recentemente. Os pagamentos ficam bloqueados até{" "}
                      {formatDateTimeBR(blockedUntil)}.
                    </Text>
                  ) : (
                    <Text style={styles.mutedText}>
                      O sistema usa a chave cadastrada e congelada no momento do processamento do pagamento.
                    </Text>
                  )}
                </View>

                <View style={styles.pixButtonWrap}>
                  <Button
                    title={data.destination ? "Editar PIX no Perfil" : "Cadastrar PIX no Perfil"}
                    variant="ghost"
                    onPress={() => nav.navigate("SELLER_PROFILE")}
                  />
                </View>
              </Card>

              <View style={styles.transactionsHeader}>
                <Text style={styles.transactionsTitle}>Transações</Text>
                <Text style={styles.transactionsCount}>{(data.txs ?? []).length} registros</Text>
              </View>
            </View>
          }
          renderItem={({ item }) => {
            const isNegative = String(item.type || "").toUpperCase() === "PAYOUT";

            return (
              <Card style={styles.txCard}>
                <View style={styles.txRow}>
                  <View style={styles.txLeft}>
                    <View style={styles.txDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txTitle}>{getTxLabel(item.type)}</Text>
                      <Text style={styles.txDate}>{formatDateTimeBR(item.createdAt)}</Text>
                    </View>
                  </View>

                  <Text style={[styles.txAmount, isNegative && styles.txAmountNegative]}>
                    {isNegative ? "-" : "+"}
                    {formatBRL(item.amount).replace("R$", "R$ ")}
                  </Text>
                </View>
              </Card>
            );
          }}
          ListEmptyComponent={
            <Card style={styles.emptyCard}>
              <Empty text="Sem transações ainda." />
            </Card>
          }
        />

        <IosAlert visible={!!modal} title={modal?.title} message={modal?.message} onClose={() => setModal(null)} />
      </Container>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
  },

  centerContainer: {
    flex: 1,
    paddingTop: 10,
  },

  listContent: {
    paddingBottom: 28,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },

  headerTextWrap: {
    flex: 1,
    paddingTop: 8,
  },

  eyebrow: {
    color: t.colors.text2,
    fontWeight: "800",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },

  title: {
    color: t.colors.text,
    fontWeight: "900",
    fontSize: 30,
  },

  subtitle: {
    color: t.colors.text2,
    fontWeight: "700",
    marginTop: 6,
    lineHeight: 20,
  },

  heroCard: {
    marginTop: 10,
    padding: 18,
    borderRadius: 22,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },

  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },

  heroLabel: {
    color: t.colors.text2,
    fontWeight: "800",
    fontSize: 13,
  },

  heroAmount: {
    marginTop: 12,
    color: t.colors.text,
    fontWeight: "900",
    fontSize: 32,
    lineHeight: 38,
  },

  heroHint: {
    marginTop: 8,
    color: t.colors.text2,
    fontWeight: "700",
    lineHeight: 20,
  },

  heroDivider: {
    height: 1,
    backgroundColor: t.colors.border,
    marginVertical: 16,
  },

  heroFooterRow: {
    flexDirection: "row",
    gap: 12,
  },

  heroInfoBlock: {
    flex: 1,
  },

  heroInfoLabel: {
    color: t.colors.muted,
    fontWeight: "800",
    fontSize: 12,
    marginBottom: 6,
  },

  heroInfoValue: {
    color: t.colors.text,
    fontWeight: "900",
    fontSize: 16,
  },

  gridRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },

  infoCard: {
    flex: 1,
    padding: 14,
    borderRadius: 18,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    minHeight: 132,
  },

  infoTitle: {
    color: t.colors.text2,
    fontWeight: "800",
    fontSize: 12,
    marginBottom: 8,
  },

  infoBig: {
    color: t.colors.text,
    fontWeight: "900",
    fontSize: 24,
    marginBottom: 8,
  },

  infoText: {
    color: t.colors.muted,
    fontWeight: "700",
    fontSize: 12,
    lineHeight: 18,
  },

  pixCard: {
    marginTop: 12,
    padding: 14,
    borderRadius: 20,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    gap: 14,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },

  sectionTitle: {
    color: t.colors.text,
    fontWeight: "900",
    fontSize: 18,
  },

  sectionSubtitle: {
    color: t.colors.text2,
    fontWeight: "700",
    marginTop: 4,
    fontSize: 12,
  },

  pixBody: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: t.colors.border,
  },

  pixMainText: {
    color: t.colors.text,
    fontWeight: "800",
    fontSize: 14,
  },

  pixKeyText: {
    marginTop: 8,
    color: t.colors.text2,
    fontWeight: "700",
    fontSize: 13,
  },

  warningText: {
    marginTop: 10,
    color: t.colors.warning,
    fontWeight: "800",
    lineHeight: 18,
  },

  mutedText: {
    marginTop: 10,
    color: t.colors.muted,
    fontWeight: "700",
    lineHeight: 18,
    fontSize: 12,
  },

  pixButtonWrap: {
    marginTop: 2,
  },

  transactionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 10,
  },

  transactionsTitle: {
    color: t.colors.text,
    fontWeight: "900",
    fontSize: 18,
  },

  transactionsCount: {
    color: t.colors.text2,
    fontWeight: "800",
    fontSize: 12,
  },

  txCard: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    marginBottom: 10,
  },

  txRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  txLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },

  txDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: t.colors.text,
    opacity: 0.8,
  },

  txTitle: {
    color: t.colors.text,
    fontWeight: "900",
    fontSize: 14,
  },

  txDate: {
    marginTop: 4,
    color: t.colors.text2,
    fontWeight: "700",
    fontSize: 12,
  },

  txAmount: {
    color: t.colors.text,
    fontWeight: "900",
    fontSize: 14,
  },

  txAmountNegative: {
    color: t.colors.text2,
  },

  emptyCard: {
    padding: 18,
    borderRadius: 18,
  },

  errorCard: {
    gap: 10,
    padding: 14,
    borderRadius: 18,
  },

  errorTitle: {
    color: t.colors.text,
    fontWeight: "900",
    fontSize: 16,
  },

  errorText: {
    color: t.colors.text2,
    fontWeight: "800",
    lineHeight: 20,
  },

  errorActions: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
});