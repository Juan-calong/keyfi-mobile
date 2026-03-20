import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  Dimensions,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";
import { OWNER_SCREENS, OwnerStackParamList } from "../../navigation/owner.routes";
import { Loading, ErrorState } from "../../ui/components/State";

const GOLD = "#B8943C";
const BG = "#FCF9F3";
const CARD = "#FFFDF9";
const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 16 * 2 - 12) / 2;

type NavProp = NativeStackNavigationProp<OwnerStackParamList>;

type FavoriteItem = {
  id: string;
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
    id: string;
    url: string;
  }>;
};

type FavoritesResponse = {
  items: FavoriteItem[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

function formatBRL(value?: number | null) {
  if (typeof value !== "number") return "Consultar";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getFavoriteImage(item: FavoriteItem) {
  return item.images?.[0]?.url || null;
}

function getFavoritePrice(item: FavoriteItem) {
  if (typeof item.activePromo?.promoPrice === "number") {
    return item.activePromo.promoPrice;
  }
  if (typeof item.effectivePrice === "number") {
    return item.effectivePrice;
  }
  if (typeof item.customerPrice === "number") {
    return item.customerPrice;
  }
  if (typeof item.price === "number") {
    return item.price;
  }
  return null;
}

export function OwnerFavoritesScreen() {
  const navigation = useNavigation<NavProp>();

  const favoritesQuery = useQuery({
    queryKey: ["owner-favorites"],
    queryFn: async () => {
      const res = await api.get<FavoritesResponse>(endpoints.products.favorites);
      return res.data;
    },
  });

  const items = favoritesQuery.data?.items ?? [];

  const openProduct = (item: FavoriteItem) => {
    navigation.navigate(OWNER_SCREENS.ProductDetails, {
      productId: item.id,
    });
  };

  const renderItem = ({ item }: { item: FavoriteItem }) => {
    const image = getFavoriteImage(item);
    const price = getFavoritePrice(item);

    return (
      <Pressable onPress={() => openProduct(item)} style={s.card}>
        <View style={s.imageWrap}>
          {image ? (
            <Image source={{ uri: image }} style={s.image} resizeMode="cover" />
          ) : (
            <View style={s.imageFallback}>
              <Icon name="image-outline" size={28} color={GOLD} />
            </View>
          )}

          <View style={s.heartBadge}>
            <Icon name="heart" size={16} color="#E11D48" />
          </View>
        </View>

        <View style={s.cardBody}>
          <Text numberOfLines={2} style={s.productName}>
            {item.name}
          </Text>

          {!!item.brand && <Text style={s.metaText}>Marca: {item.brand}</Text>}
          {!!item.line && <Text style={s.metaText}>Linha: {item.line}</Text>}
          {!!item.volume && <Text style={s.metaText}>Volume: {item.volume}</Text>}

          <View style={s.bottomRow}>
            <Text style={s.price}>{formatBRL(price)}</Text>

            <View style={s.arrowBtn}>
              <Icon name="chevron-forward" size={16} color="#000" />
            </View>
          </View>
        </View>
      </Pressable>
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

      <View style={s.bgBlobTop} />
      <View style={s.bgBlobBottom} />

      <View style={s.header}>
        <Text style={s.title}>Seus Favoritos</Text>
        <Text style={s.subtitle}>
          Os produtos que você marcou com coração aparecem aqui.
        </Text>
      </View>

      {favoritesQuery.isLoading ? (
        <Loading />
      ) : favoritesQuery.isError ? (
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <ErrorState onRetry={() => favoritesQuery.refetch()} />
        </View>
      ) : items.length === 0 ? (
        <View style={s.emptyWrap}>
          <LinearGradient
            colors={["rgba(255,255,255,0.96)", "rgba(255,250,241,0.96)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.emptyCard}
          >
            <View style={s.emptyIconCircle}>
              <Icon name="heart-outline" size={34} color={GOLD} />
            </View>

            <Text style={s.emptyTitle}>Nenhum favorito ainda</Text>
            <Text style={s.emptyText}>
              Quando você marcar um produto com coração, ele vai aparecer aqui.
            </Text>
          </LinearGradient>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={s.row}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={renderItem}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },

  bgBlobTop: {
    position: "absolute",
    top: -40,
    right: -60,
    width: 220,
    height: 180,
    borderRadius: 999,
    backgroundColor: "rgba(184,148,60,0.08)",
    transform: [{ rotate: "14deg" }],
  },

  bgBlobBottom: {
    position: "absolute",
    bottom: 80,
    left: -70,
    width: 220,
    height: 180,
    borderRadius: 999,
    backgroundColor: "rgba(184,148,60,0.05)",
    transform: [{ rotate: "-10deg" }],
  },

  header: {
    paddingTop: 22,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },

  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#111",
    letterSpacing: 0.2,
  },

  subtitle: {
    marginTop: 6,
    fontSize: 13.5,
    lineHeight: 20,
    color: "#7B6A45",
    fontWeight: "600",
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 110,
  },

  row: {
    justifyContent: "space-between",
    marginBottom: 12,
  },

  card: {
    width: CARD_WIDTH,
    backgroundColor: CARD,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(184,148,60,0.18)",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  imageWrap: {
    position: "relative",
    width: "100%",
    height: 150,
    backgroundColor: "#F4EFE3",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  imageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
    borderColor: "rgba(184,148,60,0.18)",
  },

  cardBody: {
    padding: 12,
    gap: 4,
  },

  productName: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "900",
    color: "#141414",
    minHeight: 40,
  },

  metaText: {
    fontSize: 11.5,
    color: "#7D6B43",
    fontWeight: "700",
  },

  bottomRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  price: {
    fontSize: 14,
    color: "#000",
    fontWeight: "900",
  },

  arrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(184,148,60,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyWrap: {
    flex: 1,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 70,
  },

  emptyCard: {
    width: "100%",
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingVertical: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(184,148,60,0.18)",
  },

  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 999,
    backgroundColor: "rgba(184,148,60,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111",
  },

  emptyText: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 13.5,
    lineHeight: 21,
    color: "#7B6A45",
    fontWeight: "600",
  },
});