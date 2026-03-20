import React from "react";
import { type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ScreenProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Screen({ children, style }: ScreenProps) {
  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[
        {
          flex: 1,
          backgroundColor: "#FFFFFF",
          paddingTop: 12,
          paddingBottom: 8,
        },
        style,
      ]}
    >
      {children}
    </SafeAreaView>
  );
}