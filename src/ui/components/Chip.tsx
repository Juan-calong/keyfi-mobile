import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { t } from "../tokens";

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
    return (
        <Pressable onPress={onPress} style={[s.base, active && s.active]}>
            <Text style={[s.text, active && s.textActive]}>{label}</Text>
        </Pressable>
    );
}

const s = StyleSheet.create({
    base: {
        paddingHorizontal: 12,
        height: 36,
        borderRadius: t.radius.pill,
        borderWidth: 1,
        borderColor: t.colors.border,
        backgroundColor: t.colors.surface2,
        alignItems: "center",
        justifyContent: "center",
    },
    active: { backgroundColor: t.colors.primary, borderColor: "transparent" },
    text: { color: t.colors.text, fontWeight: "900", fontSize: 12 },     // ✅
    textActive: { color: t.colors.onPrimary },
});
