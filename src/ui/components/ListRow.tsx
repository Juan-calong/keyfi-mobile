// src/ui/components/ListRow.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { t } from "../tokens";

export function ListRow({
    title,
    subtitle,
    onPress,
}: {
    title: string;
    subtitle?: string;
    onPress: () => void;
}) {
    return (
        <Pressable onPress={onPress} style={s.row}>
            <View style={{ flex: 1 }}>
                <Text style={s.title}>{title}</Text>
                {subtitle ? <Text style={s.sub}>{subtitle}</Text> : null}
            </View>
            <Text style={s.chev}>›</Text>
        </Pressable>
    );
}

const s = StyleSheet.create({
    row: {
        height: 54,
        borderBottomWidth: 1,
        borderBottomColor: t.colors.border,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    title: { fontWeight: "800", color: t.colors.text, fontSize: 14 },
    sub: { marginTop: 2, color: t.colors.text2, fontWeight: "700", fontSize: 12 },
    chev: { fontSize: 22, color: t.colors.text2, paddingHorizontal: 8 },
});
