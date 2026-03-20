import React, { useMemo, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TextInput,
  SectionList,
  Pressable,
  Platform,
  SafeAreaView,
} from "react-native";
import Clipboard from "@react-native-clipboard/clipboard";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { Loading, ErrorState, Empty } from "../../ui/components/State";

import { SellerService } from "../../core/api/services/seller.service";
import { useSellerSessionStore } from "../../stores/seller.session.store";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SELLER_SCREENS } from "../../navigation/seller.routes";

import { IosAlert } from "../../ui/components/IosAlert";

type SellerPermissionItem = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "REVOKED" | string;
  salon: { id: string; name: string; cnpj?: string };
};

type SellerLinksSection = {
  title: string;
  data: SellerPermissionItem[];
};

const COLORS = {
  bg: "#FFFFFF",
  text: "#000000",
  subtle: "rgba(0,0,0,0.62)",
  hairline: "rgba(0,0,0,0.18)",
  outline: "#000000",
  outlineSoft: "rgba(0,0,0,0.28)",
  placeholder: "rgba(0,0,0,0.35)",
};

function asArray<T>(v: any): T[] {
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.items)) return v.items;
  if (Array.isArray(v?.permissions)) return v.permissions;
  return [];
}

function labelForStatus(s: string) {
  const up = String(s || "").toUpperCase();
  if (up === "APPROVED") return "Aprovado";
  if (up === "PENDING") return "Pendente";
  if (up === "REJECTED") return "Recusado";
  if (up === "REVOKED") return "Removido";
  return up || "—";
}

function sortByName(a: SellerPermissionItem, b: SellerPermissionItem) {
  const na = String(a.salon?.name ?? "");
  const nb = String(b.salon?.name ?? "");
  return na.localeCompare(nb);
}

function LinksHeader({
  totalCount,
  q,
  setQ,
}: {
  totalCount: number;
  q: string;
  setQ: (v: string) => void;
}) {
  return (
    <View style={{ gap: 16 }}>
      <View style={s.nav}>
        <View style={{ width: 34 }} />
        <Text style={s.navTitle}>Meus vínculos</Text>
        <View style={{ width: 34 }} />
      </View>

      <Text style={s.subtitle}>Seus salões vinculados</Text>

      <View style={s.hr} />

      <View style={{ gap: 10 }}>
        <Text style={s.sectionTitle}>Salões ({totalCount})</Text>

        <View style={s.searchWrap}>
          <Text style={s.magnifier}>⌕</Text>

          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Buscar salão…"
            placeholderTextColor={COLORS.placeholder}
            style={s.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            selectionColor={COLORS.placeholder}
          />
        </View>
      </View>
    </View>
  );
}

function LinksSectionHeader({ title }: { title: string }) {
  return (
    <View style={s.groupRow}>
      <Text style={s.groupTitle}>{title}</Text>
      <View style={s.groupLine} />
    </View>
  );
}

function LinksRow({
  item,
  onCopy,
  onOpenBuy,
}: {
  item: SellerPermissionItem;
  onCopy: (text: string, label?: string) => void;
  onOpenBuy: (salonUUID: string) => void;
}) {
  const statusUp = String(item.status).toUpperCase();
  const salonName = item.salon?.name ?? "Salão";
  const salonUUID = item.salon?.id ?? "";

  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <Text style={s.rowTitle} numberOfLines={2}>
          {salonName}
        </Text>

        <View style={s.badge}>
          <Text style={s.badgeTxt}>{labelForStatus(item.status)}</Text>
        </View>
      </View>

      <View style={s.cardDivider} />

      <View style={s.actions}>
        <Pressable
          style={({ pressed }) => [s.btnOutline, pressed && { opacity: 0.85 }]}
          onPress={() => salonUUID && onCopy(salonUUID, "Código do salão copiado")}
          disabled={!salonUUID}
        >
          <Text style={s.btnOutlineTxt}>Copiar código</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            s.btnSolid,
            pressed && { opacity: 0.9 },
            statusUp !== "APPROVED" && { opacity: 0.35 },
          ]}
          onPress={() => {
            if (!salonUUID) return;
            if (statusUp !== "APPROVED") return;
            onOpenBuy(salonUUID);
          }}
          disabled={!salonUUID || statusUp !== "APPROVED"}
        >
          <Text style={s.btnSolidTxt}>Abrir carrinho</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function SellerLinksScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const setActiveSalonId = useSellerSessionStore((state) => state.setActiveSalonId);

  const [q, setQ] = useState("");
  const [modal, setModal] = useState<null | { title: string; message: string }>(null);

  const permsQ = useQuery({
    queryKey: ["seller-permissions"],
    queryFn: () => SellerService.listPermissions(),
    retry: false,
    staleTime: 0,
  });

  const TAB_H = 60;
  const bottomReserve = TAB_H + insets.bottom;

  const perms = useMemo(() => asArray<SellerPermissionItem>(permsQ.data), [permsQ.data]);

  const filtered = useMemo(() => {
    const query = String(q || "").trim().toLowerCase();
    if (!query) return perms;

    return perms.filter((p) => {
      const name = String(p.salon?.name ?? "").toLowerCase();
      const cnpj = String(p.salon?.cnpj ?? "").toLowerCase();
      return name.includes(query) || cnpj.includes(query);
    });
  }, [perms, q]);

  const sections = useMemo<SellerLinksSection[]>(() => {
    const approved = filtered
      .filter((p) => String(p.status).toUpperCase() === "APPROVED")
      .sort(sortByName);

    const pending = filtered
      .filter((p) => String(p.status).toUpperCase() === "PENDING")
      .sort(sortByName);

    const others = filtered
      .filter((p) => {
        const up = String(p.status).toUpperCase();
        return up !== "APPROVED" && up !== "PENDING";
      })
      .sort(sortByName);

    const out: SellerLinksSection[] = [];
    if (approved.length) out.push({ title: "APROVADOS", data: approved });
    if (pending.length) out.push({ title: "PENDENTES", data: pending });
    if (others.length) out.push({ title: "OUTROS", data: others });

    return out;
  }, [filtered]);

  const copy = useCallback((text: string, label = "Copiado") => {
    Clipboard.setString(text);
    setModal({ title: label, message: "Já está na área de transferência." });
  }, []);

  const handleOpenBuy = useCallback(
    (salonUUID: string) => {
      setActiveSalonId(salonUUID);
      nav.navigate(SELLER_SCREENS.Buy);
    },
    [nav, setActiveSalonId]
  );

  const totalCount = filtered.length;

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <Container style={{ flex: 1, paddingTop: 8, backgroundColor: COLORS.bg }}>
          {permsQ.isLoading ? (
            <Loading />
          ) : permsQ.isError ? (
            <ErrorState onRetry={() => permsQ.refetch()} />
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ paddingBottom: bottomReserve + 16, gap: 10 }}
              ListHeaderComponent={
                <LinksHeader
                  totalCount={totalCount}
                  q={q}
                  setQ={setQ}
                />
              }
              renderSectionHeader={({ section }) => (
                <LinksSectionHeader title={section.title} />
              )}
              renderItem={({ item }) => (
                <LinksRow
                  item={item}
                  onCopy={copy}
                  onOpenBuy={handleOpenBuy}
                />
              )}
              refreshControl={
                <RefreshControl
                  refreshing={!!permsQ.isFetching && !permsQ.isLoading}
                  onRefresh={() => permsQ.refetch()}
                  tintColor={COLORS.text}
                />
              }
              ListEmptyComponent={
                q ? (
                  <Empty text="Nenhum salão encontrado para essa busca." />
                ) : (
                  <Empty text="Nenhum vínculo encontrado." />
                )
              }
              stickySectionHeadersEnabled={false}
            />
          )}
        </Container>
      </SafeAreaView>

      <IosAlert
        visible={!!modal}
        title={modal?.title}
        message={modal?.message}
        onClose={() => setModal(null)}
      />
    </Screen>
  );
}

