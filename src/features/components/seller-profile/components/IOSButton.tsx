import React from "react";
import { Pressable, Text } from "react-native";

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  full?: boolean;
  primary?: boolean;
};

export function IOSButton({
  title,
  onPress,
  disabled,
  full,
  primary,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          height: 44,
          borderRadius: 14,
          paddingHorizontal: 14,
          alignItems: "center",
          justifyContent: "center",
          flex: full ? 1 : undefined,
          backgroundColor: primary ? "#111827" : "#F2F2F7",
          borderWidth: primary ? 0 : 1,
          borderColor: "#D1D1D6",
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
          transform: pressed ? [{ scale: 0.98 }] : [{ scale: 1 }],
        },
        primary
          ? {
              shadowColor: "#000",
              shadowOpacity: 0.12,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 6 },
              elevation: 2,
            }
          : null,
      ]}
    >
      <Text style={{ fontWeight: "800", fontSize: 14, color: primary ? "#FFFFFF" : "#111827" }}>
        {title}
      </Text>
    </Pressable>
  );
}