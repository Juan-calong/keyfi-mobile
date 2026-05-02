import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  ScrollView,
  Pressable,
  Image,
  Platform,
  ToastAndroid,
  StatusBar,
  SafeAreaView,
  StyleSheet,
  Modal,
  GestureResponderEvent,
  useWindowDimensions,
  type ViewStyle,
} from "react-native";

import { useQuery } from "@tanstack/react-query";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { Loading, ErrorState, Empty } from "../../ui/components/State";

import { ProductsService, Product } from "../../core/api/services/products.service";
import { CategoriesService, Category } from "../../core/api/services/categories.service";
import { useSellerSessionStore } from "../../stores/seller.session.store";
import { getProductImageUrl } from "../../core/utils/productImage";

import { IosAlert } from "../../ui/components/IosAlert";
import { IosConfirm, type IosConfirmAction } from "../../ui/components/IosConfirm";
import { SELLER_SCREENS } from "../../navigation/seller.routes";

type PromoDTO = {
  id: string;
  type: string;
  value?: string;
  sellerValue?: string | null;
  salonValue?: string | null;
  appliesTo?: "SELLER" | "SALON" | "BOTH";
  appliesToSeller?: boolean;
  appliesToSalon?: boolean;
};

type PromoRow = { promo: PromoDTO; product: Product };

function asArray<T>(v: any): T[] {
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.items)) return v.items;
  if (Array.isArray(v?.data)) return v.data;
  return [];
}

