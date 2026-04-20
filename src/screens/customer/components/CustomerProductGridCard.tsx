import React from "react";
import { GestureResponderEvent, Image, Pressable, StyleSheet, Text, View } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

import { ProductFavoriteButton } from "../../../features/components/product-details/ProductFavoriteButton";

type Props = {
  productId: string;
  name: string;
  imageUri?: string;
  promoBadgeLabel?: string | null;
  ratingValue: number;
  reviewsCount: number;
  priceLabel: string;
  oldPriceLabel?: string | null;
  inCart: boolean;
  isFavorite?: boolean;
  outOfStock?: boolean;
  highlighted?: boolean;
  width?: number;
  marginLeft?: number;
  onPress: () => void;
  onToggleCart: (e?: GestureResponderEvent) => void;
};

const BLACK = "#000000";
const WHITE = "#FFFFFF";

function RatingStars({ value, size = 12 }: { value: number; size?: number }) {
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

export function CustomerProductGridCard({
  productId,
  name,
  imageUri,
  promoBadgeLabel,
  ratingValue,
  reviewsCount,
  priceLabel,
  oldPriceLabel,
  inCart,
  isFavorite,
  outOfStock,
  highlighted,
  width,
  marginLeft = 0,
  onPress,
  onToggleCart,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.cardPress, width ? { width } : null, { marginLeft }]}
    >
      <View style={[styles.card, outOfStock && !inCart ? styles.cardOut : null, highlighted && styles.cardHighlight]}>
        <View style={styles.cardImageWrap}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.cardImage} resizeMode="cover" />
          ) : (
            <Image
              source={{ uri: "https://dummyimage.com/400x400/ffffff/000000.png&text=NO+IMAGE" }}
              style={styles.cardImage}
              resizeMode="contain"
            />
          )}

          {!!promoBadgeLabel && !(outOfStock && !inCart) ? (
            <View style={styles.cardPromoBadge}>
              <Text style={styles.cardPromoBadgeTxt}>{promoBadgeLabel}</Text>
            </View>
          ) : null}

          <ProductFavoriteButton
            productId={productId}
            initialFavorited={Boolean(isFavorite)}
            containerStyle={styles.favoriteBtn}
            size={18}
            activeColor="#E11D48"
            inactiveColor="#2E2A29"
          />

          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onToggleCart(e);
            }}
            hitSlop={10}
            style={({ pressed }) => [
              styles.addBtnFloating,
              inCart && styles.addBtnFloatingActive,
              pressed && styles.pressed,
              !inCart && outOfStock ? { opacity: 0.45 } : null,
            ]}
            disabled={!inCart && outOfStock}
          >
            <Icon name={inCart ? "bag" : "bag-outline"} size={18} color={inCart ? WHITE : BLACK} />
          </Pressable>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={2}>
            {name}
          </Text>

          <View style={styles.cardRatingWrap}>
            <RatingStars value={ratingValue} size={12} />
            <Text style={styles.cardRatingText}>{ratingValue > 0 ? ratingValue.toFixed(1) : "0.0"}</Text>
            <Text style={styles.cardRatingCount}>({reviewsCount})</Text>
          </View>

          <View style={styles.cardPriceWrap}>
            <Text style={styles.cardPrice}>{priceLabel}</Text>
            {oldPriceLabel ? <Text style={styles.cardOldPrice}>{oldPriceLabel}</Text> : null}
          </View>

          {outOfStock && !inCart ? <Text style={styles.cardOutText}>Sem estoque</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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

  pressed: {
    opacity: 0.82,
  },
});
