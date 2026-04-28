import React from "react";
import { Platform, Pressable, StyleSheet, Text } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

type Props = {
  onPress: () => void;
  showLabel?: boolean;
  label?: string;
  color?: string;
  style?: any;
  iconSize?: number;
  disabled?: boolean;
};

export function AppBackButton({
  onPress,
  showLabel = Platform.OS === "ios",
  label = "Voltar",
  color = "#000000",
  style,
  iconSize = 22,
  disabled = false,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      hitSlop={12}
      style={({ pressed }) => [
        s.container,
        style,
        pressed && !disabled ? s.pressed : null,
      ]}
    >
      <Icon name={Platform.OS === "ios" ? "chevron-back" : "arrow-back"} size={iconSize} color={color} />
      {showLabel ? <Text style={[s.label, { color }]}>{label}</Text> : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: {
    minWidth: 44,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 4,
    paddingRight: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
  },
  pressed: {
    opacity: 0.65,
  },
});
