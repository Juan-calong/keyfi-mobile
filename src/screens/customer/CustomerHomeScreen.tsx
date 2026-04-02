import React, { useCallback, useMemo } from "react";
import {
  FlatList,
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Linking,
  useWindowDimensions,
} from "react-native";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import { useQueries, useQuery } from "@tanstack/react-query";
import LinearGradient from "react-native-linear-gradient";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import Icon from "react-native-vector-icons/Ionicons";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { HeaderBar } from "../../ui/components/HeaderBar";
import { HomeHeroCarousel } from "../../ui/components/HomeHeroCarousel";
import { Loading, ErrorState } from "../../ui/components/State";

import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";
import { t } from "../../ui/tokens";

import { CUSTOMER_SCREENS } from "../../navigation/customer.routes";
import { useCartStore } from "../../stores/cart.store";
import { ProductFavoriteButton } from "../../features/components/product-details/ProductFavoriteButton";

type TargetType =
  | "NONE"
  | "PROMOTIONS"
  | "NEWS"
  | "SHOP"
  | "PRODUCT"
  | "CATEGORY"
  | "URL";

type HomeBannerDTO = {
  id: string;
  title: string | null;
  subtitle: string | null;
  buttonLabel: string | null;
  imageUrl: string;
  active: boolean;
  sortOrder: number;
  targetType: TargetType;
  targetId: string | null;
  targetUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
};

type ProductDTO = {
  id: string;
  sku?: string;
  name: string;
  price: string;
  customerPrice?: string | null;
  effectivePrice?: string | number;

  promoType?: string | null;
  promoValue?: string | number | null;
  promoPrice?: string | number | null;
  salePrice?: string | number | null;
  pricePromo?: string | number | null;
  promotionalPrice?: string | number | null;
  discountedPrice?: string | number | null;
  finalPrice?: string | number | null;
  discountPct?: string | number | null;
  discountPercent?: string | number | null;
  discountValue?: string | number | null;
  discountAmount?: string | number | null;

  averageRating?: string | number | null;
  avgRating?: string | number | null;
  ratingAverage?: string | number | null;
  rating?: string | number | null;
  reviewCount?: number | null;
  reviewsCount?: number | null;
  ratingCount?: number | null;
  ratingsCount?: number | null;
  commentsCount?: number | null;
  stats?: {
    averageRating?: string | number | null;
    reviewCount?: number | null;
  } | null;

  active?: boolean;
  stock?: number | null;
  primaryImageUrl?: string | null;
  images?: { url: string; isPrimary?: boolean; sort?: number }[];
  imageUrl?: string | null;
  createdAt?: string | null;
};

type PreviewItem = {
  id: string;
  name: string;
  imageUri?: string;
  price?: string | number | null;
  originalPrice?: string | number | null;
  hasDiscount?: boolean;
  ratingValue?: number | null;
  ratingCount?: number | null;
  isFavorite?: boolean;
};

type ReviewItem = {
  id?: string;
  rating?: number | null;
  stars?: number | null;
  score?: number | null;
};

function getProductFavorited(p: any) {
  return Boolean(p?.isFavorite ?? p?.favorited ?? false);
}

