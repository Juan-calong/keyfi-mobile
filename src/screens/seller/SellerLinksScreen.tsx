import React, { useMemo, useCallback, useState, useEffect } from "react";
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

import { SellerService, type SellerPermissionDTO } from "../../core/api/services/seller.service";
import { useSellerSessionStore } from "../../stores/seller.session.store";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SELLER_SCREENS } from "../../navigation/seller.routes";

import { IosAlert } from "../../ui/components/IosAlert";

type NormalizedSellerPermission = {
  permissionId: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "REVOKED" | string;
  salonId: string | null;
  salonName: string;
  copyCode: string | null;
  raw: SellerPermissionDTO;
};

type SellerLinksSection = {
  title: string;
  data: NormalizedSellerPermission[];
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

function normalizeSellerPermission(item: SellerPermissionDTO): NormalizedSellerPermission {
  const permissionId = String(item?.id ?? item?.permissionCode ?? item?.token ?? "").trim() || `missing-${Math.random()}`;
  const status = String(item?.status ?? "").toUpperCase() || "—";
  const salonId =
    String(item?.salonId ?? item?.salonUUID ?? item?.salon?.id ?? item?.salon?.uuid ?? "").trim() || null;
  const salonName =
    String(item?.salon?.name ?? item?.salonName ?? item?.name ?? "").trim() || "Salão";
  const copyCode =
    String(
      item?.code ??
        item?.token ??
        item?.referralCode ??
        item?.sellerCode ??
        item?.permissionCode ??
        item?.salon?.code ??
        item?.salon?.referralCode ??
        ""
    ).trim() || null;

  return { permissionId, status, salonId, salonName, copyCode, raw: item };
}

function sortByName(a: NormalizedSellerPermission, b: NormalizedSellerPermission) {
  const na = String(a.salonName ?? "");
  const nb = String(b.salonName ?? "");
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
  item: NormalizedSellerPermission;
  onCopy: (item: NormalizedSellerPermission) => void;
  onOpenBuy: (item: NormalizedSellerPermission) => void;
}) {
  const statusUp = String(item.status).toUpperCase();
  const salonName = item.salonName || "Salão";

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
        onPress={() => onCopy(item)}
        >
          <Text style={s.btnOutlineTxt}>Copiar código</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            s.btnSolid,
            pressed && { opacity: 0.9 },
            statusUp !== "APPROVED" && { opacity: 0.35 },
          ]}
          onPress={() => onOpenBuy(item)}
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

 const permsRaw = useMemo(() => asArray<SellerPermissionDTO>(permsQ.data), [permsQ.data]);
  const perms = useMemo(() => permsRaw.map(normalizeSellerPermission), [permsRaw]);

  useEffect(() => {
    console.log("[SELLER_LINKS][PERMISSIONS_RAW]", permsRaw);
    permsRaw.forEach((item, idx) => {
      console.log("[SELLER_LINKS][PERMISSIONS_SUMMARY]", {
        itemId: item?.id ?? null,
        status: item?.status ?? null,
        salonId: item?.salonId ?? item?.salonUUID ?? null,
        nestedSalonId: item?.salon?.id ?? item?.salon?.uuid ?? null,
        salonName: item?.salonName ?? item?.name ?? null,
        nestedSalonName: item?.salon?.name ?? null,
        code: item?.code ?? item?.token ?? item?.referralCode ?? item?.sellerCode ?? item?.permissionCode ?? null,
        nestedCode: item?.salon?.code ?? item?.salon?.referralCode ?? null,
        keys: Object.keys(item ?? {}),
        index: idx,
      });
    });
  }, [permsRaw]);

  const filtered = useMemo(() => {
    const query = String(q || "").trim().toLowerCase();
    if (!query) return perms;

    return perms.filter((p) => {
      return (
        String(p.salonName ?? "").toLowerCase().includes(query) ||
        String(p.copyCode ?? "").toLowerCase().includes(query) ||
        String(p.salonId ?? "").toLowerCase().includes(query) ||
        String(p.status ?? "").toLowerCase().includes(query)
      );
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

  const copy = useCallback((item: NormalizedSellerPermission) => {
    console.log("[SELLER_LINKS][COPY_PRESS]", {
      permissionId: item.permissionId,
      salonId: item.salonId,
      salonName: item.salonName,
      hasCode: !!item.copyCode,
    });
    if (!item.copyCode) {
      setModal({ title: "Código indisponível", message: "Código indisponível para este vínculo." });
      return;
    }
    Clipboard.setString(item.copyCode);
    setModal({ title: "Código copiado", message: "Já está na área de transferência." });
  }, []);

  const handleOpenBuy = useCallback(
    (item: NormalizedSellerPermission) => {
      console.log("[SELLER_LINKS][OPEN_BUY_PRESS]", {
        permissionId: item.permissionId,
        salonId: item.salonId,
        salonName: item.salonName,
        status: item.status,
      });
      if (String(item.status).toUpperCase() !== "APPROVED") {
        setModal({ title: "Vínculo pendente", message: "Apenas salões aprovados podem abrir o carrinho." });
        return;
      }
      if (!item.salonId) {
        setModal({ title: "Erro", message: "Não foi possível abrir este salão. ID do salão ausente." });
        return;
      }
      setActiveSalonId(item.salonId);
      nav.navigate(SELLER_SCREENS.Buy, { salonId: item.salonId });
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
              keyExtractor={(item) => String(item.permissionId)}
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
});