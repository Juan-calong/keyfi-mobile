// src/screens/owner/OwnerSellersScreen.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Pressable,
  Platform,
  StatusBar,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { Card } from "../../ui/components/Card";
import { Button } from "../../ui/components/Button";
import { Pill } from "../../ui/components/Pill";
import { Loading, ErrorState, Empty } from "../../ui/components/State";

import { OwnerSellersService, SalonSellerPermissionRequest } from "../../core/api/services/owner.sellers.service";

import { IosAlert } from "../../ui/components/IosAlert";
import { IosConfirm, type IosConfirmAction } from "../../ui/components/IosConfirm";
import { friendlyError } from "../../core/errors/friendlyError";

function asArray<T>(v: any): T[] {
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.items)) return v.items;
  if (Array.isArray(v?.requests)) return v.requests;
  if (Array.isArray(v?.permissions)) return v.permissions;
  return [];
}

function normalizeEmail(v: any) {
  return String(v ?? "").trim().toLowerCase();
}

type Filter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [m.chip, active && m.chipActive, pressed && { opacity: 0.9 }]}>
      <Text style={[m.chipText, active && m.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function OwnerSellersScreen() {
  const nav = useNavigation<any>();
  const qc = useQueryClient();

  const [email, setEmail] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");

  const [modal, setModal] = useState<null | { title: string; message: string }>(null);
  const [confirm, setConfirm] = useState<
    null | { title: string; message: string; actions: IosConfirmAction[] }
  >(null);

  const q = useQuery({
    queryKey: ["salon-seller-requests"],
    queryFn: () => OwnerSellersService.listRequests(),
    staleTime: 0,
    retry: false,
  });

  const requests = useMemo(() => asArray<SalonSellerPermissionRequest>(q.data), [q.data]);

  const filtered = useMemo(() => {
    if (filter === "ALL") return requests;
    return requests.filter((r) => String(r.status).toUpperCase() === filter);
  }, [requests, filter]);

  const inviteMut = useMutation({
    mutationFn: async () => {
      const e = normalizeEmail(email);
      if (!e || !e.includes("@")) throw new Error("Digite um e-mail válido.");
      return OwnerSellersService.inviteByEmail(e);
    },
    onSuccess: () => {
      setEmail("");
      qc.invalidateQueries({ queryKey: ["salon-seller-requests"] });
      setModal({ title: "OK", message: "Convite enviado (PENDING)." });
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.error || e?.response?.data?.message || e?.message;
      if (msg) {
        setModal({ title: "Erro", message: String(msg) });
        return;
      }
      const fe = friendlyError(e);
      setModal({ title: fe.title || "Erro", message: fe.message || "Falha ao convidar." });
    },
  });

  const decideMut = useMutation({
    mutationFn: async (vars: { id: string; action: "approve" | "reject" }) => {
      return OwnerSellersService.decide(vars.id, vars.action);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salon-seller-requests"] });
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.error || e?.response?.data?.message || e?.message;
      if (msg) {
        setModal({ title: "Erro", message: String(msg) });
        return;
      }
      const fe = friendlyError(e);
      setModal({ title: fe.title || "Erro", message: fe.message || "Falha ao decidir." });
    },
  });

  return (
    <Screen>
      <Container style={{ flex: 1, paddingTop: 6 }}>
        {Platform.OS === "android" ? <View style={{ height: StatusBar.currentHeight ?? 0 }} /> : null}

        {/* NAV iOS */}
        <View style={m.nav}>
          <Pressable hitSlop={12} onPress={() => nav.goBack()} style={m.backBtn}>
            <Text style={m.backText}>{"<"}</Text>
          </Pressable>

          <Text style={m.navTitle}>Sellers</Text>

          <Pressable hitSlop={12} onPress={() => q.refetch()} style={m.rightBtn}>
            <Text style={m.rightText}>{q.isRefetching ? "…" : "⟳"}</Text>
          </Pressable>
        </View>

        <View style={m.hairline} />

        <View style={{ paddingHorizontal: HPAD, paddingTop: 14 }}>
          <Text style={m.h1}>Gerenciar sellers</Text>
          <Text style={m.sub}>Convide por e-mail e aprove/rejeite o vínculo</Text>
        </View>

        <View style={[m.hairline, { marginTop: 14 }]} />

        {/* Invite */}
        <View style={{ paddingHorizontal: HPAD, marginTop: 14 }}>
          <Card style={m.card}>
            <Text style={m.sectionTitle}>Convidar vendedor</Text>
            <Text style={m.label}>E-mail do vendedor</Text>

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="ex: vendedor@exemplo.com"
              placeholderTextColor={"rgba(0,0,0,0.55)"}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={m.input}
            />

            <View style={m.actions}>
              <Pressable
                onPress={() => inviteMut.mutate()}
                disabled={!email || inviteMut.isPending}
                style={({ pressed }) => [
                  m.primaryBtn,
                  pressed && { opacity: 0.85 },
                  (!email || inviteMut.isPending) && { opacity: 0.6 },
                ]}
              >
                <Text style={m.primaryBtnText}>{inviteMut.isPending ? "..." : "Enviar convite"}</Text>
              </Pressable>

              <Pressable
                onPress={() => setEmail("")}
                disabled={inviteMut.isPending}
                style={({ pressed }) => [m.outlineBtn, pressed && { opacity: 0.85 }, inviteMut.isPending && { opacity: 0.6 }]}
              >
                <Text style={m.outlineBtnText}>Limpar</Text>
              </Pressable>
            </View>
          </Card>
        </View>

        {/* Filters */}
        <View style={{ paddingHorizontal: HPAD, marginTop: 14 }}>
          <View style={m.filters}>
            <FilterChip label="Todos" active={filter === "ALL"} onPress={() => setFilter("ALL")} />
            <FilterChip label="Pendente" active={filter === "PENDING"} onPress={() => setFilter("PENDING")} />
            <FilterChip label="Aprovado" active={filter === "APPROVED"} onPress={() => setFilter("APPROVED")} />
            <FilterChip label="Rejeitado" active={filter === "REJECTED"} onPress={() => setFilter("REJECTED")} />
          </View>
        </View>

        {/* List */}
        <View style={{ marginTop: 12, flex: 1, minHeight: 0, paddingHorizontal: HPAD }}>
          {q.isLoading ? (
            <Loading />
          ) : q.isError ? (
            <ErrorState onRetry={() => q.refetch()} />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(i) => i.id}
              contentContainerStyle={{ paddingBottom: 120, gap: 12 }}
              renderItem={({ item }: { item: SalonSellerPermissionRequest }) => {
                const st = String(item.status).toUpperCase();
                const tone =
                  st === "APPROVED" ? "success" : st === "PENDING" ? "warning" : st === "REJECTED" ? "danger" : "muted";

                const emailLabel = item.seller?.email ?? item.sellerId ?? "—";

                return (
                  <Card style={m.card}>
                    <View style={m.rowTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={m.itemTitle} numberOfLines={1}>
                          {emailLabel}
                        </Text>
                        <Text style={m.itemMeta} numberOfLines={1}>
                          {st === "PENDING"
                            ? "Aguardando resposta do seller"
                            : st === "APPROVED"
                            ? "Vínculo aprovado"
                            : st === "REJECTED"
                            ? "Vínculo rejeitado"
                            : "Status"}
                        </Text>
                      </View>

                      <Pill text={st} tone={tone as any} />
                    </View>

                    {st === "PENDING" ? (
                      <>
                        <View style={[m.hairline, { marginTop: 14 }]} />
                        <View style={[m.actions, { marginTop: 14 }]}>
                          <Button
                            title={decideMut.isPending ? "..." : "Aprovar"}
                            variant="primary"
                            onPress={() => {
                              setConfirm({
                                title: "Aprovar",
                                message: "Confirmar aprovação?",
                                actions: [
                                  { text: "Cancelar", style: "cancel" },
                                  {
                                    text: "Confirmar",
                                    onPress: () => decideMut.mutate({ id: item.id, action: "approve" }),
                                  },
                                ],
                              });
                            }}
                            loading={decideMut.isPending}
                            disabled={decideMut.isPending}
                            style={{ height: 46, borderRadius: 14 }}
                          />

                          <Button
                            title={decideMut.isPending ? "..." : "Rejeitar"}
                            variant="danger"
                            onPress={() => {
                              setConfirm({
                                title: "Rejeitar",
                                message: "Confirmar rejeição?",
                                actions: [
                                  { text: "Cancelar", style: "cancel" },
                                  {
                                    text: "Confirmar",
                                    style: "destructive",
                                    onPress: () => decideMut.mutate({ id: item.id, action: "reject" }),
                                  },
                                ],
                              });
                            }}
                            loading={decideMut.isPending}
                            disabled={decideMut.isPending}
                            style={{ height: 46, borderRadius: 14 }}
                          />
                        </View>
                      </>
                    ) : null}
                  </Card>
                );
              }}
              ListEmptyComponent={<Empty text="Sem solicitações." />}
              refreshing={q.isRefetching}
              onRefresh={() => q.refetch()}
            />
          )}
        </View>
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

const HPAD = 20;

const m = StyleSheet.create({
  nav: {
    height: 52,
    paddingHorizontal: HPAD,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
  },
  backBtn: { minWidth: 64, height: 44, justifyContent: "center" },
  backText: { color: "#000000", fontSize: 22, fontWeight: "800", letterSpacing: -0.2 },
  navTitle: { color: "#000000", fontSize: 17, fontWeight: "900", letterSpacing: -0.2 },
  rightBtn: { minWidth: 64, height: 44, alignItems: "flex-end", justifyContent: "center" },
  rightText: { color: "#000000", fontSize: 16, fontWeight: "900" },

  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(0,0,0,0.18)", width: "100%" },

  h1: { color: "#000000", fontSize: 18, fontWeight: "900", letterSpacing: -0.2 },
  sub: { marginTop: 6, color: "#000000", fontSize: 12, fontWeight: "700", opacity: 0.75 },

  card: { padding: 14, borderRadius: 18, backgroundColor: "#FFFFFF" },

  sectionTitle: { color: "#000000", fontWeight: "900", fontSize: 14, letterSpacing: -0.1 },
  label: { marginTop: 10, color: "#000000", fontWeight: "900", fontSize: 12, opacity: 0.7 },

  input: {
    marginTop: 8,
    height: 48,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.35)",
    borderRadius: 14,
    paddingHorizontal: 14,
    color: "#000000",
    fontWeight: "700",
    backgroundColor: "#FFFFFF",
  },

  filters: { flexDirection: "row", gap: 8, flexWrap: "wrap" },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.25)",
    backgroundColor: "#FFFFFF",
  },
  chipActive: { borderColor: "#000000", backgroundColor: "#000000" },
  chipText: { color: "#000000", fontSize: 12, fontWeight: "900", opacity: 0.75, letterSpacing: -0.1 },
  chipTextActive: { color: "#FFFFFF", opacity: 1 },

  rowTop: { flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "flex-start" },
  itemTitle: { color: "#000000", fontWeight: "900" },
  itemMeta: { marginTop: 6, color: "#000000", fontWeight: "700", opacity: 0.7 },

  actions: { marginTop: 12, flexDirection: "row", gap: 10, flexWrap: "wrap" },

  primaryBtn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#000000",
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    flexGrow: 1,
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "900", fontSize: 14, letterSpacing: -0.2 },

  outlineBtn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#000000",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  outlineBtnText: { color: "#000000", fontWeight: "900", fontSize: 14, letterSpacing: -0.2 },
});