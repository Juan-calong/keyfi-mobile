import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { t } from "../tokens";

export function Segmented<T extends string>({
    value,
    onChange,
    items,
}: {
    value: T;
    onChange: (v: T) => void;
    items: Array<{ key: T; label: string }>;
}) {
    return (
        <View style={s.wrap}>
            {items.map((it) => {
                const active = it.key === value;
                return (
                    <Pressable key={it.key} onPress={() => onChange(it.key)} style={[s.item, active && s.itemActive]}>
                        <Text style={[s.text, active && s.textActive]} numberOfLines={1}>
                            {it.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

const s = StyleSheet.create({
    wrap: {
        flexDirection: "row",
        backgroundColor: t.colors.surface2,
        borderRadius: t.radius.lg,
        borderWidth: 1,
        borderColor: t.colors.border,
        padding: 4,
        gap: 6,
    },
    item: { flex: 1, height: 38, borderRadius: t.radius.md, alignItems: "center", justifyContent: "center" },
    itemActive: { backgroundColor: t.colors.primary },
    text: { color: t.colors.text2, fontWeight: "900", fontSize: 12 },
    textActive: { color: t.colors.onPrimary },
});
