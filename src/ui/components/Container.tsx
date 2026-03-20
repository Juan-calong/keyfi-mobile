import React from "react";
import { View, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { useBreakpoints } from "../responsive";

type ContainerProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Container({ children, style }: ContainerProps) {
  const bp = useBreakpoints();

  return (
    <View
      style={[
        s.base,
        {
          paddingHorizontal: bp.gutter,
          maxWidth: bp.maxWidth,
          alignSelf: bp.maxWidth ? "center" : "stretch",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  base: {
    width: "100%",
  },
});