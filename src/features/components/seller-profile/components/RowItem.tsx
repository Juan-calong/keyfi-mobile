import React from "react";
import { Pressable, Text, View } from "react-native";

import { t } from "../../../../ui/tokens";
import { s } from "../sellerProfile.styles";

type Props = {
  title: string;
  subtitle?: string;
  rightText?: string;
  onPress: () => void;
  hideDivider?: boolean;
};

export function RowItem({
  title,
  subtitle,
  rightText,
  onPress,
  hideDivider,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 14,
        paddingHorizontal: 4,
        borderBottomWidth: hideDivider ? 0 : 1,
        borderBottomColor: t.colors.border,
      }}
    >
      <View style={{ flex: 1, paddingRight: 10 }}>
        <Text style={s.rowTitle}>{title}</Text>
        {!!subtitle && <Text style={s.rowSub}>{subtitle}</Text>}
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {!!rightText && <Text style={s.rowRight}>{rightText}</Text>}
        <Text style={s.chev}>›</Text>
      </View>
    </Pressable>
  );
}