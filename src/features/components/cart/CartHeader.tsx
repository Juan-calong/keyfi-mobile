import React from "react";
import { Pressable, Text, View } from "react-native";
import { s } from "./cart.shared.styles";

type Props = {
  title?: string;
  itemCount?: number;
  onBack: () => void;
  rightText?: string;
  onRightPress?: () => void;
};

export function CartHeader({
  title = "Carrinho",
  onBack,
  itemCount,
  rightText = "",
  onRightPress,
}: Props) {
  const count = Number(itemCount ?? 0);
  const subtitle = count === 1 ? "1 item no carrinho" : `${count} itens no carrinho`;
  return (
    <View style={s.nav}>
      <Pressable onPress={onBack} hitSlop={8} style={s.backHit}>
        <Text style={s.backText}>‹</Text>
      </Pressable>

      <View style={s.titleWrap}>
        <Text style={s.title}>{title}</Text>
        <Text style={s.subtitle}>{subtitle}</Text>
      </View>

      <Pressable
        onPress={onRightPress}
        hitSlop={8}
        style={s.navRightSpacer}
        disabled={!rightText}
      >
        <Text style={s.rightText}>{rightText}</Text>
      </Pressable>
    </View>
  );
}