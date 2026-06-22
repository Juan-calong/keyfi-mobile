import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  Pressable,
  useWindowDimensions,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Loading, ErrorState } from "../../../ui/components/State";
import { ProductImageFrame } from "../../../ui/components/ProductImageFrame";
import { ProductFavoriteButton } from "../../components/product-details/ProductFavoriteButton";

const GOLD = "#B8943C";
const BG = "#FCF9F3";
const CARD = "#FFFDF9";
const MUTED = "#7A7165";
const BORDER = "rgba(200,164,93,0.18)";

type FavoriteFilter = "all" | "promos" | "available";

export type FavoriteItemBase = {
  id?: string | number | null;
  productId?: string | number | null;
  product?: {
    id?: string | number | null;
    productId?: string | number | null;
  } | null;
  name: string;
  description?: string | null;
  price?: number | null;
  customerPrice?: number | null;
  effectivePrice?: number | null;
  stock?: number | null;
  effect?: string | null;
  volume?: string | null;
  line?: string | null;
  brand?: string | null;
  isFavorite?: boolean;
  activePromo?: {
    promoPrice?: number | null;
  } | null;
  images?: Array<{
    id?: string;
    url: string;
  }>;
};

type NormalizedFavoriteItem = FavoriteItemBase & {
  id: string;
  resolvedProductId: string;
  listKey: string;
};

