import React from "react";
import { Pressable, Text, View } from "react-native";
import { useBreakpoints } from "../../../ui/responsive";
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
  const bp = useBreakpoints();
  const count = Number(itemCount ?? 0);
  const subtitle = count === 1 ? "1 item no carrinho" : `${count} itens no carrinho`;
  const compactTablet = bp.isTablet && bp.width > bp.height;

  return (
    <View style={[s.nav, compactTablet && { paddingHorizontal: 12 }]}>
      <Pressable onPress={onBack} hitSlop={8} style={[s.backHit, compactTablet && { width: 56 }]}>
        <Text style={s.backText}>{"<"}</Text>
      </Pressable>

      <View style={s.titleWrap}>
        <Text style={[s.title, compactTablet && { fontSize: 18 }]}>{title}</Text>
        <Text style={[s.subtitle, compactTablet && { fontSize: 11 }]}>{subtitle}</Text>
      </View>

      <Pressable
        onPress={onRightPress}
        hitSlop={8}
        style={[s.navRightSpacer, compactTablet && { width: 56 }]}
        disabled={!rightText}
      >
        <Text style={s.rightText}>{rightText}</Text>
      </Pressable>
    </View>
  );
}
