import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";

export function Row({
    children,
    gap = 12,
    style,
}: {
    children: React.ReactNode;
    gap?: number;
    style?: ViewStyle;
}) {
    return (
        <View style={[styles.row, style, { gap }]}>{children}</View>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center" },
});