function toNumberBR(v: any): number {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function formatBRL(value: string | number) {
  const n = toNumberBR(value);
  if (!Number.isFinite(n)) return "R$ —";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function clampMin(n: number, min = 0) {
  return n < min ? min : n;
}

function stop(e?: GestureResponderEvent) {
  e?.stopPropagation?.();
}

function promoAppliesToSeller(promo?: PromoDTO | null) {
  if (!promo) return false;
  if (typeof promo.appliesToSeller === "boolean") return promo.appliesToSeller;

  const a = String(promo.appliesTo ?? "").toUpperCase();
  if (a === "SELLER" || a === "BOTH") return true;
  if (a === "SALON") return false;

  return true;
}

function getSellerPromoValue(promo: PromoDTO) {
  return promo.sellerValue ?? promo.value ?? "0";
}

function applyPromo(basePrice: number, promo: PromoDTO) {
  const value = toNumberBR(getSellerPromoValue(promo));
  switch (String(promo.type || "").toUpperCase()) {
    case "PCT": {
      const pct = clampMin(value, 0);
      const final = basePrice * (1 - pct / 100);
      return clampMin(final, 0);
    }
    case "VALUE": {
      const final = basePrice - value;
      return clampMin(final, 0);
    }
    case "PRICE":
    case "FIXED_PRICE": {
      return clampMin(value, 0);
    }
    default:
      return basePrice;
  }
}

function badgeText(promo: PromoDTO, base: number, final: number) {
  if (!(final < base)) return null;
  const type = String(promo.type || "").toUpperCase();
  if (type === "PCT") return `-${Math.round(toNumberBR(getSellerPromoValue(promo)))}%`;
  return "PROMO";
}

const ALL = "ALL" as const;
const PROMOS = "PROMOS" as const;

const BLACK = "#000000";
const WHITE = "#FFFFFF";
const LINE = "rgba(0,0,0,0.12)";

function FlatChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        chipStyles.chip,
        active && chipStyles.chipActive,
        pressed && { opacity: 0.7 },
      ]}
      hitSlop={6}
    >
      <Text style={[chipStyles.chipText, active && chipStyles.chipTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function SellerCartScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const listRef = useRef<FlatList<Product>>(null);
  const { width } = useWindowDimensions();

  const isTablet = width >= 768;
  const contentMaxWidth = width >= 1200 ? 980 : isTablet ? 820 : undefined;

  const constrainedStyle: ViewStyle | undefined = isTablet
    ? {
        maxWidth: contentMaxWidth,
        alignSelf: "center",
        width: "100%",
      }
    : undefined;

  const [q, setQ] = useState("");
  const [selectedCat, setSelectedCat] = useState<string>(ALL);

  const [selectedById, setSelectedById] = useState<Record<string, boolean>>({});
  const [cartOpen, setCartOpen] = useState(false);

  const activeSalonId = useSellerSessionStore((s) => s.activeSalonId);
  const setActiveSalonId = useSellerSessionStore((s) => s.setActiveSalonId);
  const salonId = route?.params?.salonId || activeSalonId || null;

  const [modal, setModal] = useState<null | { title: string; message: string }>(null);
  const [confirm, setConfirm] = useState<null | { title: string; message: string; actions: IosConfirmAction[] }>(null);

  function toast(msg: string) {
    const short = msg.length > 44 ? msg.slice(0, 44) + "…" : msg;
    if (Platform.OS === "android") ToastAndroid.show(short, ToastAndroid.SHORT);
    else setModal({ title: "Info", message: short });
  }

  useEffect(() => {
    if (route?.params?.salonId && route.params.salonId !== activeSalonId) {
      setActiveSalonId(route.params.salonId);
    }
    if (!salonId) {
      setModal({
        title: "Selecione um salão",
        message: "Abra o carrinho a partir de um salão aprovado.",
      });
    }
  }, [activeSalonId, route?.params?.salonId, salonId, setActiveSalonId]);

  const categoriesQ = useQuery({
    queryKey: ["seller-categories", { active: "true" }],
    queryFn: () => CategoriesService.list({ active: "true" }),
    retry: false,
    staleTime: 0,
  });

  const productsQ = useQuery({
    queryKey: ["seller-products", { active: "true" }],
    queryFn: () => ProductsService.list({ active: "true" }),
    retry: false,
    staleTime: 0,
  });

  const promosQ = useQuery({
    queryKey: ["seller-promos-active", { take: 200 }],
    queryFn: async () => ProductsService.promosActive({ take: 200, appliesTo: "SELLER" }),
    retry: false,
    staleTime: 0,
    enabled: true,
  });

  const categories: Category[] = useMemo(() => asArray<Category>(categoriesQ.data), [categoriesQ.data]);

  const productsAll: Product[] = useMemo(() => {
    const raw = asArray<Product>(productsQ.data);
    return raw.filter((p: any) => {
      const stock = Number(p?.stock ?? 0);
      const active = p?.active !== false;
      return active && stock > 0;
    });
  }, [productsQ.data]);

  const promoRows = useMemo(() => asArray<PromoRow>((promosQ.data as any) ?? []), [promosQ.data]);

  const promoByProductId = useMemo(() => {
    const map = new Map<string, PromoDTO>();
    for (const row of promoRows) {
      const pid = row?.product?.id;
      const promo = row?.promo;
      if (!pid || !promo) continue;
      if (promoAppliesToSeller(promo)) map.set(pid, promo);
    }
    return map;
  }, [promoRows]);

  const promoIds = useMemo(() => new Set(Array.from(promoByProductId.keys())), [promoByProductId]);

  useEffect(() => {
    const validIds = new Set(productsAll.map((p: any) => String(p.id)));
    setSelectedById((prev) => {
      let changed = false;
      const next: Record<string, boolean> = {};
      for (const [id, selected] of Object.entries(prev)) {
        if (selected && validIds.has(id)) next[id] = true;
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [productsAll]);

  const products = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return productsAll.filter((p: any) => {
      const okCat =
        selectedCat === ALL
          ? true
          : selectedCat === PROMOS
            ? promoIds.has(p.id)
            : String(p.categoryId || "") === selectedCat;

      const okQ =
        !qq ||
        String(p.name || "").toLowerCase().includes(qq) ||
        String(p.description || "").toLowerCase().includes(qq);

      return okCat && okQ;
    });
  }, [productsAll, q, selectedCat, promoIds]);

  const cartIds = useMemo(() => Object.keys(selectedById).filter((id) => selectedById[id]), [selectedById]);
  const cartCount = cartIds.length;

  const cartLines = useMemo(() => {
    const byId = new Map(productsAll.map((p) => [String((p as any).id), p]));
    return cartIds.map((id) => byId.get(id)).filter(Boolean) as Product[];
  }, [cartIds, productsAll]);

  const cartTotal = useMemo(() => {
    let total = 0;
    for (const p of cartLines) {
      const base = toNumberBR((p as any).price);
      const promo = promoByProductId.get(String((p as any).id)) ?? null;
      const final = promo ? applyPromo(base, promo) : base;
      total += final;
    }
    return total;
  }, [cartLines, promoByProductId]);

  const isLoading = productsQ.isLoading || categoriesQ.isLoading || promosQ.isLoading;
  const isError = productsQ.isError || categoriesQ.isError || promosQ.isError;

  const onRefreshAll = () => {
    productsQ.refetch();
    categoriesQ.refetch();
    promosQ.refetch();
  };

  const toggleSelect = (productId: string) => {
    setSelectedById((prev) => {
      const next = { ...prev };
      next[productId] = !prev[productId];
      return next;
    });
  };

  const clearCart = () => {
    if (!cartCount) return;

    setConfirm({
      title: "Limpar carrinho?",
      message: "Isso vai remover todos os itens selecionados.",
      actions: [
        { text: "Cancelar", style: "cancel" },
        { text: "Limpar", style: "destructive", onPress: () => setSelectedById({}) },
      ],
    });
  };

  return (
    <Screen style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      <View style={styles.header}>
        <View style={[styles.headerInner, constrainedStyle]}>
          <Pressable onPress={() => nav.goBack?.()} hitSlop={12} style={styles.headerLeft}>
            <Text style={styles.chev}>‹</Text>
            <Text style={styles.backText}>Back</Text>
          </Pressable>

          <Text style={styles.headerTitle}>Comprar</Text>

          <Pressable
            onPress={() => {
              if (!cartCount) return toast("Carrinho vazio");
              setCartOpen(true);
            }}
            hitSlop={12}
            style={styles.headerRight}
          >
            <Text style={styles.cartText}>{`Carrinho (${cartCount})`}</Text>
          </Pressable>
        </View>
      </View>

      <Container style={styles.container}>
        <View style={[styles.rule, { marginTop: 6 }]} />

        <View style={{ marginTop: 10, marginBottom: 10 }}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Nome do produto"
            placeholderTextColor="rgba(0,0,0,0.45)"
            style={[styles.search, isTablet && styles.searchTablet]}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>

        <View style={{ marginBottom: 10 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            <FlatChip label="🔥 Promoções" active={selectedCat === PROMOS} onPress={() => setSelectedCat(PROMOS)} />
            <FlatChip label="Todas" active={selectedCat === ALL} onPress={() => setSelectedCat(ALL)} />
            {categories.map((c) => (
              <FlatChip
                key={(c as any).id}
                label={(c as any).name}
                active={selectedCat === (c as any).id}
                onPress={() => setSelectedCat((c as any).id)}
              />
            ))}
          </ScrollView>
        </View>

        <View style={{ flex: 1, minHeight: 0 }}>
          {isLoading ? (
            <Loading />
          ) : isError ? (
            <ErrorState onRetry={onRefreshAll} />
          ) : (
            <FlatList
              ref={listRef}
              data={products}
              numColumns={1}
              keyExtractor={(i) => String((i as any).id)}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={<Empty text="Sem produtos disponíveis nesse filtro." />}
              refreshing={productsQ.isRefetching || categoriesQ.isRefetching || promosQ.isRefetching}
              onRefresh={onRefreshAll}
              renderItem={({ item }) => {
                const id = String((item as any).id);
                const selected = !!selectedById[id];

                const base = toNumberBR((item as any).price);
                const promo = promoByProductId.get(id) ?? null;
                const final = promo ? applyPromo(base, promo) : base;
                const hasDiscount = promo ? final < base : false;
                const promoBadge = promo && hasDiscount ? badgeText(promo, base, final) : null;

                const img = getProductImageUrl(item) || (item as any)?.primaryImageUrl || null;

                const onBuyPress = (e?: GestureResponderEvent) => {
                  stop(e);
                  toggleSelect(id);
                  toast(selected ? "Removido ✅" : "Adicionado ✅");
                };

                return (
                  <View style={styles.rowPress}>
                    <View style={[styles.row, isTablet && styles.rowTablet]}>
                      <View style={[styles.thumbWrap, isTablet && styles.thumbWrapTablet]}>
                        {img ? (
                          <Image source={{ uri: String(img) }} style={styles.thumbImg} resizeMode="contain" />
                        ) : (
                          <View style={styles.thumbPh}>
                            <Text style={styles.thumbPhText}>No image</Text>
                          </View>
                        )}

                        {!!promoBadge ? (
                          <View style={styles.promoBadge}>
                            <Text style={styles.promoBadgeTxt}>{promoBadge}</Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.info}>
                        <Text style={[styles.name, isTablet && styles.nameTablet]} numberOfLines={1}>
                          {(item as any)?.name || "—"}
                        </Text>

                        <View style={styles.priceLine}>
                          <Text style={[styles.price, isTablet && styles.priceTablet]}>
                            {formatBRL(hasDiscount ? final : base)}
                          </Text>
                          {hasDiscount ? (
                            <Text style={[styles.oldPrice, isTablet && styles.oldPriceTablet]}>
                              {formatBRL(base)}
                            </Text>
                          ) : null}
                        </View>

                        {!!(item as any)?.description ? (
                          <Text style={styles.desc} numberOfLines={1}>
                            {String((item as any).description)}
                          </Text>
                        ) : null}
                      </View>

                      <Pressable
                        onPress={onBuyPress}
                        hitSlop={10}
                        style={({ pressed }) => [
                          styles.buyBtn,
                          isTablet && styles.buyBtnTablet,
                          selected && styles.buyBtnActive,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.buyText,
                            isTablet && styles.buyTextTablet,
                            selected && styles.buyTextActive,
                          ]}
                        >
                          {selected ? "Remove" : "Buy"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      </Container>

      <Modal
        visible={cartOpen}
        animationType="slide"
        onRequestClose={() => setCartOpen(false)}
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: WHITE }}>
          <View style={styles.modalNav}>
            <View style={[styles.modalNavInner, constrainedStyle]}>
              <Pressable onPress={() => setCartOpen(false)} hitSlop={12} style={styles.modalLeft}>
                <Text style={styles.chev}>‹</Text>
                <Text style={styles.backText}>Back</Text>
              </Pressable>

              <Text style={styles.modalTitle}>Carrinho</Text>

              <Pressable onPress={clearCart} hitSlop={12} style={styles.modalRight} disabled={!cartCount}>
                <Text style={[styles.cartText, { opacity: cartCount ? 1 : 0.35 }]}>Clear</Text>
              </Pressable>
            </View>
          </View>

          <View style={[styles.modalContent, constrainedStyle]}>
            <View style={styles.separator} />

            {cartCount === 0 ? (
              <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 16 }}>
                <Empty text="Seu carrinho está vazio." />
              </View>
            ) : (
              <>
                <FlatList
                  data={cartLines}
                  keyExtractor={(p: any) => String(p.id)}
                  contentContainerStyle={{ paddingBottom: 130 }}
                  ItemSeparatorComponent={() => <View style={styles.separator} />}
                  renderItem={({ item }) => {
                    const id = String((item as any).id);
                    const base = toNumberBR((item as any).price);
                    const promo = promoByProductId.get(id) ?? null;
                    const final = promo ? applyPromo(base, promo) : base;
                    const hasDiscount = promo ? final < base : false;

                    const img = getProductImageUrl(item) || (item as any)?.primaryImageUrl || null;

                    return (
                      <View style={[styles.row, isTablet && styles.rowTablet, { paddingVertical: 12 }]}>
                        <View style={[styles.thumbWrap, { width: 56, height: 56 }, isTablet && { width: 72, height: 72 }]}>
                          {img ? (
                            <Image source={{ uri: String(img) }} style={styles.thumbImg} resizeMode="contain" />
                          ) : (
                            <View style={styles.thumbPh}>
                              <Text style={styles.thumbPhText}>No image</Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.info}>
                          <Text style={[styles.name, isTablet && styles.nameTablet]} numberOfLines={1}>
                            {(item as any)?.name || "—"}
                          </Text>

                          <View style={styles.priceLine}>
                            <Text style={[styles.price, isTablet && styles.priceTablet]}>
                              {formatBRL(final)}
                            </Text>
                            {hasDiscount ? (
                              <Text style={[styles.oldPrice, isTablet && styles.oldPriceTablet]}>
                                {formatBRL(base)}
                              </Text>
                            ) : null}
                          </View>
                        </View>

                        <Pressable
                          onPress={() => {
                            toggleSelect(id);
                            toast("Removido ✅");
                          }}
                          hitSlop={10}
                          style={({ pressed }) => [
                            styles.buyBtn,
                            isTablet && styles.buyBtnTablet,
                            styles.buyBtnActive,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text style={[styles.buyText, isTablet && styles.buyTextTablet, styles.buyTextActive]}>
                            Remove
                          </Text>
                        </Pressable>
                      </View>
                    );
                  }}
                />

                <View style={styles.footer}>
                  <View style={[styles.footerInner, constrainedStyle]}>
                    <View style={styles.footerRule} />

                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
                      <Text style={styles.totalLabel}>Total estimado</Text>
                      <Text style={styles.totalValue}>{formatBRL(cartTotal)}</Text>
                    </View>

                    <Text style={styles.totalHint}>
                      Valor final pode mudar após preview oficial no checkout.
                    </Text>

                    <Pressable
                      onPress={() => {
                        if (!salonId) {
                          setModal({
                            title: "Selecione um salão",
                            message: "Você precisa estar com um salão ativo antes de continuar.",
                          });
                          return;
                        }

                        const items = cartIds.map((id) => ({
                          productId: id,
                          qty: 1,
                        }));

                        setCartOpen(false);

                        nav.navigate(SELLER_SCREENS.Cart, {
                          salonId,
                          items,
                        });
                      }}
                      style={({ pressed }) => [styles.checkoutBtn, pressed && styles.pressed]}
                    >
                      <Text style={[styles.checkoutText, isTablet && styles.checkoutTextTablet]}>
                        Continuar
                      </Text>
                    </Pressable>

                    <View style={{ height: 10 }} />

                    <Pressable
                      onPress={() => setCartOpen(false)}
                      style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
                    >
                      <Text style={styles.ghostText}>Fechar</Text>
                    </Pressable>
                  </View>
                </View>
              </>
            )}
          </View>
        </SafeAreaView>
      </Modal>

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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: WHITE },

  header: {
    backgroundColor: WHITE,
  },
  headerInner: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 6, minWidth: 80 },
  headerTitle: { color: BLACK, fontSize: 17, fontWeight: "600", letterSpacing: -0.3 },
  headerRight: { minWidth: 120, alignItems: "flex-end" },
  cartText: { fontSize: 14, color: BLACK, fontWeight: "600", letterSpacing: -0.2 },

  chev: { fontSize: 28, lineHeight: 28, color: BLACK, marginTop: Platform.OS === "android" ? -2 : 0 },
  backText: { fontSize: 16, color: BLACK, fontWeight: "500" },

  container: { flex: 1 },
  rule: { height: 1, backgroundColor: LINE, marginBottom: 10 },

  search: {
    height: 46,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: WHITE,
    color: BLACK,
    fontWeight: "600",
  },
  searchTablet: {
    height: 52,
    fontSize: 16,
    paddingHorizontal: 16,
  },

  chipsRow: { gap: 10, paddingRight: 8 },

  listContent: { paddingBottom: 24 },
  separator: { height: 1, backgroundColor: LINE },

  rowPress: { paddingVertical: 2 },

  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 14 },
  rowTablet: { paddingVertical: 18, gap: 18 },

  thumbWrap: {
    width: 74,
    height: 74,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: WHITE,
    overflow: "hidden",
    position: "relative",
  },
  thumbWrapTablet: {
    width: 92,
    height: 92,
    borderRadius: 14,
  },
  thumbImg: { width: "100%", height: "100%" },
  thumbPh: { flex: 1, alignItems: "center", justifyContent: "center" },
  thumbPhText: { color: "rgba(0,0,0,0.45)", fontWeight: "700", fontSize: 11 },

  promoBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.78)",
  },
  promoBadgeTxt: { color: "#fff", fontWeight: "900", fontSize: 11 },

  info: { flex: 1, gap: 6, minWidth: 0 },
  name: { fontSize: 16, fontWeight: "700", color: BLACK },
  nameTablet: { fontSize: 19 },
  desc: { color: "rgba(0,0,0,0.55)", fontWeight: "600", fontSize: 12 },

  priceLine: { flexDirection: "row", alignItems: "flex-end", gap: 8, flexWrap: "wrap" },
  price: { fontSize: 14, fontWeight: "700", color: BLACK, opacity: 0.9 },
  priceTablet: { fontSize: 17 },
  oldPrice: {
    color: "rgba(0,0,0,0.5)",
    fontWeight: "700",
    textDecorationLine: "line-through",
    fontSize: 12,
  },
  oldPriceTablet: { fontSize: 13 },

  buyBtn: {
    borderWidth: 1,
    borderColor: LINE,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: WHITE,
    minWidth: 84,
    alignItems: "center",
    justifyContent: "center",
  },
  buyBtnTablet: {
    minWidth: 96,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buyBtnActive: { backgroundColor: BLACK, borderColor: BLACK },
  buyText: { fontSize: 15, fontWeight: "800", color: BLACK, letterSpacing: -0.2 },
  buyTextTablet: { fontSize: 16 },
  buyTextActive: { color: WHITE },

  pressed: { opacity: 0.6 },

  modalNav: {
    backgroundColor: WHITE,
  },
  modalNavInner: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalLeft: { flexDirection: "row", alignItems: "center", gap: 6, minWidth: 80 },
  modalTitle: { color: BLACK, fontSize: 17, fontWeight: "600" },
  modalRight: { minWidth: 80, alignItems: "flex-end" },

  modalContent: {
    flex: 1,
    width: "100%",
  },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: WHITE,
  },
  footerInner: {
    width: "100%",
  },
  footerRule: { height: 1, backgroundColor: LINE, marginBottom: 12 },

  totalLabel: { color: "rgba(0,0,0,0.65)", fontWeight: "800", fontSize: 13 },
  totalValue: { color: BLACK, fontWeight: "900", fontSize: 15 },
  totalHint: { color: "rgba(0,0,0,0.5)", fontWeight: "600", fontSize: 11, marginBottom: 10 },

  checkoutBtn: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BLACK,
  },
  checkoutText: { fontSize: 18, fontWeight: "900", color: WHITE, letterSpacing: -0.2 },
  checkoutTextTablet: { fontSize: 20 },

  ghostBtn: {
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  ghostText: { fontSize: 14, fontWeight: "900", color: BLACK, letterSpacing: -0.2, opacity: 0.7 },
});

const chipStyles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: WHITE,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
  },
  chipActive: { borderColor: BLACK, backgroundColor: BLACK },
  chipText: { color: BLACK, fontWeight: "800", fontSize: 12, opacity: 0.85 },
  chipTextActive: { color: WHITE, opacity: 1 },
});