type SharedFavoritesScreenProps = {
  title: string;
  subtitle: string;
  items: FavoriteItemBase[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onExploreProducts: () => void;
  onOpenProduct: (item: NormalizedFavoriteItem) => void;
};

function formatBRL(value?: number | null) {
  if (typeof value !== "number") return "Consultar";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getFavoriteImage(item: FavoriteItemBase) {
  return item.images?.[0]?.url || null;
}

function resolveFavoriteId(item: FavoriteItemBase): string {
  const value =
    item.id ??
    item.productId ??
    item.product?.id ??
    item.product?.productId;

  return value == null ? "" : String(value).trim();
}

function toFiniteNumber(value: unknown): number | null {
  if (value == null || value === "") return null;

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function getPromoPrice(item: FavoriteItemBase): number | null {
  const promoPrice = toFiniteNumber(item.activePromo?.promoPrice);
  return promoPrice != null && promoPrice > 0 ? promoPrice : null;
}

function getReferencePrice(item: FavoriteItemBase): number | null {
  return (
    toFiniteNumber(item.customerPrice) ??
    toFiniteNumber(item.effectivePrice) ??
    toFiniteNumber(item.price)
  );
}

function hasActivePromotion(item: FavoriteItemBase): boolean {
  const promoPrice = getPromoPrice(item);
  if (promoPrice == null) return false;

  const referencePrice = getReferencePrice(item);
  if (referencePrice != null && referencePrice > 0) {
    return promoPrice < referencePrice;
  }
  return Boolean(item.activePromo);
}

function isAvailable(item: FavoriteItemBase): boolean {
  if (item.stock == null) return true;

  const stock = toFiniteNumber(item.stock);
  return stock != null && stock > 0;
}

function getFavoritePrice(item: FavoriteItemBase) {
  return hasActivePromotion(item) ? getPromoPrice(item) : null;
}

export function SharedFavoritesScreen({
  title,
  subtitle,
  items,
  isLoading,
  isError,
  onRetry,
  onExploreProducts,
  onOpenProduct,
}: SharedFavoritesScreenProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const isTabletLandscape = isTablet && width > height;
  const numColumns = isTablet ? (isTabletLandscape ? (width >= 1400 ? 4 : 3) : 3) : 2;
  const horizontalPadding = isTablet ? 12 : 16;
  const columnGap = 12;
  const cardWidth = Math.floor(
    (width - horizontalPadding * 2 - columnGap * (numColumns - 1)) / numColumns
  );
  const imageBackgroundColor = isTablet ? CARD : "#F4EFE3";
  const imageResizeMode = "cover";
  const [selectedFilter, setSelectedFilter] =
    React.useState<FavoriteFilter>("all");
  const imageHeight = Math.max(150, Math.round(cardWidth * 0.9));
  const emptyCardMaxWidth = isTablet ? 540 : undefined;

  const normalizedItems = React.useMemo<NormalizedFavoriteItem[]>(
    () =>
      items.map((item, index) => {
        const resolvedProductId = resolveFavoriteId(item);
        const fallbackKey = `favorite-${index}`;

        return {
          ...item,
          id: resolvedProductId || fallbackKey,
          resolvedProductId,
          listKey: resolvedProductId || fallbackKey,
        };
      }),
    [items]
  );

  const filteredItems = React.useMemo(() => {
    if (selectedFilter === "promos") {
      return normalizedItems.filter(hasActivePromotion);
    }

    if (selectedFilter === "available") {
      return normalizedItems.filter(isAvailable);
    }

    return normalizedItems;
  }, [normalizedItems, selectedFilter]);

  const filteredEmptyMessage =
    selectedFilter === "promos"
      ? "Nenhum favorito em promoção no momento."
      : "Nenhum favorito disponível no momento.";

  const renderItem = ({ item }: { item: NormalizedFavoriteItem }) => {
    const image = getFavoriteImage(item);
    const price = getFavoritePrice(item);
    const canOpenProduct = Boolean(item.resolvedProductId);

    return (
      <View style={[s.cardWrap, { width: cardWidth }]}>
        <Pressable
          disabled={!canOpenProduct}
          onPress={() => {
            if (canOpenProduct) onOpenProduct(item);
          }}
          style={s.card}
        >
          <View
            style={[
              s.imageWrap,
              { height: imageHeight, backgroundColor: imageBackgroundColor },
            ]}
          >
            <ProductImageFrame
              uri={image}
              fallbackLabel="Sem imagem"
              fallbackIconSize={24}
              backgroundColor={imageBackgroundColor}
              resizeMode={imageResizeMode}
            />

            {canOpenProduct ? (
              <ProductFavoriteButton
                productId={item.resolvedProductId}
                initialFavorited={true}
                containerStyle={s.heartBadge}
                size={16}
                activeColor="#E11D48"
                inactiveColor="#2E2A29"
              />
            ) : null}
          </View>

          <View style={s.cardBody}>
          <Text numberOfLines={2} style={s.productName}>
            {item.name}
          </Text>

          {!!item.brand && <Text style={s.metaText}>Marca: {item.brand}</Text>}
          {!!item.line && <Text style={s.metaText}>Linha: {item.line}</Text>}
          {!!item.volume && <Text style={s.metaText}>Volume: {item.volume}</Text>}

          <View style={s.bottomRow}>
            {price != null ? (
              <Text style={s.price}>{formatBRL(price)}</Text>
            ) : (
              <Text style={s.noPromoText}>Sem promoção ativa</Text>
            )}

            <View style={s.arrowBtn}>
              <Icon name="chevron-forward" size={16} color="#000" />
            </View>
          </View>
        </View>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={s.screen}>
      <LinearGradient
        colors={["#FFFEFC", "#FCF9F3", "#F8F3E8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={[s.header, { paddingTop: Math.max(insets.top + 10, 30) }]}>
        <Text style={s.title}>{title}</Text>
        <Text style={s.subtitle}>{subtitle}</Text>
      </View>

      {isLoading ? (
        <Loading />
      ) : isError ? (
<View style={s.errorWrap}>
  <ErrorState onRetry={onRetry} />
</View>
      ) : normalizedItems.length === 0 ? (
        <ScrollView
          contentContainerStyle={[
            s.emptyScrollContent,
            {
              paddingHorizontal: horizontalPadding,
              paddingBottom: Math.max(insets.bottom + 130, 150),
            },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <LinearGradient
            colors={["rgba(255,255,255,0.96)", "rgba(255,250,241,0.96)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              s.emptyCardPremium,
              emptyCardMaxWidth ? { maxWidth: emptyCardMaxWidth } : null,
            ]}
          >
            <View style={s.emptyIconCircle}>
              <Icon name="heart-outline" size={34} color={GOLD} />
            </View>

            <Text style={s.emptyTitle}>Nenhum favorito ainda</Text>
            <Text style={s.emptyText}>
              Toque no coração de um produto para salvá-lo aqui.
            </Text>

            <Pressable
              accessibilityRole="button"
              style={s.emptyCtaButton}
              onPress={onExploreProducts}
            >
              <Text style={s.emptyCtaText}>Explorar produtos</Text>
              <Icon name="arrow-forward" size={16} color="#FFFDF8" />
            </Pressable>
          </LinearGradient>
        </ScrollView>
      ) : (
        <>
          <View style={s.filtersRow}>
            {[
              { label: "Todos", value: "all" as const },
              { label: "Promoções", value: "promos" as const },
              { label: "Disponíveis", value: "available" as const },
            ].map((filter) => {
              const isActive = selectedFilter === filter.value;
              return (
                <Pressable
                  key={filter.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  style={[s.filterChip, isActive && s.filterChipActive]}
                  onPress={() => setSelectedFilter(filter.value)}
                >
                  <Text
                    style={[s.filterChipText, isActive && s.filterChipTextActive]}
                  >
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <FlatList
            data={filteredItems}
            keyExtractor={(item, index) => item.listKey || `favorite-${index}`}
            numColumns={numColumns}
            columnWrapperStyle={numColumns > 1 ? [s.row, { gap: columnGap, justifyContent: "flex-start" }] : undefined}
            contentContainerStyle={[s.listContent, { paddingHorizontal: horizontalPadding }]}
            showsVerticalScrollIndicator={false}
            renderItem={renderItem}
            ListEmptyComponent={
              <View style={s.filteredEmptyWrap}>
                <Text style={s.filteredEmptyTitle}>Nada por aqui</Text>
                <Text style={s.filteredEmptyText}>{filteredEmptyMessage}</Text>
              </View>
            }
          />
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 16, paddingBottom: 10 },
  title: { fontSize: 26, fontWeight: "900", color: "#111", letterSpacing: 0.2 },
  subtitle: {
    marginTop: 6,
    fontSize: 13.5,
    lineHeight: 20,
    color: MUTED,
    fontWeight: "600",
  },
  errorWrap: { paddingHorizontal: 16, marginTop: 12 },
  listContent: { paddingTop: 8, paddingBottom: 110 },
  filtersRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 6,
  },
  filterChip: {
    minHeight: 40,
    borderRadius: 999,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: BORDER,
  },
  filterChipActive: { backgroundColor: GOLD, borderColor: GOLD },
  filterChipText: { fontSize: 13.5, fontWeight: "700", color: "#111111" },
  filterChipTextActive: { color: "#FFFDF8" },
  row: { justifyContent: "space-between", marginBottom: 12 },
  cardWrap: { marginBottom: 12 },
  card: {
    width: "100%",
    backgroundColor: CARD,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  imageWrap: {
    position: "relative",
    width: "100%",
    backgroundColor: "#F4EFE3",
    padding: 0,
    overflow: "hidden",
  },
  heartBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardBody: { padding: 12, gap: 4 },
  productName: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "900",
    color: "#141414",
    minHeight: 40,
  },
  metaText: { fontSize: 11.5, color: "#7D6B43", fontWeight: "700" },
  bottomRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  price: { fontSize: 14, color: "#000", fontWeight: "900", flex: 1 },
  noPromoText: { fontSize: 12, color: "#7D6B43", fontWeight: "800", flex: 1 },
  arrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(184,148,60,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyScrollContent: {
    flexGrow: 1,
    paddingTop: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCardPremium: {
    width: "100%",
    alignSelf: "center",
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 999,
    backgroundColor: "rgba(200,164,93,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 20, fontWeight: "900", color: "#111" },
  emptyText: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 13.5,
    lineHeight: 21,
    color: MUTED,
    fontWeight: "600",
  },
  emptyCtaButton: {
    marginTop: 18,
    minHeight: 46,
    borderRadius: 999,
    backgroundColor: GOLD,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyCtaText: { fontSize: 14, fontWeight: "800", color: "#FFFDF8" },
  filteredEmptyWrap: {
    marginTop: 30,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  filteredEmptyTitle: { fontSize: 18, fontWeight: "800", color: "#111111" },
  filteredEmptyText: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 13.5,
    lineHeight: 20,
    color: MUTED,
    fontWeight: "600",
  },
});
