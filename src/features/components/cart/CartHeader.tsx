import React from "react";
import { Pressable, Text, View } from "react-native";
import { s } from "./cart.shared.styles";

type Props = {
  title?: string;
  onBack: () => void;
  rightText?: string;
  onRightPress?: () => void;
};

export function CartHeader({
  title = "Cart",
  onBack,
  rightText = "",
  onRightPress,
}: Props) {
  return (
    <View style={s.nav}>
      <Pressable onPress={onBack} hitSlop={10} style={s.backHit}>
        <Text style={s.backText}>{"<"}</Text>
      </Pressable>

      <Text style={s.title}>{title}</Text>

      <Pressable
        onPress={onRightPress}
        hitSlop={10}
        style={s.navRightSpacer}
        disabled={!rightText}
      >
        <Text style={[s.backText, { textAlign: "right" }]}>{rightText}</Text>
      </Pressable>
    </View>
  );
}