function TabIcon({ glyph }: { glyph: string }) {
  return (
    <Pressable style={s.tabItem} onPress={() => {}}>
      <Text style={s.tabGlyph}>{glyph}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  nav: {
    height: 44,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
  },
  navTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  subtitle: {
    textAlign: "center",
    color: COLORS.subtle,
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: -0.1,
  },

  hr: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.hairline,
    marginHorizontal: 18,
  },

  sectionTitle: {
    marginTop: 2,
    color: COLORS.text,
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: -0.1,
  },

  searchWrap: {
    height: 44,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.outlineSoft,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  magnifier: {
    color: COLORS.text,
    opacity: 0.65,
    fontSize: 16,
    transform: [{ translateY: Platform.OS === "ios" ? 0 : -1 }],
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 16,
    paddingVertical: 0,
  },

  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
    marginBottom: 6,
  },
  groupTitle: {
    color: COLORS.text,
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  groupLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.hairline,
  },

  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.outline,
    backgroundColor: COLORS.bg,
    overflow: "hidden",
  },
  cardTop: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowTitle: {
    flex: 1,
    color: COLORS.text,
    fontWeight: "900",
    fontSize: 18,
    letterSpacing: -0.2,
  },

  badge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.outline,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  badgeTxt: {
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 13,
  },

  cardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.hairline,
  },

  actions: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },

  btnOutline: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.outline,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.bg,
  },
  btnOutlineTxt: {
    color: COLORS.text,
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: -0.1,
  },

  btnSolid: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.text,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.text,
  },
  btnSolidTxt: {
    color: COLORS.bg,
    fontWeight: "900",
    fontSize: 15,
    letterSpacing: -0.1,
  },

  tabBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.hairline,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 18 : 12,
    paddingHorizontal: 18,
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: COLORS.bg,
  },
  tabItem: {
    width: 64,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  tabGlyph: {
    color: COLORS.text,
    fontSize: 22,
    opacity: 0.75,
  },
});