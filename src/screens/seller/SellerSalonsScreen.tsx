import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../../core/api/client";
import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { ErrorState } from "../../ui/components/State";
import { IosAlert } from "../../ui/components/IosAlert";
import { friendlyError } from "../../core/errors/friendlyError";

type Salon = { id: string; name: string; cnpj: string };

async function fetchMySalons() {
  const res = await api.get<Salon[]>("/seller/salons");
  return res.data;
}

export function SellerSalonsScreen() {
  const qc = useQueryClient();
  const [salonId, setSalonId] = useState("");

  const [modal, setModal] = useState<null | { title: string; message: string }>(null);

  const cleanSalonId = useMemo(() => String(salonId || "").trim(), [salonId]);
  const canSubmit = cleanSalonId.length > 0;

  const q = useQuery({
    queryKey: ["seller-salons"],
    queryFn: fetchMySalons,
    retry: false,
    staleTime: 0,
  });

  const requestMut = useMutation({
    mutationFn: async () => {
      if (!cleanSalonId) throw new Error("Cole o ID do salão.");
      const res = await api.post("/seller/permissions/request", { salonId: cleanSalonId });
      return res.data;
    },
    onSuccess: () => {
      setSalonId("");
      qc.invalidateQueries({ queryKey: ["seller-salons"] });
      setModal({ title: "Enviado", message: "Solicitação enviada para o salão." });
    },
    onError: (e: any) => {
      const fe = friendlyError(e);
      setModal({
        title: fe?.title || "Erro",
        message: fe?.message || "Não foi possível enviar a solicitação.",
      });
    },
  });

  return (
    <Screen>
      <Container style={s.container}>
        <Text style={s.title}>Meus salões</Text>

        <View style={s.card}>
          <Text style={s.cardTitle}>Pedir permissão</Text>
          <Text style={s.cardSub}>
            Cole aqui o ID do salão (por enquanto). Depois a gente troca por busca por CNPJ/nome.
          </Text>

          <TextInput
            value={salonId}
            onChangeText={setSalonId}
            placeholder="salonId (uuid)"
            placeholderTextColor="#8A8A8A"
            style={[s.input, { marginTop: 10 }]}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!requestMut.isPending}
            returnKeyType="done"
            onSubmitEditing={() => (canSubmit && !requestMut.isPending ? requestMut.mutate() : null)}
          />

          <Pressable
            style={({ pressed }) => [
              s.primaryBtn,
              pressed && { opacity: 0.85 },
              (!canSubmit || requestMut.isPending) && { opacity: 0.55 },
            ]}
            onPress={() => requestMut.mutate()}
            disabled={!canSubmit || requestMut.isPending}
          >
            <Text style={s.primaryBtnText}>{requestMut.isPending ? "Enviando..." : "Enviar solicitação"}</Text>
          </Pressable>
        </View>

        <View style={s.rowBetween}>
          <Text style={s.sectionTitle}>Ativos comigo</Text>

          <Pressable
            style={({ pressed }) => [s.ghostBtn, pressed && { opacity: 0.75 }]}
            onPress={() => q.refetch()}
          >
            <Text style={s.ghostBtnText}>{q.isRefetching ? "..." : "Atualizar"}</Text>
          </Pressable>
        </View>

        {q.isLoading ? (
          <View style={s.center}>
            <ActivityIndicator />
            <Text style={s.muted}>Carregando…</Text>
          </View>
        ) : q.isError ? (
          <ErrorState onRetry={() => q.refetch()} />
        ) : (
          <FlatList
            data={q.data ?? []}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ paddingBottom: 24 }}
            renderItem={({ item }) => (
              <View style={s.card}>
                <Text style={s.cardTitle}>{item.name}</Text>
                <Text style={s.cardSub}>CNPJ: {item.cnpj}</Text>
              </View>
            )}
            ListEmptyComponent={
              <View style={s.center}>
                <Text style={s.muted}>Nenhum salão ativo ainda.</Text>
              </View>
            }
            refreshing={q.isRefetching}
            onRefresh={() => q.refetch()}
          />
        )}

        <IosAlert visible={!!modal} title={modal?.title} message={modal?.message} onClose={() => setModal(null)} />
      </Container>
    </Screen>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6F1E9", padding: 16 },
  title: { fontSize: 22, fontWeight: "900", color: "#111", marginBottom: 12 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: "#111" },

  card: { backgroundColor: "#FFF", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#E6E0D8", marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: "900", color: "#111" },
  cardSub: { marginTop: 4, color: "#5A5A5A", fontWeight: "700" },

  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E6E0D8",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#111",
    fontWeight: "800",
  },

  primaryBtn: { marginTop: 10, backgroundColor: "#111", paddingVertical: 12, borderRadius: 16, alignItems: "center" },
  primaryBtnText: { color: "#FFF", fontWeight: "900" },

  ghostBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: "#DCD6CD", backgroundColor: "#FFF" },
  ghostBtnText: { color: "#111", fontWeight: "900" },

  center: { alignItems: "center", justifyContent: "center", paddingVertical: 24, gap: 8 },
  muted: { color: "#6A6A6A", fontWeight: "800" },
});