import React from "react";
import { Text, View } from "react-native";

import { AppBackButton } from "../../../../ui/components/AppBackButton";
import { iosTop } from "../sellerProfile.styles";

type Props = {
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
};

export function TopBarIOS({ title, onBack, right }: Props) {
  return (
    <View style={iosTop.nav}>
      <View style={iosTop.navSide}>
        <AppBackButton
          onPress={onBack}
          showLabel={false}
          color="#000000"
          iconSize={24}
          style={iosTop.backBtn}
        />
      </View>

      <Text style={iosTop.navTitle} numberOfLines={1}>
        {title}
      </Text>

      <View style={iosTop.rightSlot}>
        {right ?? <Text style={{ opacity: 0 }}>{"<"}</Text>}
      </View>
    </View>
  );
}