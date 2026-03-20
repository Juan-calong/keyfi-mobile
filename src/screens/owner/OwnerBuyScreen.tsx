import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Image,
  GestureResponderEvent,
  Platform,
  StatusBar,
  useWindowDimensions,
} from "react-native";

import { useQuery } from "@tanstack/react-query";
import { useNavigation, useRoute } from "@react-navigation/native";

import { Screen } from "../../ui/components/Screen";
import { Loading, ErrorState } from "../../ui/components/State";

import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";
import { useCartStore } from "../../stores/cart.store";
import { OWNER_SCREENS } from "../../navigation/owner.routes";
import { getProductImageUrl } from "../../core/utils/productImage";

type Product = {
  id: string;
  name: string;
  sku: string;
  price: string;
  customerPrice?: string | null;
  effectivePrice?: string | number;
  stock?: number | null;
  active: boolean;
  categoryId?: string | null;
  description?: string | null;
  primaryImageUrl?: string | null;
  images?: { url: string; isPrimary?: boolean | null; sort?: number | null }[];
  imageUrl?: string | null;
  createdAt?: string | null;
  categoryIds?: string[] | null;
  categories?: { id: string; name: string; active?: boolean }[] | null;
  categoryLinks?: { category?: { id: string; name: string; active?: boolean } }[] | null;
};

type Category = { id: string; name: string; active?: boolean };
type ListResp<T> = { items: T[] } | T[];

type PromoDTO = { id: string; type: string; value: string };
type PromoRow = { promo: PromoDTO; product: Product };

function productHasCategory(p: any, categoryId: string) {
  if (!categoryId) return false;

  if (String(p?.categoryId ?? "") === categoryId) return true;
  if (Array.isArray(p?.categoryIds) && p.categoryIds.includes(categoryId)) return true;
  if (Array.isArray(p?.categories) && p.categories.some((c: any) => c?.id === categoryId)) return true;

  if (
    Array.isArray(p?.categoryLinks) &&
    p.categoryLinks.some((link: any) => link?.category?.id === categoryId)
  ) {
    return true;
  }

  return false;
}

function asItems<T>(v: any): T[] {
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.items)) return v.items;
  if (Array.isArray(v?.data?.items)) return v.data.items;
  return [];
}

