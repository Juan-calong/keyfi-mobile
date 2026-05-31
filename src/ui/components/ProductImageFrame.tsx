import React from "react";
import { StyleSheet, type ImageResizeMode, type StyleProp, type ViewStyle } from "react-native";

import { AppImage } from "./AppImage";

type Props = {
  uri?: string | null;
  fallbackLabel?: string;
  fallbackIconSize?: number;
  backgroundColor?: string;
  resizeMode?: ImageResizeMode;
  style?: StyleProp<ViewStyle>;
};

export function ProductImageFrame({
  uri,
  fallbackLabel = "Sem imagem",
  fallbackIconSize = 26,
  backgroundColor = "#F7F4F3",
  resizeMode = "contain",
  style,
}: Props) {
  return (
    <AppImage
      uri={uri}
      style={[styles.fill, style]}
      backgroundColor={backgroundColor}
      resizeMode={resizeMode}
      fallbackLabel={fallbackLabel}
      fallbackIconSize={fallbackIconSize}
    />
  );
}

const styles = StyleSheet.create({
  fill: {
    width: "100%",
    height: "100%",
  },
});
