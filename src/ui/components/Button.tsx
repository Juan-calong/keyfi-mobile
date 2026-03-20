import React from "react";
import { Pressable, StyleSheet, Text, ViewStyle, Platform } from "react-native";
import { t } from "../tokens";

type Variant = "primary" | "ghost" | "danger";

export function Button({
    title,
    onPress,
    variant = "primary",
    loading,
    disabled,
    style,
}: {
    title: string;
    onPress: () => void;
    variant?: Variant;
    loading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
}) {
    const isDisabled = !!loading || !!disabled;

    return (
        <Pressable
            onPress={onPress}
            disabled={isDisabled}
            style={({ pressed }) => [
                s.btn,
                variant === "primary" && s.primary,
                variant === "ghost" && s.ghost,
                variant === "danger" && s.danger,
                isDisabled && { opacity: 0.45 },
                pressed && !isDisabled && { transform: [{ scale: 0.99 }], opacity: 0.92 },
                style,
            ]}
        >
            <Text
                numberOfLines={1}
                style={[
                    s.txt,
                    variant === "primary" && { color: t.colors.onPrimary },
                    variant === "ghost" && { color: t.colors.text },
                    variant === "danger" && { color: "#fff" },
                ]}
            >
                {loading ? "..." : title}
            </Text>
        </Pressable>
    );
}

const s = StyleSheet.create({
    btn: {
        paddingHorizontal: 14,
        height: 44,
        borderRadius: t.radius.md,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        minWidth: 110,

        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOpacity: 0.06,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 6 },
            },
            android: { elevation: 1 },
        }),
    },

    primary: { backgroundColor: t.colors.primary, borderColor: "transparent" },

    // ✅ ghost branco (visível no bg claro por causa da borda)
    ghost: { backgroundColor: t.colors.surface, borderColor: t.colors.border },

    danger: { backgroundColor: t.colors.danger, borderColor: "transparent" },
    txt: { fontWeight: "900", fontSize: 13, letterSpacing: 0.2 },
});
