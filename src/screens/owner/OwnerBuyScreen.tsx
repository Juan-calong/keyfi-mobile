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
import Icon from "react-native-vector-icons/Ionicons";

// ajuste o caminho abaixo se o seu ProductFavoriteButton estiver em outra pasta
import { ProductFavoriteButton } from "../../features/components/product-details/ProductFavoriteButton.tsx";

type Product = {
  id: string;
  name: string;
  sku: string;
  price: string;
  customerPrice?: string | null;
  effectivePrice?: string | number;
  isFavorite?: boolean;
  favorited?: boolean;
  productId?: string | null;
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

  averageRating?: number | null;
  ratingAverage?: number | null;
  avgRating?: number | null;
  reviewsCount?: number | null;
  ratingsCount?: number | null;
  commentsCount?: number | null;
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

function getEntityId(item: any) {
  return String(item?.id ?? item?.productId ?? "").trim();
}

function buildFavoriteIds(data: any) {
  const ids = new Set<string>();

  for (const item of asItems<any>(data)) {
    const id = getEntityId(item);
    if (id) ids.add(id);
  }

  return ids;
}

function resolveFavoriteFlag(item: any, favoriteIds: Set<string>) {
  const id = getEntityId(item);

  if (id && favoriteIds.has(id)) return true;
  if (typeof item?.isFavorite === "boolean") return item.isFavorite;
  if (typeof item?.favorited === "boolean") return item.favorited;

  return false;
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

function getProductRating(item: any) {
  const n = Number(
    item?.averageRating ??
      item?.ratingAverage ??
      item?.avgRating ??
      0
  );

  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 5) return 5;
  return n;
}

function getProductReviewsCount(item: any) {
  const n = Number(
    item?.reviewsCount ??
      item?.ratingsCount ??
      item?.commentsCount ??
      0
  );

  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function RatingStars({
  value,
  size = 12,
}: {
  value: number;
  size?: number;
}) {
  return (
    <View style={styles.ratingRow}>
      {Array.from({ length: 5 }).map((_, index) => {
        const filled = index < Math.round(value);

        return (
          <Icon
            key={`star-${index}`}
            name={filled ? "star" : "star-outline"}
            size={size}
            color="#C69214"
          />
        );
      })}
    </View>
  );
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

  const numColumns = 2;
  const horizontalListPadding = 4;
  const gridGap = 4;

  const cardWidth = Math.floor((width - horizontalListPadding * 2 - gridGap) / 2);

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

  const favoritesQ = useQuery({
    queryKey: ["owner-favorites"],
    queryFn: async () =>
      (
        await api.get<ListResp<Product>>(endpoints.products.favorites, {
          params: { take: 500 },
        })
      ).data,
    retry: false,
  });

  const categories = asItems<Category>(categoriesQ.data);
  const productsAll = asItems<Product>(productsQ.data);
  const promoRows = asItems<PromoRow>(promosQ.data);
  const favoriteIds = useMemo(() => buildFavoriteIds(favoritesQ.data), [favoritesQ.data]);

  const promoByProductId = useMemo(() => {
    const map = new Map<string, PromoDTO>();
    for (const row of promoRows) {
      if (row?.product?.id && row?.promo) {
        map.set(row.product.id, row.promo);
      }
    }
    return map;
  }, [promoRows]);

  const promoIds = useMemo(
    () => new Set(Array.from(promoByProductId.keys())),
    [promoByProductId]
  );

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

    let filtered = productsAll
      .filter((p) => {
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
      })
      .map((p) => {
        const favorited = resolveFavoriteFlag(p, favoriteIds);

        return {
          ...p,
          isFavorite: favorited,
          favorited,
        };
      });

    if (sortMode === "newest") {
      filtered = [...filtered].sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      });
    }

    return filtered;
  }, [productsAll, q, selectedCat, promoIds, sortMode, favoriteIds]);

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
    }

    setTimeout(() => {
      const idx = indexById.get(addProductId);
      if (idx !== undefined) {
        listRef.current?.scrollToIndex({
          index: idx,
          animated: true,
          viewPosition: 0.15,
        });
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

  const isLoading =
    productsQ.isLoading ||
    categoriesQ.isLoading ||
    promosQ.isLoading ||
    favoritesQ.isLoading;
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
                favoritesQ.refetch();
              }}
            />
          ) : (
            <FlatList
              ref={listRef}
              data={products}
              key="owner-grid-2"
              numColumns={numColumns}
              keyExtractor={(i) => i.id}
              contentContainerStyle={styles.listContent}
              columnWrapperStyle={styles.columnWrap}
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
                productsQ.isRefetching ||
                categoriesQ.isRefetching ||
                promosQ.isRefetching ||
                favoritesQ.isRefetching
              }
              onRefresh={() => {
                categoriesQ.refetch();
                productsQ.refetch();
                promosQ.refetch();
                favoritesQ.refetch();
              }}
              renderItem={({ item, index }) => {
                const inCartQty = qtyById?.[item.id] ?? 0;
                const inCart = inCartQty > 0;

                const out = isOutOfStock(item);
                const isHighlighted = highlightId === item.id;

                const promo = promoByProductId.get(item.id) || null;

                const base = toNumberBR(getEffectivePrice(item));
                const final = promo ? applyPromo(base, promo) : base;

                const hasDiscount = promo ? final < base : false;
                const promoBadgeRaw = promo && hasDiscount ? badgeText(promo, base, final) : null;

                const promoBadgeLabel =
                  promoBadgeRaw === null
                    ? null
                    : promoBadgeRaw === "PROMO"
                    ? "OFF"
                    : `${promoBadgeRaw.replace("-", "")} OFF`;

                const img = getProductImageUrl(item);
                const isLeft = index % 2 === 0;

                const ratingValue = getProductRating(item);
                const reviewsCount = getProductReviewsCount(item);

                const onPressToggle = (e?: GestureResponderEvent) => {
                  stop(e);

                  if (toggleLocksRef.current[item.id]) return;
                  toggleLocksRef.current[item.id] = true;

                  try {
                    if (inCart) {
                      cartRemove(item.id);
                      return;
                    }

                    if (out) {
                      showBanner("Sem estoque", "Esse produto está sem estoque no momento.");
                      return;
                    }

                    cartInc(item.id, 1);
                  } finally {
                    setTimeout(() => {
                      toggleLocksRef.current[item.id] = false;
                    }, 250);
                  }
                };

                return (
                  <Pressable
                    onPress={() => openDetails(item.id)}
                    style={[
                      styles.cardPress,
                      { width: cardWidth, marginLeft: isLeft ? 0 : gridGap },
                    ]}
                  >
                    <View
                      style={[
                        styles.card,
                        out && !inCart ? styles.cardOut : null,
                        isHighlighted && styles.cardHighlight,
                      ]}
                    >
                      <View style={styles.cardImageWrap}>
                        {img ? (
                          <Image source={{ uri: img }} style={styles.cardImage} resizeMode="cover" />
                        ) : (
                          <Image
                            source={{
                              uri: "https://dummyimage.com/400x400/ffffff/000000.png&text=NO+IMAGE",
                            }}
                            style={styles.cardImage}
                            resizeMode="contain"
                          />
                        )}

                        {!!promoBadgeLabel && !out ? (
                          <View style={styles.cardPromoBadge}>
                            <Text style={styles.cardPromoBadgeTxt}>{promoBadgeLabel}</Text>
                          </View>
                        ) : null}

                        <ProductFavoriteButton
                          productId={item.id}
                          initialFavorited={Boolean(item.isFavorite)}
                          containerStyle={styles.favoriteBtn}
                          size={18}
                          activeColor="#E11D48"
                          inactiveColor="#2E2A29"
                        />

                        <Pressable
                          onPress={(e) => onPressToggle(e)}
                          hitSlop={10}
                          style={({ pressed }) => [
                            styles.addBtnFloating,
                            inCart && styles.addBtnFloatingActive,
                            pressed && styles.pressed,
                            !inCart && out ? { opacity: 0.45 } : null,
                          ]}
                          disabled={!inCart && out}
                        >
                          <Icon
                            name={inCart ? "bag" : "bag-outline"}
                            size={18}
                            color={inCart ? WHITE : BLACK}
                          />
                        </Pressable>
                      </View>

                      <View style={styles.cardBody}>
                        <Text style={styles.cardName} numberOfLines={2}>
                          {item.name}
                        </Text>

                        <View style={styles.cardRatingWrap}>
                          <RatingStars value={ratingValue} size={12} />
                          <Text style={styles.cardRatingText}>
                            {ratingValue > 0 ? ratingValue.toFixed(1) : "0.0"}
                          </Text>
                          <Text style={styles.cardRatingCount}>({reviewsCount})</Text>
                        </View>

                        <View style={styles.cardPriceWrap}>
                          <Text style={styles.cardPrice}>
                            {formatBRL(hasDiscount ? final : base)}
                          </Text>

                          {hasDiscount ? (
                            <Text style={styles.cardOldPrice}>
                              {formatBRL(base)}
                            </Text>
                          ) : null}
                        </View>

                        {out && !inCart ? (
                          <Text style={styles.cardOutText}>Sem estoque</Text>
                        ) : null}
                      </View>
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
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: "hidden",
  },

  listContent: {
    paddingTop: 6,
    paddingLeft: 4,
    paddingRight: 4,
    paddingBottom: 140,
    backgroundColor: WHITE,
  },

  columnWrap: {
    marginBottom: 4,
  },

  cardPress: {
    backgroundColor: WHITE,
  },

  card: {
    backgroundColor: WHITE,
    overflow: "hidden",
  },

  cardOut: {
    opacity: 0.6,
  },

  cardHighlight: {
    backgroundColor: "#FAFAFA",
  },

  cardImageWrap: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#F7F4F3",
    overflow: "hidden",
    position: "relative",
  },

  cardImage: {
    width: "100%",
    height: "100%",
  },

  cardPromoBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#5D5351",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },

  cardPromoBadgeTxt: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  favoriteBtn: {
    position: "absolute",
    top: 8,
    right: 8,
  },

  addBtnFloating: {
    position: "absolute",
    right: 8,
    bottom: 8,
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
  },

  addBtnFloatingActive: {
    backgroundColor: BLACK,
    borderColor: BLACK,
  },

  cardBody: {
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 10,
    minHeight: 90,
  },

  cardName: {
    fontSize: 13,
    lineHeight: 17,
    color: "#1F1A19",
    fontWeight: "600",
    minHeight: 34,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },

  cardRatingWrap: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },

  cardRatingText: {
    fontSize: 11,
    color: "#1F1A19",
    fontWeight: "700",
  },

  cardRatingCount: {
    fontSize: 10,
    color: "rgba(0,0,0,0.45)",
    fontWeight: "600",
  },

  cardPriceWrap: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },

  cardPrice: {
    fontSize: 14,
    color: "#1F1A19",
    fontWeight: "800",
  },

  cardOldPrice: {
    fontSize: 11,
    color: "rgba(0,0,0,0.42)",
    textDecorationLine: "line-through",
    fontWeight: "600",
  },

  cardOutText: {
    marginTop: 4,
    fontSize: 11,
    color: "#7B6F6C",
    fontWeight: "700",
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