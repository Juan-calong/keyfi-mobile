import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  Linking,
} from "react-native";
import { useNavigation, DrawerActions, useFocusEffect } from "@react-navigation/native";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Screen } from "../../ui/components/Screen";
import { HeaderBar } from "../../ui/components/HeaderBar";
import { HomeHeroCarousel } from "../../ui/components/HomeHeroCarousel";
import { Loading, ErrorState } from "../../ui/components/State";

import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";
import { resolvePromoBadgeLabel } from "../../core/utils/promoBadge";
import { resolvePromoPriceData } from "../../core/utils/promoPricing";
import { t } from "../../ui/tokens";

import { OWNER_SCREENS } from "../../navigation/owner.routes";
import { useCartStore } from "../../stores/cart.store";
 import { OwnerProductGridCard } from "./components/OwnerProductGridCard";

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
  effectivePrice?: string | number;
  isFavorite?: boolean;
  favorited?: boolean;

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
  promoBadgeLabel?: string | null;
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

const AUTO_REFRESH_MS = 60 * 1000;

function getProductFavorited(p: any) {
  return Boolean(p?.isFavorite ?? p?.favorited ?? false);
}

function normalizeId(value: unknown) {
  return String(value ?? "").trim();
}

function getEntityIds(item: any) {
  const ids = [
    item?.id,
    item?.productId,
    item?.product?.id,
    item?.product?.productId,
    item?.productRef?.id,
    item?.productRef?.productId,
    item?.productItem?.id,
    item?.productItem?.productId,
    item?.data?.id,
    item?.data?.productId,
    item?.data?.product?.id,
    item?.data?.product?.productId,
  ]
    .map((value) => normalizeId(value))
    .filter(Boolean);

  return Array.from(new Set(ids));
}

function asItems<T>(v: any): T[] {
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.items)) return v.items;
  if (Array.isArray(v?.data?.items)) return v.data.items;
  if (Array.isArray(v?.data)) return v.data;
  return [];
}

function buildFavoriteIds(data: any) {
  const ids = new Set<string>();

  for (const item of asItems<any>(data)) {
    for (const id of getEntityIds(item)) {
      if (id) ids.add(id);
    }
  }

  return ids;
}