function toNumberBR(v: string | number | null | undefined) {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function formatBRL(value: string | number | null | undefined) {
  const n = toNumberBR(value);
  if (!Number.isFinite(n)) return "R$ —";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function clampMin(n: number, min = 0) {
  return n < min ? min : n;
}

function applyPromo(basePrice: number, promo: { type: string; value: string | number }) {
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

function asProducts(data: any): ProductDTO[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  return [];
}

function asHomeBanners(data: any): HomeBannerDTO[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  return [];
}

function getEffectivePrice(p: any) {
  return p?.effectivePrice ?? p?.customerPrice ?? p?.price;
}

function getBasePrice(p: any) {
  const base = toNumberBR(getEffectivePrice(p));
  return Number.isFinite(base) ? base : 0;
}

function getCardPriceData(p: any) {
  const base = getBasePrice(p);

  const promoType = p?.promoType ?? p?.promo?.type ?? null;
  const promoValue = p?.promoValue ?? p?.promo?.value ?? null;

  if (promoType != null && promoValue != null) {
    const final = applyPromo(base, {
      type: String(promoType),
      value: promoValue,
    });

    if (final < base) {
      return {
        price: final,
        originalPrice: base,
        hasDiscount: true,
      };
    }
  }

  const directPromoCandidates = [
    p?.promoPrice,
    p?.salePrice,
    p?.pricePromo,
    p?.promotionalPrice,
    p?.discountedPrice,
    p?.finalPrice,
  ];

  for (const candidate of directPromoCandidates) {
    const promoPrice = toNumberBR(candidate);
    if (promoPrice > 0 && promoPrice < base) {
      return {
        price: promoPrice,
        originalPrice: base,
        hasDiscount: true,
      };
    }
  }

  const pct = toNumberBR(p?.discountPct ?? p?.discountPercent);
  if (pct > 0) {
    const final = clampMin(base * (1 - pct / 100), 0);
    if (final < base) {
      return {
        price: final,
        originalPrice: base,
        hasDiscount: true,
      };
    }
  }

  const val = toNumberBR(p?.discountValue ?? p?.discountAmount);
  if (val > 0) {
    const final = clampMin(base - val, 0);
    if (final < base) {
      return {
        price: final,
        originalPrice: base,
        hasDiscount: true,
      };
    }
  }

  return {
    price: base,
    originalPrice: null,
    hasDiscount: false,
  };
}

function getProductImageUri(p: ProductDTO) {
  return p.primaryImageUrl || p.images?.[0]?.url || p.imageUrl || undefined;
}

function getProductRatingValue(p: any) {
  const candidates = [
    p?.averageRating,
    p?.avgRating,
    p?.ratingAverage,
    p?.rating,
    p?.stats?.averageRating,
  ];

  for (const candidate of candidates) {
    const n = Number(candidate);
    if (Number.isFinite(n) && n > 0) {
      return Math.max(0, Math.min(5, n));
    }
  }

  return 0;
}

function getProductRatingCount(p: any) {
  const candidates = [
    p?.reviewCount,
    p?.reviewsCount,
    p?.ratingCount,
    p?.ratingsCount,
    p?.commentsCount,
    p?.stats?.reviewCount,
  ];

  for (const candidate of candidates) {
    const n = Number(candidate);
    if (Number.isFinite(n) && n > 0) {
      return n;
    }
  }

  return 0;
}

function asPromoProducts(data: any): ProductDTO[] {
  const arr = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];

  const mapped: any[] = arr.map((x: any) => {
    const promoMeta = {
      promoType: x?.promo?.type ?? x?.type ?? null,
      promoValue: x?.promo?.value ?? x?.value ?? null,
      promoPrice:
        x?.promoPrice ?? x?.salePrice ?? x?.pricePromo ?? x?.promotionalPrice ?? null,
      salePrice: x?.salePrice ?? null,
      pricePromo: x?.pricePromo ?? null,
      promotionalPrice: x?.promotionalPrice ?? null,
      discountedPrice: x?.discountedPrice ?? null,
      finalPrice: x?.finalPrice ?? null,
      discountPct: x?.discountPct ?? x?.discountPercent ?? null,
      discountPercent: x?.discountPercent ?? null,
      discountValue: x?.discountValue ?? x?.discountAmount ?? null,
      discountAmount: x?.discountAmount ?? null,
    };

    if (x?.product && (x.product.id || x.product.productId)) {
      return {
        ...x.product,
        ...promoMeta,
        id: x.product.id ?? x.product.productId,
      };
    }

    if (x?.productRef && (x.productRef.id || x.productRef.productId)) {
      return {
        ...x.productRef,
        ...promoMeta,
        id: x.productRef.id ?? x.productRef.productId,
      };
    }

    if (x?.productItem && (x.productItem.id || x.productItem.productId)) {
      return {
        ...x.productItem,
        ...promoMeta,
        id: x.productItem.id ?? x.productItem.productId,
      };
    }

    if (x?.productId && x?.name) {
      return {
        id: x.productId,
        name: x.name,
        price: String(x.price ?? "0"),
        customerPrice: x.customerPrice ?? null,
        effectivePrice: x.effectivePrice ?? x.customerPrice ?? x.price ?? "0",
        imageUrl: x.imageUri ?? x.imageUrl ?? x.primaryImageUrl ?? null,
        averageRating:
          x?.averageRating ?? x?.avgRating ?? x?.ratingAverage ?? x?.rating ?? null,
        reviewCount:
          x?.reviewCount ??
          x?.reviewsCount ??
          x?.ratingCount ??
          x?.ratingsCount ??
          x?.commentsCount ??
          null,
        stats: x?.stats ?? null,
        active: true,
        ...promoMeta,
      } as ProductDTO;
    }

    return {
      ...x,
      ...promoMeta,
    };
  });

  return mapped
    .map((p: any) => ({ ...p, id: p?.id ?? p?.productId }))
    .filter((p: any) => !!p?.id && !!p?.name);
}

function getReviewRating(item: any) {
  const n = Number(item?.rating ?? item?.stars ?? item?.score ?? 0);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 5) return 5;
  return n;
}

function extractCommentsItems(data: any): ReviewItem[] {
  if (Array.isArray(data)) return data as ReviewItem[];
  if (Array.isArray(data?.items)) return data.items as ReviewItem[];
  if (Array.isArray(data?.data?.items)) return data.data.items as ReviewItem[];
  return [];
}

function getCommentsAverageRating(data: any) {
  const direct = Number(
    data?.averageRating ??
      data?.avgRating ??
      data?.ratingAverage ??
      data?.stats?.averageRating
  );

  if (Number.isFinite(direct) && direct >= 0) {
    return Math.max(0, Math.min(5, direct));
  }

  const items = extractCommentsItems(data);
  const rated = items.map((item) => getReviewRating(item)).filter((n) => n > 0);

  if (!rated.length) return 0;

  const sum = rated.reduce((acc, n) => acc + n, 0);
  return Math.max(0, Math.min(5, sum / rated.length));
}

function getCommentsTotal(data: any) {
  const direct = Number(
    data?.total ??
      data?.ratingsCount ??
      data?.reviewsCount ??
      data?.commentsCount ??
      data?.stats?.reviewCount
  );

  if (Number.isFinite(direct) && direct > 0) return direct;

  return extractCommentsItems(data).length;
}

function Hairline() {
  return <View style={styles.hairline} />;
}

function HomeSectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function BackgroundTexture() {
  return (
    <View pointerEvents="none" style={styles.bgLayer}>
      <LinearGradient
        colors={[
          "rgba(184,148,60,0.08)",
          "rgba(184,148,60,0.05)",
          "rgba(184,148,60,0.025)",
          "rgba(184,148,60,0.01)",
          "rgba(184,148,60,0)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bgBase}
      />

      <LinearGradient
        colors={[
          "rgba(184,148,60,0.08)",
          "rgba(184,148,60,0.05)",
          "rgba(184,148,60,0.025)",
          "rgba(184,148,60,0.01)",
          "rgba(184,148,60,0)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.blobTopLeft}
      />

      <LinearGradient
        colors={[
          "rgba(184,148,60,0.08)",
          "rgba(184,148,60,0.05)",
          "rgba(184,148,60,0.025)",
          "rgba(184,148,60,0.01)",
          "rgba(184,148,60,0)",
        ]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.blobTopRight}
      />

      <LinearGradient
        colors={[
          "rgba(184,148,60,0.08)",
          "rgba(184,148,60,0.05)",
          "rgba(184,148,60,0.025)",
          "rgba(184,148,60,0.01)",
          "rgba(184,148,60,0)",
        ]}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={styles.blobMidLeft}
      />

      <LinearGradient
        colors={[
          "rgba(184,148,60,0.08)",
          "rgba(184,148,60,0.05)",
          "rgba(184,148,60,0.025)",
          "rgba(184,148,60,0.01)",
          "rgba(184,148,60,0)",
        ]}
        start={{ x: 1, y: 0.2 }}
        end={{ x: 0, y: 1 }}
        style={styles.blobMidRight}
      />

      <LinearGradient
        colors={[
          "rgba(184,148,60,0.08)",
          "rgba(184,148,60,0.05)",
          "rgba(184,148,60,0.025)",
          "rgba(184,148,60,0.01)",
          "rgba(184,148,60,0)",
        ]}
        start={{ x: 0.2, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={styles.blobBottomLeft}
      />

      <LinearGradient
        colors={[
          "rgba(184,148,60,0.08)",
          "rgba(184,148,60,0.05)",
          "rgba(184,148,60,0.025)",
          "rgba(184,148,60,0.01)",
          "rgba(184,148,60,0)",
        ]}
        start={{ x: 1, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={styles.blobBottomRight}
      />

      <LinearGradient
        colors={[
          "rgba(184,148,60,0.08)",
          "rgba(184,148,60,0.05)",
          "rgba(184,148,60,0.025)",
          "rgba(184,148,60,0.01)",
          "rgba(184,148,60,0)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.softVeil}
      />
    </View>
  );
}

function AddToCartButton({
  inCart,
  onPress,
}: {
  inCart: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={(e) => {
        e.stopPropagation?.();
        onPress();
      }}
      hitSlop={10}
      style={({ pressed }) => [
        styles.cardCartButton,
        inCart && styles.cardCartButtonSelected,
        pressed && styles.cardActionButtonPressed,
      ]}
    >
      <Icon
        name={inCart ? "bag" : "bag-outline"}
        size={18}
        color={inCart ? "#FFF" : "#000"}
      />
    </Pressable>
  );
}

function PreviewGrid({
  data,
  onPressItem,
  onAddToCart,
}: {
  data: PreviewItem[];
  onPressItem: (id: string) => void;
  onAddToCart: (id: string) => void;
}) {
  const { width } = useWindowDimensions();

  const gap = 12;
  const horizontalPadding = 4;
  const containerHorizontalInset = 32;
  const cardWidth = (width - containerHorizontalInset - horizontalPadding - gap) / 2;
  const qtyById = useCartStore((s) => s.qtyById);

  return (
    <FlatList
      data={data}
      extraData={qtyById}
      keyExtractor={(i) => String(i.id)}
      numColumns={2}
      scrollEnabled={false}
      columnWrapperStyle={styles.gridRow}
      contentContainerStyle={styles.gridContent}
      ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
      renderItem={({ item }) => {
        const productId = String(item.id);
        const inCart = Number(qtyById?.[productId] ?? 0) > 0;

        return (
          <Pressable
            onPress={() => onPressItem(productId)}
            style={[styles.cardWrap, { width: cardWidth }]}
          >
            <View style={styles.card}>
              <View style={styles.cardImageWrap}>
                {item.imageUri ? (
                  <Image
                    source={{ uri: item.imageUri }}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.cardImageFallback} />
                )}

                <View style={styles.cardTopRightAction}>
                  <ProductFavoriteButton
                    productId={productId}
                    initialFavorited={item.isFavorite}
                  />
                </View>

                <View style={styles.cardBottomRightAction}>
                  <AddToCartButton
                    inCart={inCart}
                    onPress={() => onAddToCart(productId)}
                  />
                </View>
              </View>

              <View style={styles.cardInnerDivider} />

              <View style={styles.cardMeta}>
                <Text numberOfLines={2} ellipsizeMode="tail" style={styles.cardName}>
                  {item.name}
                </Text>

                {Number(item.ratingValue ?? 0) > 0 ? (
                  <View style={styles.cardRatingRow}>
                    <View style={styles.cardStarsRow}>
                      {[1, 2, 3, 4, 5].map((star) => {
                        const rating = Number(item.ratingValue ?? 0);

                        const iconName =
                          rating >= star
                            ? "star"
                            : rating >= star - 0.5
                            ? "star-half"
                            : "star-outline";

                        return (
                          <Icon
                            key={star}
                            name={iconName}
                            size={11}
                            color="#B8943C"
                            style={styles.cardRatingStar}
                          />
                        );
                      })}
                    </View>

                    <Text numberOfLines={1} style={styles.cardRatingText}>
                      {Number(item.ratingValue).toFixed(1)}
                      {Number(item.ratingCount ?? 0) > 0 ? ` (${item.ratingCount})` : ""}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.cardRatingSpacer} />
                )}

                <View style={styles.cardPriceBlock}>
                  <Text numberOfLines={1} style={styles.cardPrice}>
                    {formatBRL(item.price)}
                  </Text>

                  {item.hasDiscount && item.originalPrice ? (
                    <Text numberOfLines={1} style={styles.cardOldPrice}>
                      {formatBRL(item.originalPrice)}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

export function CustomerHomeScreen() {
  const nav = useNavigation<any>();
  const tabBarHeight = useBottomTabBarHeight();

  const qtyById = useCartStore((s) => s.qtyById);
  const addToCart = useCartStore((s) => s.inc);
  const removeFromCart = useCartStore((s) => s.remove);

  const meQ = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get(endpoints.profiles.me)).data,
    retry: false,
    staleTime: 0,
    gcTime: 1000 * 60 * 5,
  });

  const bannersQ = useQuery({
    queryKey: ["customer-home-banners"],
    queryFn: async () => {
      const res = await api.get(endpoints.home.meBanners);
      return asHomeBanners(res.data);
    },
    retry: false,
  });

  const productsQ = useQuery({
    queryKey: ["customer-home-products"],
    queryFn: async () => {
      const res = await api.get(endpoints.products.list, {
        params: { take: 80, active: "true" },
      });
      return asProducts(res.data);
    },
    retry: false,
  });

  const promosQ = useQuery({
    queryKey: ["customer-home-promos-preview", { appliesTo: "CUSTOMER" }],
    queryFn: async () => {
      const res = await api.get(endpoints.products.promosActive, {
        params: { take: 200, appliesTo: "CUSTOMER" },
      });

      const items = asPromoProducts(res.data);
      const discounted = items.filter((p: any) => getCardPriceData(p).hasDiscount);

      return discounted.length ? discounted : items;
    },
    retry: false,
  });

  const banners = useMemo(() => {
    return (bannersQ.data ?? [])
      .filter((b) => b?.active !== false && !!b?.imageUrl)
      .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
  }, [bannersQ.data]);

  const products = useMemo(() => {
    return (productsQ.data ?? []).filter((p) => p?.active !== false);
  }, [productsQ.data]);

  const promoProducts = useMemo(() => {
    return (promosQ.data ?? []).filter((p) => p?.active !== false);
  }, [promosQ.data]);

  const promoProductById = useMemo(() => {
    const map = new Map<string, ProductDTO>();
    for (const item of promoProducts) {
      map.set(item.id, item);
    }
    return map;
  }, [promoProducts]);

  const promoBasePreview = useMemo<PreviewItem[]>(
    () =>
      promoProducts.slice(0, 10).map((p) => {
        const priceData = getCardPriceData(p);

        return {
          id: p.id,
          name: p.name,
          imageUri: getProductImageUri(p),
          price: priceData.price,
          originalPrice: priceData.originalPrice,
          hasDiscount: priceData.hasDiscount,
          ratingValue: getProductRatingValue(p),
          ratingCount: getProductRatingCount(p),
          isFavorite: getProductFavorited(p),
        };
      }),
    [promoProducts]
  );

  const handleAddToCart = useCallback(
    (productId: string) => {
      if (!productId) return;

      const currentQty = Number(qtyById?.[productId] ?? 0);

      if (currentQty > 0) {
        removeFromCart(productId);
        return;
      }

      addToCart(productId, 1);
    },
    [addToCart, removeFromCart, qtyById]
  );

  const newestBasePreview = useMemo<PreviewItem[]>(() => {
    const copy = [...products];

    copy.sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });

    return copy.slice(0, 10).map((p) => {
      const merged = promoProductById.get(p.id)
        ? { ...p, ...promoProductById.get(p.id) }
        : p;

      const priceData = getCardPriceData(merged);

      return {
        id: p.id,
        name: p.name,
        imageUri: getProductImageUri(merged),
        price: priceData.price,
        originalPrice: priceData.originalPrice,
        hasDiscount: priceData.hasDiscount,
        ratingValue: getProductRatingValue(merged),
        ratingCount: getProductRatingCount(merged),
        isFavorite: getProductFavorited(merged),
      };
    });
  }, [products, promoProductById]);

  const previewProductIds = useMemo(
    () =>
      Array.from(
        new Set([
          ...promoBasePreview.map((item) => item.id),
          ...newestBasePreview.map((item) => item.id),
        ])
      ),
    [promoBasePreview, newestBasePreview]
  );

  const ratingQueries = useQueries({
    queries: previewProductIds.map((productId) => ({
      queryKey: ["product-comments-summary-home", productId],
      queryFn: async () => {
        const res = await api.get<any>(endpoints.products.comments(productId), {
          params: { page: 1, limit: 20 },
        });

        return {
          productId,
          averageRating: getCommentsAverageRating(res.data),
          reviewsCount: getCommentsTotal(res.data),
        };
      },
      enabled: !!productId,
      retry: false,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
    })),
  });

  const ratingByProductId = useMemo(() => {
    const map = new Map<string, { value: number; count: number }>();

    for (const query of ratingQueries) {
      if (query.data?.productId) {
        map.set(query.data.productId, {
          value: Number(query.data.averageRating ?? 0),
          count: Number(query.data.reviewsCount ?? 0),
        });
      }
    }

    return map;
  }, [ratingQueries]);

  const promoPreview = useMemo<PreviewItem[]>(
    () =>
      promoBasePreview.map((item) => {
        const summary = ratingByProductId.get(item.id);

        return {
          ...item,
          ratingValue: summary?.value ?? item.ratingValue ?? 0,
          ratingCount: summary?.count ?? item.ratingCount ?? 0,
        };
      }),
    [promoBasePreview, ratingByProductId]
  );

  const newestPreview = useMemo<PreviewItem[]>(
    () =>
      newestBasePreview.map((item) => {
        const summary = ratingByProductId.get(item.id);

        return {
          ...item,
          ratingValue: summary?.value ?? item.ratingValue ?? 0,
          ratingCount: summary?.count ?? item.ratingCount ?? 0,
        };
      }),
    [newestBasePreview, ratingByProductId]
  );

  const goToBuy = useCallback(
    (params?: Record<string, any>) => {
      nav.navigate(CUSTOMER_SCREENS.Buy, params);
    },
    [nav]
  );

  const goToProductDetails = useCallback(
    (productId: string) => {
      if (!productId) return;
      nav.navigate(CUSTOMER_SCREENS.ProductDetails, { productId });
    },
    [nav]
  );

  const handleBannerPress = useCallback(
    async (item: HomeBannerDTO) => {
      const targetType = String(item?.targetType || "NONE").toUpperCase() as TargetType;

      switch (targetType) {
        case "PROMOTIONS":
          goToBuy({ showPromos: true });
          return;

        case "NEWS":
          goToBuy();
          return;

        case "SHOP":
          goToBuy();
          return;

        case "PRODUCT":
          if (!item.targetId) return;
          goToProductDetails(item.targetId);
          return;

        case "CATEGORY":
          if (!item.targetId) return;
          goToBuy({ categoryId: item.targetId });
          return;

        case "URL":
          if (!item.targetUrl) return;
          try {
            const supported = await Linking.canOpenURL(item.targetUrl);
            if (supported) {
              await Linking.openURL(item.targetUrl);
            }
          } catch {}
          return;

        case "NONE":
        default:
          return;
      }
    },
    [goToBuy, goToProductDetails]
  );

  const isLoading =
    meQ.isLoading || bannersQ.isLoading || productsQ.isLoading || promosQ.isLoading;

  const isError =
    meQ.isError || bannersQ.isError || productsQ.isError || promosQ.isError;

  return (
    <Screen>
      <BackgroundTexture />

      <HeaderBar
        title="KEYFI"
        onMenu={() => nav.dispatch(DrawerActions.openDrawer())}
        titleStyle={{ fontSize: 20, fontWeight: "900", letterSpacing: 0.6 }}
        menuVariant="bare"
        menuIconSize={22}
      />

      <Container style={styles.container}>
        {isLoading ? (
          <Loading />
        ) : isError ? (
          <ErrorState
            onRetry={() => {
              meQ.refetch();
              bannersQ.refetch();
              productsQ.refetch();
              promosQ.refetch();
            }}
          />
        ) : (
          <FlatList
            data={[]}
            keyExtractor={(_, idx) => String(idx)}
            renderItem={() => null}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: tabBarHeight + 14 },
            ]}
            ListHeaderComponent={
              <View style={styles.stack}>
                {banners.length > 0 ? (
                  <View>
                    <HomeHeroCarousel
                      items={banners.map((b) => ({
                        id: b.id,
                        imageUrl: b.imageUrl,
                      }))}
                      onPressItem={(heroItem) => {
                        const fullBanner = banners.find((b) => b.id === heroItem.id);
                        if (fullBanner) {
                          handleBannerPress(fullBanner);
                        }
                      }}
                    />
                  </View>
                ) : null}

                {promoPreview.length > 0 ? (
                  <>
                    <Hairline />
                    <HomeSectionHeader title="Promoções" />
                    <Hairline />

                    <PreviewGrid
                      data={promoPreview}
                      onPressItem={(id) => goToProductDetails(id)}
                      onAddToCart={handleAddToCart}
                    />

                    <View style={{ height: 6 }} />
                    <Hairline />
                  </>
                ) : (
                  <Hairline />
                )}

                <HomeSectionHeader title="Novidades" />
                <Hairline />

                {newestPreview.length === 0 ? (
                  <Text style={styles.emptyText}>Nenhum produto encontrado</Text>
                ) : (
                  <PreviewGrid
                    data={newestPreview}
                    onPressItem={(id) => goToProductDetails(id)}
                    onAddToCart={handleAddToCart}
                  />
                )}
              </View>
            }
          />
        )}
      </Container>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
    backgroundColor: "transparent",
    position: "relative",
  },

  cardTopRightAction: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 3,
  },

  cardBottomRightAction: {
    position: "absolute",
    right: 10,
    bottom: 10,
    zIndex: 3,
  },

  cardCartButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  cardCartButtonSelected: {
    backgroundColor: "#000",
    borderColor: "#000",
  },

  cardActionButtonPressed: {
    opacity: 0.7,
  },

  gridContent: {
    paddingTop: 6,
    paddingHorizontal: 2,
  },

  gridRow: {
    justifyContent: "space-between",
  },

  cardWrap: {},

  bgLayer: {
    ...StyleSheet.absoluteFillObject,
  },

  bgBase: {
    ...StyleSheet.absoluteFillObject,
  },

  cardRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    minHeight: 16,
  },

  cardStarsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
  },

  cardRatingSpacer: {
    height: 16,
    marginTop: 4,
  },

  cardPriceBlock: {
    marginTop: 6,
    alignItems: "flex-start",
  },

  cardPrice: {
    color: "rgba(0,0,0,0.78)",
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 17,
  },

  cardOldPrice: {
    marginTop: 2,
    color: "rgba(0,0,0,0.42)",
    fontSize: 10,
    fontWeight: "700",
    textDecorationLine: "line-through",
  },

  cardRatingStar: {
    marginRight: 1,
  },

  cardRatingText: {
    marginLeft: 6,
    color: "rgba(0,0,0,0.55)",
    fontSize: 10.5,
    fontWeight: "700",
  },

  blobTopLeft: {
    position: "absolute",
    top: -20,
    left: -70,
    width: 260,
    height: 200,
    borderRadius: 999,
    transform: [{ rotate: "-10deg" }],
  },

  blobTopRight: {
    position: "absolute",
    top: 70,
    right: -90,
    width: 250,
    height: 210,
    borderRadius: 999,
    transform: [{ rotate: "12deg" }],
  },

  blobMidLeft: {
    position: "absolute",
    top: 270,
    left: -80,
    width: 280,
    height: 240,
    borderRadius: 999,
    transform: [{ rotate: "18deg" }],
  },

  blobMidRight: {
    position: "absolute",
    top: 350,
    right: -95,
    width: 290,
    height: 260,
    borderRadius: 999,
    transform: [{ rotate: "-14deg" }],
  },

  blobBottomLeft: {
    position: "absolute",
    bottom: 120,
    left: -40,
    width: 300,
    height: 220,
    borderRadius: 999,
    transform: [{ rotate: "10deg" }],
  },

  blobBottomRight: {
    position: "absolute",
    bottom: 10,
    right: -85,
    width: 270,
    height: 210,
    borderRadius: 999,
    transform: [{ rotate: "-8deg" }],
  },

  softVeil: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.65,
  },

  content: {
    paddingBottom: 20,
  },

  stack: {
    gap: 10,
  },

  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0,0,0,0.18)",
  },

  sectionHeader: {
    paddingHorizontal: 2,
    paddingTop: 2,
    paddingBottom: 6,
  },

  sectionTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#000",
    letterSpacing: 0.2,
  },

  emptyText: {
    color: t.colors.muted,
    fontWeight: "800",
    paddingHorizontal: 2,
  },

  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(92, 89, 81, 0.35)",
    backgroundColor: "transparent",
    overflow: "hidden",
    minHeight: 270,
  },

  cardImageWrap: {
    height: 155,
    paddingTop: 1,
    paddingHorizontal: 1,
    justifyContent: "center",
    backgroundColor: "transparent",
  },

  cardImage: {
    width: "100%",
    height: "100%",
  },

  cardImageFallback: {
    flex: 1,
    backgroundColor: "transparent",
  },

  cardInnerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0,0,0,0.18)",
  },

  cardMeta: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    minHeight: 92,
    justifyContent: "space-between",
  },

  cardName: {
    color: "#000",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
    minHeight: 30,
  },
});