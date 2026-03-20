import React from "react";
import { Pressable, Text, View } from "react-native";

import { iosTop } from "../sellerProfile.styles";

type Props = {
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
};

export function TopBarIOS({ title, onBack, right }: Props) {
  return (
    <View style={iosTop.nav}>
      <Pressable hitSlop={12} onPress={onBack} style={iosTop.backBtn}>
        <Text style={iosTop.backText}>{"<"}</Text>
      </Pressable>

      <Text style={iosTop.navTitle} numberOfLines={1}>
        {title}
      </Text>

      <View style={iosTop.rightSlot}>
        {right ?? <Text style={{ opacity: 0 }}>{"<"}</Text>}
      </View>
    </View>
  );
}