function resolveFavoriteFlag(item: any, favoriteIds: Set<string>) {
  const itemIds = getEntityIds(item);

  if (itemIds.some((id) => favoriteIds.has(id))) return true;
  return getProductFavorited(item);
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
  return p?.effectivePrice ?? p?.price;
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


function mergeWithPromoPricing(baseProduct: ProductDTO, promoProduct?: ProductDTO) {
  if (!promoProduct) return baseProduct;

  return {
    ...baseProduct,
    promoType: promoProduct.promoType ?? null,
    promoValue: promoProduct.promoValue ?? null,
    promoPrice: promoProduct.promoPrice ?? null,
    salePrice: promoProduct.salePrice ?? null,
    pricePromo: promoProduct.pricePromo ?? null,
    promotionalPrice: promoProduct.promotionalPrice ?? null,
    discountedPrice: promoProduct.discountedPrice ?? null,
    finalPrice: promoProduct.finalPrice ?? null,
    discountPct: promoProduct.discountPct ?? promoProduct.discountPercent ?? null,
    discountPercent: promoProduct.discountPercent ?? null,
    discountValue: promoProduct.discountValue ?? promoProduct.discountAmount ?? null,
    discountAmount: promoProduct.discountAmount ?? null,
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
        effectivePrice: x?.effectivePrice ?? x?.price ?? "0",
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
        isFavorite: x?.isFavorite ?? x?.favorited ?? false,
        favorited: x?.favorited ?? x?.isFavorite ?? false,
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
  return null;
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
      renderItem={({ item }) => {
        const productId = String(item.id);
        const inCart = Number(qtyById?.[productId] ?? 0) > 0;


        return (
           <View style={styles.cardWrap}>
            <OwnerProductGridCard
              productId={productId}
              name={item.name}
              imageUri={item.imageUri}
              promoBadgeLabel={item.promoBadgeLabel ?? null}
              ratingValue={Number(item.ratingValue ?? 0)}
              reviewsCount={Number(item.ratingCount ?? 0)}
              priceLabel={formatBRL(item.price)}
              oldPriceLabel={item.hasDiscount && item.originalPrice ? formatBRL(item.originalPrice) : null}
              inCart={inCart}
              isFavorite={item.isFavorite}
              onPress={() => onPressItem(productId)}
              onToggleCart={() => onAddToCart(productId)}
            />
          </View>
        );
      }}
    />
  );
}

export function OwnerHomeScreen() {
  const DARK_BG = "#0F0F0F";
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
    queryKey: ["owner-home-banners"],
    queryFn: async () => {
      const res = await api.get(endpoints.home.meBanners);
      return asHomeBanners(res.data);
    },
    retry: false,
  });

  const productsQ = useQuery({
    queryKey: ["owner-home-products"],
    queryFn: async () => {
      const res = await api.get(endpoints.products.list, {
        params: { take: 80, active: "true" },
      });
      return asProducts(res.data);
    },
    retry: false,
  });

  const promosQ = useQuery({
    queryKey: ["owner-home-promos-preview", { appliesTo: "SALON" }],
    queryFn: async () => {
      const res = await api.get(endpoints.products.promosActive, {
        params: { take: 200, appliesTo: "SALON" },
      });

      const items = asPromoProducts(res.data);
      const discounted = items.filter(
        (p: any) => (resolvePromoPriceData(p) ?? getCardPriceData(p)).hasDiscount
      );

      return discounted.length ? discounted : items;
    },
    retry: false,
  });

  const favoritesQ = useQuery({
    queryKey: ["owner-favorites"],
    queryFn: async () => {
      const res = await api.get(endpoints.products.favorites, {
        params: { take: 500 },
      });
      return res.data;
    },
    retry: false,
  });

  const lastAutoRefreshAtRef = useRef(0);
  const initialLoadMarkedRef = useRef(false);

  const refetchAll = useCallback(async () => {
    await Promise.allSettled([
      meQ.refetch(),
      bannersQ.refetch(),
      productsQ.refetch(),
      promosQ.refetch(),
      favoritesQ.refetch(),
    ]);

    lastAutoRefreshAtRef.current = Date.now();
  }, [meQ, bannersQ, productsQ, promosQ, favoritesQ]);

  useEffect(() => {
    const allLoaded =
      !meQ.isLoading &&
      !bannersQ.isLoading &&
      !productsQ.isLoading &&
      !promosQ.isLoading &&
      !favoritesQ.isLoading;

    if (!initialLoadMarkedRef.current && allLoaded) {
      initialLoadMarkedRef.current = true;
      lastAutoRefreshAtRef.current = Date.now();
    }
  }, [
    meQ.isLoading,
    bannersQ.isLoading,
    productsQ.isLoading,
    promosQ.isLoading,
    favoritesQ.isLoading,
  ]);

  useFocusEffect(
    useCallback(() => {
      const stillLoading =
        meQ.isLoading ||
        bannersQ.isLoading ||
        productsQ.isLoading ||
        promosQ.isLoading ||
        favoritesQ.isLoading;

      if (stillLoading) return;

      const now = Date.now();
      const elapsed = now - lastAutoRefreshAtRef.current;

      if (elapsed < AUTO_REFRESH_MS) return;

      void refetchAll();
    }, [
      meQ.isLoading,
      bannersQ.isLoading,
      productsQ.isLoading,
      promosQ.isLoading,
      favoritesQ.isLoading,
      refetchAll,
    ])
  );

  const banners = useMemo(() => {
    return (bannersQ.data ?? [])
      .filter((b) => b?.active !== false && !!b?.imageUrl)
      .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
  }, [bannersQ.data]);

  const products = useMemo(() => {
    return (productsQ.data ?? []).filter((p) => p?.active !== false);
  }, [productsQ.data]);

  const productsById = useMemo(() => {
    const map = new Map<string, ProductDTO>();
    for (const item of products) {
      if (item?.id) map.set(item.id, item);
    }
    return map;
  }, [products]);

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

  const favoriteIds = useMemo(() => buildFavoriteIds(favoritesQ.data), [favoritesQ.data]);

  const promoBasePreview = useMemo<PreviewItem[]>(
    () =>
      promoProducts.slice(0, 10).map((p) => {
        const baseProduct = productsById.get(p.id) ?? p;
        const merged = mergeWithPromoPricing(baseProduct, p);
        const priceData = resolvePromoPriceData(merged) ?? getCardPriceData(merged);

        return {
          id: p.id,
          name: merged.name,
          imageUri: getProductImageUri(merged),
          price: priceData.price,
          originalPrice: priceData.originalPrice,
          hasDiscount: priceData.hasDiscount,
          promoBadgeLabel: resolvePromoBadgeLabel(merged),
          ratingValue: getProductRatingValue(merged),
          ratingCount: getProductRatingCount(merged),
          isFavorite: resolveFavoriteFlag(p, favoriteIds),
        };
      }),
    [promoProducts, productsById, favoriteIds]
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
      const merged = mergeWithPromoPricing(p, promoProductById.get(p.id));
      const priceData = resolvePromoPriceData(merged) ?? getCardPriceData(merged);

      return {
        id: p.id,
        name: p.name,
        imageUri: getProductImageUri(merged),
        price: priceData.price,
        originalPrice: priceData.originalPrice,
        hasDiscount: priceData.hasDiscount,
        promoBadgeLabel: resolvePromoBadgeLabel(merged),
        ratingValue: getProductRatingValue(merged),
        ratingCount: getProductRatingCount(merged),
        isFavorite: resolveFavoriteFlag(merged, favoriteIds),
      };
    });
  }, [products, promoProductById, favoriteIds]);

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
      queryKey: ["owner-product-comments-summary-home", productId],
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
      nav.navigate(OWNER_SCREENS.Buy, params);
    },
    [nav]
  );

  const goToProductDetails = useCallback(
    (productId: string) => {
      if (!productId) return;
      nav.navigate(OWNER_SCREENS.ProductDetails, { productId });
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
          goToBuy({ sort: "newest" });
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
    meQ.isLoading ||
    bannersQ.isLoading ||
    productsQ.isLoading ||
    promosQ.isLoading ||
    favoritesQ.isLoading;

  const isError =
    meQ.isError ||
    bannersQ.isError ||
    productsQ.isError ||
    promosQ.isError ||
    favoritesQ.isError;

    const heroSection = (
  <View style={styles.topHeroSection}>
    {banners.length > 0 ? (
      <HomeHeroCarousel
        items={banners.map((b) => ({
          id: b.id,
          imageUrl: b.imageUrl,
        }))}
        variant="dark"
        onPressItem={(heroItem) => {
          const fullBanner = banners.find((b) => b.id === heroItem.id);
          if (fullBanner) {
            handleBannerPress(fullBanner);
          }
        }}
      />
    ) : null}
  </View>
);

return (
  <Screen style={{ backgroundColor: DARK_BG }}>
    <HeaderBar
      title="KEYFI"
      onMenu={() => nav.dispatch(DrawerActions.openDrawer())}
      titleStyle={{ fontSize: 20, fontWeight: "900", letterSpacing: 0.6 }}
      menuVariant="bare"
      menuIconSize={22}
      menuIconColor="#FFFFFF"
      backgroundColor={DARK_BG}
      showDivider={false}
    />

    <View style={styles.container}>
      {isLoading ? (
        <Loading />
      ) : isError ? (
        <ErrorState
          onRetry={() => {
            void refetchAll();
          }}
        />
      ) : (
        <FlatList
          style={styles.list}
          data={[]}
          keyExtractor={(_, idx) => String(idx)}
          renderItem={() => null}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: tabBarHeight + 14 },
          ]}
          ListHeaderComponent={
  <View style={styles.stack}>
    {heroSection}

    <View style={styles.productsSection}>
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
  </View>
}
        />
      )}
    </View>
  </Screen>
);
}

