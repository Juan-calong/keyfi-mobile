import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

type Props = {
  uri?: string | null;
  fallbackLabel?: string;
  fallbackIconSize?: number;
  backgroundColor?: string;
  resizeMode?: "contain" | "cover" | "stretch" | "center";
};

const FALLBACK_BG = "#F4EFE3";
const GOLD = "#B8943C";

export function ProductImageFrame({
  uri,
  fallbackLabel = "Sem imagem",
  fallbackIconSize = 26,
  backgroundColor = "#F7F4F3",
  resizeMode = "contain",
}: Props) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, { backgroundColor }]}
        resizeMode={resizeMode}
      />
    );
  }

  return (
    <View style={[styles.fallback, { backgroundColor }]}>
      <Icon name="image-outline" size={fallbackIconSize} color={GOLD} />
      <Text style={styles.fallbackText} numberOfLines={1}>
        {fallbackLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: "100%",
    height: "100%",
  },

  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: FALLBACK_BG,
    gap: 4,
  },

  fallbackText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    color: "#7A7165",
  },
});
