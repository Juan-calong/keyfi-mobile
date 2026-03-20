import React from "react";
import { Pressable, Text, View } from "react-native";
import { s } from "./cart.shared.styles";
import type { BannerState } from "./cart.shared.types";

type Props = {
  banner: BannerState;
  onClose: () => void;
};

export function CartBanner({ banner, onClose }: Props) {
  if (!banner) return null;

  return (
    <View style={s.bannerWrap}>
      <View style={s.bannerCard}>
        <View style={{ flex: 1 }}>
          <Text style={s.bannerTitle}>{banner.title}</Text>
          <Text style={s.bannerMsg}>{banner.message}</Text>
        </View>

        <Pressable
          onPress={onClose}
          hitSlop={10}
          style={({ pressed }) => [s.bannerBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={s.bannerBtnText}>OK</Text>
        </Pressable>
      </View>
    </View>
  );
}