const styles = StyleSheet.create({
container: {
  flex: 1,
  backgroundColor: "#FFFFFF",
  position: "relative",
},

  content: {
  flexGrow: 1,
  backgroundColor: "#FFFFFF",
  paddingBottom: 20,
  },

  list: {
  flex: 1,
  backgroundColor: "#FFFFFF",
},

stack: {
  flexGrow: 1,
  gap: 0,
  backgroundColor: "#FFFFFF",
},

topHeroSection: {
  backgroundColor: "#0F0F0F",
},

productsSection: {
  flexGrow: 1,
  backgroundColor: "#FFFFFF",
  paddingTop: 10,
  paddingHorizontal: 6,
  paddingBottom: 20,

},

   
  gridContent: {
    paddingTop: 6,
  },

  gridRow: {
    justifyContent: "space-between",
    marginBottom: 10,
  },

  cardWrap: {
    width: "49.4%",
  },

  bgLayer: {
    ...StyleSheet.absoluteFillObject,
  },

  bgBase: {
    ...StyleSheet.absoluteFillObject,
  },

  blobTopLeft: {
    position: "absolute",
    top: -60,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 999,
  },

  blobTopRight: {
    position: "absolute",
    top: 40,
    right: -70,
    width: 200,
    height: 200,
    borderRadius: 999,
  },

  blobMidLeft: {
    position: "absolute",
    top: 280,
    left: -80,
    width: 240,
    height: 240,
    borderRadius: 999,
  },

  blobMidRight: {
    position: "absolute",
    top: 430,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 999,
  },

  blobBottomLeft: {
    position: "absolute",
    bottom: 180,
    left: -90,
    width: 260,
    height: 260,
    borderRadius: 999,
  },

  blobBottomRight: {
    position: "absolute",
    bottom: -30,
    right: -100,
    width: 280,
    height: 280,
    borderRadius: 999,
  },

  softVeil: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },

  hairline: {
    display: "none",
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

});