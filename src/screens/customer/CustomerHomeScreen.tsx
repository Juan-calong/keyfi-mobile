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
import { useQuery } from "@tanstack/react-query";
import LinearGradient from "react-native-linear-gradient";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { HeaderBar } from "../../ui/components/HeaderBar";
import { HomeHeroCarousel } from "../../ui/components/HomeHeroCarousel";
import { Loading, ErrorState } from "../../ui/components/State";

import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";
import { t } from "../../ui/tokens";

import { CUSTOMER_SCREENS } from "../../navigation/customer.routes";

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
};

function toNumberBR(v: string | number | null | undefined) {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function formatBRL(value: string | number | null | undefined) {
  const n = toNumberBR(value);
  if (!Number.isFinite(n)) return "R$ —";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

function getProductImageUri(p: ProductDTO) {
  return p.primaryImageUrl || p.images?.[0]?.url || p.imageUrl || undefined;
}

function asPromoProducts(data: any): ProductDTO[] {
  const arr = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];

  const mapped: any[] = arr.map((x: any) => {
    if (x?.product && (x.product.id || x.product.productId)) return x.product;
    if (x?.productRef && (x.productRef.id || x.productRef.productId)) return x.productRef;
    if (x?.productItem && (x.productItem.id || x.productItem.productId)) return x.productItem;

    if (x?.productId && x?.name) {
      return {
        id: x.productId,
        name: x.name,
        price: String(x.price ?? "0"),
        effectivePrice: x.effectivePrice ?? x.customerPrice ?? x.price ?? "0",
        imageUrl: x.imageUri ?? x.imageUrl ?? x.primaryImageUrl ?? null,
        active: true,
      } as ProductDTO;
    }

    return x;
  });

  return mapped
    .map((p: any) => ({ ...p, id: p?.id ?? p?.productId }))
    .filter((p: any) => !!p?.id && !!p?.name);
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
    "rgba(184,148,60,0)"
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
    "rgba(184,148,60,0)"
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
    "rgba(184,148,60,0)"
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
    "rgba(184,148,60,0)"
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
    "rgba(184,148,60,0)"
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
    "rgba(184,148,60,0)"
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
    "rgba(184,148,60,0)"
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
    "rgba(184,148,60,0)"
  ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.softVeil}
      />
    </View>
  );
}

function PreviewGrid({
  data,
  onPressItem,
}: {
  data: PreviewItem[];
  onPressItem: (id: string) => void;
}) {
  const { width } = useWindowDimensions();

  const gap = 12;
  const horizontalPadding = 4;
  const containerHorizontalInset = 32;
  const cardWidth = (width - containerHorizontalInset - horizontalPadding - gap) / 2;

  return (
    <FlatList
      data={data}
      keyExtractor={(i) => i.id}
      numColumns={2}
      scrollEnabled={false}
      columnWrapperStyle={styles.gridRow}
      contentContainerStyle={styles.gridContent}
      ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => onPressItem(item.id)}
          style={[styles.cardWrap, { width: cardWidth }]}
        >
          <View style={styles.card}>
            <View style={styles.cardImageWrap}>
              {item.imageUri ? (
                <Image source={{ uri: item.imageUri }} style={styles.cardImage} resizeMode="cover" />
              ) : (
                <View style={styles.cardImageFallback} />
              )}
            </View>

            <View style={styles.cardInnerDivider} />

            <View style={styles.cardMeta}>
              <Text numberOfLines={2} ellipsizeMode="tail" style={styles.cardName}>
                {item.name}
              </Text>

              <Text numberOfLines={1} style={styles.cardPrice}>
                {formatBRL(item.price)}
              </Text>
            </View>
          </View>
        </Pressable>
      )}
    />
  );
}

export function CustomerHomeScreen() {
  const nav = useNavigation<any>();

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
        params: { take: 10, appliesTo: "CUSTOMER" },
      });

      const items = asPromoProducts(res.data);

      const discounted = items.filter((p: any) => {
        const base = Number(String(getEffectivePrice(p) ?? "0").replace(",", "."));

        const promoPrice = Number(
          String(p?.promoPrice ?? p?.salePrice ?? p?.pricePromo ?? "").replace(",", ".")
        );

        if (Number.isFinite(base) && Number.isFinite(promoPrice) && promoPrice > 0) {
          return promoPrice < base;
        }

        const pct = Number(p?.discountPct ?? p?.discountPercent ?? 0);
        const val = Number(p?.discountValue ?? p?.discountAmount ?? 0);
        return (Number.isFinite(pct) && pct > 0) || (Number.isFinite(val) && val > 0);
      });

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

  const promoPreview = useMemo<PreviewItem[]>(
    () =>
      promoProducts.slice(0, 10).map((p) => ({
        id: p.id,
        name: p.name,
        imageUri: getProductImageUri(p),
        price: getEffectivePrice(p),
      })),
    [promoProducts]
  );

  const newestPreview = useMemo<PreviewItem[]>(() => {
    const copy = [...products];

    copy.sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });

    return copy.slice(0, 10).map((p) => ({
      id: p.id,
      name: p.name,
      imageUri: getProductImageUri(p),
      price: getEffectivePrice(p),
    }));
  }, [products]);

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
            contentContainerStyle={styles.content}
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

  gridContent: {
    paddingTop: 6,
    paddingHorizontal: 2,
  },

  gridRow: {
    justifyContent: "space-between",
  },

  cardWrap: {},

  cardPrice: {
    color: "rgba(0,0,0,0.78)",
    fontSize: 13.2,
    fontWeight: "900",
    lineHeight: 20,
  },

  bgLayer: {
    ...StyleSheet.absoluteFillObject,
  },

  bgBase: {
    ...StyleSheet.absoluteFillObject,
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
  },

  cardImageWrap: {
    height: 170,
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
  },

  cardName: {
    color: "#000",
    fontSize: 11.5,
    fontWeight: "600",
  },
});