import React from "react";
import { View, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { useBreakpoints } from "../responsive";

type ContainerProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Container({ children, style }: ContainerProps) {
  const bp = useBreakpoints();
  const contentMaxWidth = bp.contentMaxWidth ?? bp.maxWidth;

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
      <View
        style={[
          s.content,
          contentMaxWidth
            ? {
                maxWidth: contentMaxWidth,
                alignSelf: "center",
              }
            : null,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  base: {
    flex: 1,
    width: "100%",
  },

  content: {
    width: "100%",
    flexGrow: 1,
  },
});