function toNumberBR(v: string | number | null | undefined) {
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

function applyPromo(basePrice: number, promo: { type: string; value: string }) {
  const value = toNumberBR(promo.value);

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

function badgeText(promo: { type: string; value: string }, base: number, final: number) {
  if (!(final < base)) return null;
  if (String(promo.type || "").toUpperCase() === "PCT") {
    return `-${Math.round(toNumberBR(promo.value))}%`;
  }
  return "PROMO";
}

function isOutOfStock(p: { stock?: number | null; active?: boolean | null }) {
  if (p.active === false) return true;
  const sRaw = p.stock;
  if (sRaw === null || sRaw === undefined) return false;
  const s = Number(sRaw);
  if (!Number.isFinite(s)) return false;
  return s <= 0;
}

function stop(e?: GestureResponderEvent) {
  e?.stopPropagation?.();
}

function getEffectivePrice(p: any) {
  return p?.effectivePrice ?? p?.customerPrice ?? p?.price;
}

const ALL = "ALL" as const;
const PROMOS = "PROMOS" as const;

type SortMode = "default" | "newest";

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
        pressed && { opacity: 0.75 },
      ]}
      hitSlop={6}
    >
      <Text style={[chipStyles.chipText, active && chipStyles.chipTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function OwnerBuyScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { width } = useWindowDimensions();

  const isTablet = width >= 768;

  const cartCount = useCartStore((s) => s.cartItemsCount());
  const qtyById = useCartStore((s) => s.qtyById);
  const cartInc = useCartStore((s) => s.inc);
  const cartRemove = useCartStore((s) => s.remove);

  const addProductId = route.params?.addProductId as string | undefined;
  const highlightProductId = route.params?.highlightProductId as string | undefined;
  const showPromos = route.params?.showPromos as boolean | undefined;
  const initialCategoryId = route.params?.categoryId as string | undefined;
  const sortParam = route.params?.sort as "newest" | undefined;

  const appliedAddRef = useRef<string | null>(null);
  const appliedHighlightRef = useRef<string | null>(null);
  const appliedInitialFilterKeyRef = useRef<string | null>(null);

  const listRef = useRef<FlatList<Product>>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [selectedCat, setSelectedCat] = useState<string>(ALL);
  const [sortMode, setSortMode] = useState<SortMode>("default");

  const [banner, setBanner] = useState<null | { title: string; message: string }>(null);
  const [bannerKey, setBannerKey] = useState(0);

  function showBanner(title: string, message: string) {
    setBannerKey((k) => k + 1);
    setBanner({ title, message });
  }

  React.useEffect(() => {
    if (!banner) return;
    const tmr = setTimeout(() => setBanner(null), 3500);
    return () => clearTimeout(tmr);
  }, [bannerKey, banner]);

  const toggleLocksRef = useRef<Record<string, boolean>>({});

  const categoriesQ = useQuery({
    queryKey: ["categories", { active: "true" }],
    queryFn: async () =>
      (
        await api.get<ListResp<Category>>(endpoints.categories.list, {
          params: { active: "true" },
        })
      ).data,
    retry: false,
  });

  const productsQ = useQuery({
    queryKey: ["owner-products", { take: 200, active: "true" }],
    queryFn: async () =>
      (
        await api.get<ListResp<Product>>(endpoints.products.list, {
          params: { take: 200, active: "true" },
        })
      ).data,
    retry: false,
  });

  const promosQ = useQuery({
    queryKey: ["owner-promos-active", { take: 200, appliesTo: "SALON" }],
    queryFn: async () =>
      (
        await api.get<ListResp<PromoRow>>(endpoints.products.promosActive, {
          params: { take: 200, appliesTo: "SALON" },
        })
      ).data,
    retry: false,
  });


  const categories = asItems<Category>(categoriesQ.data);
  const productsAll = asItems<Product>(productsQ.data);
  const promoRows = asItems<PromoRow>(promosQ.data);

  const promoByProductId = useMemo(() => {
    const map = new Map<string, PromoDTO>();
    for (const row of promoRows) {
      if (row?.product?.id && row?.promo) {
        map.set(row.product.id, row.promo);
      }
    }
    return map;
  }, [promoRows]);

  const promoIds = useMemo(() => new Set(Array.from(promoByProductId.keys())), [promoByProductId]);

  useEffect(() => {
    const key = JSON.stringify({
      showPromos: !!showPromos,
      categoryId: initialCategoryId ?? null,
      sort: sortParam ?? null,
    });

    if (appliedInitialFilterKeyRef.current === key) return;
    appliedInitialFilterKeyRef.current = key;

    if (showPromos) {
      setSelectedCat(PROMOS);
    } else if (initialCategoryId) {
      setSelectedCat(initialCategoryId);
    } else {
      setSelectedCat(ALL);
    }

    if (sortParam === "newest") {
      setSortMode("newest");
    } else {
      setSortMode("default");
    }

    setQ("");
  }, [showPromos, initialCategoryId, sortParam]);

  useEffect(() => {
    if (!productsAll.length) return;

    for (const [productId, qty] of Object.entries(qtyById || {})) {
      if ((qty ?? 0) <= 0) continue;
      const p = productsAll.find((x) => x.id === productId);
      if (!p) continue;
      if (isOutOfStock(p)) cartRemove(productId);
    }
  }, [productsAll, qtyById, cartRemove]);

    const products = useMemo(() => {
    const qq = q.trim().toLowerCase();

    let filtered = productsAll.filter((p) => {
      const hiddenByStock = isOutOfStock(p);
      if (hiddenByStock) return false;

      const okCat =
        selectedCat === ALL
          ? true
          : selectedCat === PROMOS
            ? promoIds.has(p.id)
            : productHasCategory(p, selectedCat);

      const okQ =
        !qq ||
        String(p.name || "").toLowerCase().includes(qq) ||
        String(p.sku || "").toLowerCase().includes(qq);

      return okCat && okQ;
    });

    if (sortMode === "newest") {
      filtered = [...filtered].sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      });
    }

    return filtered;
  }, [productsAll, q, selectedCat, promoIds, sortMode]);

  const indexById = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p, idx) => map.set(p.id, idx));
    return map;
  }, [products]);

  useEffect(() => {
    if (!addProductId) return;
    if (!productsAll.length) return;

    if (appliedAddRef.current === addProductId) return;
    appliedAddRef.current = addProductId;

    const p = productsAll.find((x) => x.id === addProductId);
    if (!p) return;

    if (!showPromos && !initialCategoryId && p.categoryId) {
      setSelectedCat(String(p.categoryId));
    }

    setQ("");

    if (isOutOfStock(p)) {
      showBanner("Sem estoque", "Esse produto está sem estoque no momento.");
      return;
    }

    const alreadyInCart = (qtyById?.[addProductId] ?? 0) > 0;
    if (!alreadyInCart) {
      cartInc(addProductId, 1);
      showBanner("Adicionado", "Produto adicionado ao carrinho.");
    } else {
      showBanner("Tudo certo", "Esse produto já está no carrinho.");
    }

    setTimeout(() => {
      const idx = indexById.get(addProductId);
      if (idx !== undefined) {
        listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.15 });
        setHighlightId(addProductId);
        setTimeout(() => setHighlightId(null), 1600);
      }
    }, 220);
  }, [addProductId, productsAll, indexById, cartInc, qtyById, showPromos, initialCategoryId]);

  useEffect(() => {
    if (!highlightProductId) return;
    if (!productsAll.length) return;

    if (appliedHighlightRef.current === highlightProductId) return;
    appliedHighlightRef.current = highlightProductId;

    const p = productsAll.find((x) => x.id === highlightProductId);
    if (!p) return;

    if (showPromos) {
      setSelectedCat(PROMOS);
    } else if (initialCategoryId) {
      setSelectedCat(initialCategoryId);
    } else if (p.categoryId) {
      setSelectedCat(String(p.categoryId));
    }

    setQ("");

    const t1 = setTimeout(() => {
      const idx = indexById.get(highlightProductId);
      if (idx !== undefined) {
        try {
          listRef.current?.scrollToIndex({
            index: idx,
            animated: true,
            viewPosition: 0.15,
          });
        } catch {}
        setHighlightId(highlightProductId);
        setTimeout(() => setHighlightId(null), 1800);
      }
    }, 220);

    return () => clearTimeout(t1);
  }, [highlightProductId, productsAll, indexById, showPromos, initialCategoryId]);

  const isLoading = productsQ.isLoading || categoriesQ.isLoading || promosQ.isLoading;
  const isError = productsQ.isError || categoriesQ.isError || promosQ.isError;

  const openDetails = (productId: string) =>
    nav.navigate(OWNER_SCREENS.ProductDetails, { productId });

  const goCart = () => nav.navigate(OWNER_SCREENS.Cart);

  return (
    <Screen style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={BLACK} />

      <View style={styles.body}>
        <View style={styles.header}>
          <Pressable onPress={() => nav.goBack()} hitSlop={12} style={styles.headerLeft}>
            <Text style={styles.chev}>‹</Text>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <View style={{ width: 28 }} />
        </View>

        {banner ? (
          <View style={styles.bannerWrap}>
            <View style={styles.bannerCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>{banner.title}</Text>
                <Text style={styles.bannerMsg}>{banner.message}</Text>
              </View>

              <Pressable
                onPress={() => setBanner(null)}
                hitSlop={10}
                style={({ pressed }) => [styles.bannerBtn, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.bannerBtnText}>OK</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.filtersSection}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Nome do Produto"
            placeholderTextColor="rgba(0,0,0,0.45)"
            style={[styles.search, isTablet && styles.searchTablet]}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.categoriesWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              <FlatChip
                label="🔥 Promoções"
                active={selectedCat === PROMOS}
                onPress={() => {
                  appliedHighlightRef.current = null;
                  appliedAddRef.current = null;
                  setSelectedCat(PROMOS);
                  setSortMode("default");
                }}
              />

              <FlatChip
                label="Todas"
                active={selectedCat === ALL}
                onPress={() => {
                  appliedHighlightRef.current = null;
                  appliedAddRef.current = null;
                  setSelectedCat(ALL);
                }}
              />

              {categories.map((c) => (
                <FlatChip
                  key={c.id}
                  label={c.name}
                  active={selectedCat === c.id}
                  onPress={() => {
                    appliedHighlightRef.current = null;
                    appliedAddRef.current = null;
                    setSelectedCat(c.id);
                  }}
                />
              ))}
            </ScrollView>
          </View>
        </View>

        <View style={styles.productsContainer}>
          {isLoading ? (
            <Loading />
          ) : isError ? (
            <ErrorState
              onRetry={() => {
                categoriesQ.refetch();
                productsQ.refetch();
                promosQ.refetch();
              }}
            />
          ) : (
            <FlatList
              ref={listRef}
              data={products}
              numColumns={1}
              keyExtractor={(i) => i.id}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              onScrollToIndexFailed={(info) => {
                const offset = Math.max(0, info.averageItemLength * info.index);
                listRef.current?.scrollToOffset({ offset, animated: true });
                setTimeout(() => {
                  try {
                    listRef.current?.scrollToIndex({
                      index: info.index,
                      animated: true,
                      viewPosition: 0.15,
                    });
                  } catch {}
                }, 250);
              }}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>Sem produtos nesse filtro.</Text>
                </View>
              }
              refreshing={
                productsQ.isRefetching || categoriesQ.isRefetching || promosQ.isRefetching
              }
              onRefresh={() => {
                categoriesQ.refetch();
                productsQ.refetch();
                promosQ.refetch();
              }}
              renderItem={({ item }) => {
                const inCartQty = qtyById?.[item.id] ?? 0;
                const inCart = inCartQty > 0;

                const out = isOutOfStock(item);
                const isHighlighted = highlightId === item.id;

                const promo = promoByProductId.get(item.id) || null;

                const base = toNumberBR(getEffectivePrice(item));
                const final = promo ? applyPromo(base, promo) : base;

                const hasDiscount = promo ? final < base : false;
                const promoBadge = promo && hasDiscount ? badgeText(promo, base, final) : null;

                const img = getProductImageUrl(item);

                const onPressToggle = (e?: GestureResponderEvent) => {
                  stop(e);

                  if (toggleLocksRef.current[item.id]) return;
                  toggleLocksRef.current[item.id] = true;

                  try {
                    if (inCart) {
                      cartRemove(item.id);
                      showBanner("Removido", "Produto removido do carrinho.");
                      return;
                    }

                    if (out) {
                      showBanner("Sem estoque", "Esse produto está sem estoque no momento.");
                      return;
                    }

                    cartInc(item.id, 1);
                    showBanner("Adicionado", "Produto adicionado ao carrinho.");
                  } finally {
                    setTimeout(() => {
                      toggleLocksRef.current[item.id] = false;
                    }, 250);
                  }
                };

                return (
                  <Pressable onPress={() => openDetails(item.id)} style={styles.rowPress}>
                    <View
                      style={[
                        styles.row,
                        isTablet && styles.rowTablet,
                        out && !inCart ? styles.rowOut : null,
                        isHighlighted && styles.rowHighlight,
                      ]}
                    >
                      <View style={[styles.thumbWrap, isTablet && styles.thumbWrapTablet]}>
                        {img ? (
                          <Image source={{ uri: img }} style={styles.thumbImg} resizeMode="cover" />
                        ) : (
                          <Image
                            source={{
                              uri: "https://dummyimage.com/240x240/ffffff/000000.png&text=NO+IMAGE",
                            }}
                            style={styles.thumbImg}
                            resizeMode="contain"
                          />
                        )}

                        {!!promoBadge && !out ? (
                          <View style={styles.promoBadge}>
                            <Text style={styles.promoBadgeTxt}>{promoBadge}</Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.info}>
                        <Text style={[styles.name, isTablet && styles.nameTablet]} numberOfLines={1}>
                          {item.name}
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
                          {out && !inCart ? <Text style={styles.oosInline}>Sem estoque</Text> : null}
                        </View>
                      </View>

                      <Pressable
                        onPress={(e) => onPressToggle(e)}
                        hitSlop={10}
                        style={({ pressed }) => [
                          styles.buyBtn,
                          isTablet && styles.buyBtnTablet,
                          inCart && styles.buyBtnActive,
                          pressed && styles.pressed,
                          !inCart && out ? { opacity: 0.45 } : null,
                        ]}
                        disabled={!inCart && out}
                      >
                        <Text
                          style={[
                            styles.buyText,
                            isTablet && styles.buyTextTablet,
                            inCart && styles.buyTextActive,
                          ]}
                        >
                          {inCart ? "✓" : "+"}
                        </Text>
                      </Pressable>
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerRule} />
        <Pressable
          onPress={goCart}
          style={({ pressed }) => [styles.checkoutBtn, pressed && styles.pressed]}
          disabled={cartCount <= 0}
        >
          <Text
            style={[
              styles.checkoutText,
              isTablet && styles.checkoutTextTablet,
              cartCount <= 0 && { opacity: 0.5 },
            ]}
          >
            Checkout{cartCount > 0 ? ` (${cartCount})` : ""}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const BLACK = "#000000";
const WHITE = "#FFFFFF";
const FILTER_LINE = "rgba(255,255,255,0.10)";
const CHIP_DARK = "#151515";
const PRODUCTS_LINE = "#ECECEC";
const GOLD_DARK = "#8B6A1E";
const GOLD_DARK_2 = "#6F5418";
const GOLD_SOFT_TEXT = "#FFF4D4";

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BLACK,
  },

  body: {
    flex: 1,
    backgroundColor: BLACK,
  },

  header: {
    height: 56,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: BLACK,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chev: {
    fontSize: 28,
    lineHeight: 28,
    color: WHITE,
    marginTop: Platform.OS === "android" ? -2 : 0,
  },
  backText: {
    fontSize: 16,
    color: WHITE,
    fontWeight: "500",
  },

  filtersSection: {
  backgroundColor: BLACK,
  paddingHorizontal: 12,
  paddingTop: 6,
  paddingBottom: 8,
},

  search: {
    height: 46,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: FILTER_LINE,
    backgroundColor: WHITE,
    color: "#000",
    fontWeight: "600",
  },
  searchTablet: {
    height: 52,
    fontSize: 16,
    paddingHorizontal: 16,
  },

  categoriesWrap: {
    marginTop: 8,
    minHeight: 36,
  },

  chipsRow: {
    gap: 10,
    paddingRight: 12,
  },

  productsContainer: {
    flex: 1,
    minHeight: 0,
    backgroundColor: WHITE,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: "hidden",
  },

  listContent: {
    paddingTop: 6,
    paddingBottom: 140,
    backgroundColor: WHITE,
  },

  separator: {
    height: 1,
    backgroundColor: PRODUCTS_LINE,
    marginLeft: 98,
  },

  rowPress: {
    backgroundColor: WHITE,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 14,
    backgroundColor: WHITE,
  },
  rowTablet: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 18,
  },

  rowOut: {
    opacity: 0.6,
  },

  rowHighlight: {
    backgroundColor: "#FAFAFA",
  },

  thumbWrap: {
    width: 74,
    height: 74,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "#FAFAFA",
    overflow: "hidden",
    position: "relative",
  },
  thumbWrapTablet: {
    width: 92,
    height: 92,
    borderRadius: 14,
  },
  thumbImg: {
    width: "100%",
    height: "100%",
  },

  promoBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.82)",
  },
  promoBadgeTxt: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 11,
  },

  info: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  nameTablet: {
    fontSize: 20,
  },

  priceLine: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    flexWrap: "wrap",
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
    opacity: 0.92,
  },
  priceTablet: {
    fontSize: 18,
  },
  oldPrice: {
    color: "rgba(0,0,0,0.45)",
    fontWeight: "600",
    textDecorationLine: "line-through",
    fontSize: 13,
  },
  oldPriceTablet: {
    fontSize: 14,
  },
  oosInline: {
    color: "rgba(0,0,0,0.72)",
    fontWeight: "700",
    fontSize: 12,
  },

  buyBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BLACK,
    alignItems: "center",
    justifyContent: "center",
  },

  buyBtnTablet: {
    width: 48,
    height: 48,
    borderRadius: 15,
  },
  buyBtnActive: {
    backgroundColor: BLACK,
    borderColor: BLACK,
  },
  buyText: {
    fontSize: 26,
    lineHeight: 26,
    fontWeight: "500",
    color: BLACK,
    marginTop: Platform.OS === "android" ? -1 : -2,
  },
  buyTextTablet: {
    fontSize: 28,
    lineHeight: 28,
  },
  buyTextActive: {
    color: WHITE,
    fontSize: 20,
    lineHeight: 20,
    fontWeight: "800",
    marginTop: 0,
  },

  emptyWrap: {
    paddingTop: 28,
    paddingBottom: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },
  emptyText: {
    color: "rgba(0,0,0,0.72)",
    fontSize: 14,
    fontWeight: "700",
  },

  footer: {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: WHITE,
  paddingHorizontal: 12,
  paddingBottom: 16,
},
footerRule: {
  height: 1,
  backgroundColor: "rgba(0,0,0,0.10)",
  marginBottom: 12,
},
checkoutBtn: {
  borderWidth: 1,
  borderColor: "rgba(0,0,0,0.12)",
  borderRadius: 14,
  paddingVertical: 16,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: BLACK,
},
checkoutText: {
  fontSize: 22,
  fontWeight: "800",
  color: WHITE,
},
checkoutTextTablet: {
  fontSize: 24,
},

  pressed: {
    opacity: 0.65,
  },

  bannerWrap: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 4,
    backgroundColor: BLACK,
  },
  bannerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#111111",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.10)",
  },
  bannerTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  bannerMsg: {
    marginTop: 2,
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  bannerBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.10)",
  },
  bannerBtnText: {
    color: "#111111",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
});

const chipStyles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: CHIP_DARK,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  chipActive: {
    borderColor: GOLD_DARK_2,
    backgroundColor: GOLD_DARK,
  },
  chipText: {
    color: WHITE,
    fontWeight: "700",
    fontSize: 11,
    opacity: 0.92,
  },
  chipTextActive: {
    color: GOLD_SOFT_TEXT,
    opacity: 1,
  },
});