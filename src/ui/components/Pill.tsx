import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { t } from "../tokens";

type Tone = "primary" | "warning" | "danger" | "success" | "muted";

export function Pill({ text, tone = "muted", style }: { text: string; tone?: Tone; style?: ViewStyle }) {
    return (
        <View style={[s.base, toneStyle(tone), style]}>
            <Text style={[s.text, toneTextStyle(tone)]}>{text}</Text>
        </View>
    );
}

function toneStyle(tone: Tone) {
    switch (tone) {
        case "success":
            return { backgroundColor: "rgba(16,185,129,0.10)", borderColor: "rgba(16,185,129,0.25)" };
        case "warning":
            return { backgroundColor: "rgba(245,158,11,0.10)", borderColor: "rgba(245,158,11,0.25)" };
        case "danger":
            return { backgroundColor: "rgba(225,29,72,0.10)", borderColor: "rgba(225,29,72,0.25)" };
        case "primary":
            return { backgroundColor: "rgba(17,17,17,0.08)", borderColor: "rgba(17,17,17,0.18)" };
        default:
            return { backgroundColor: "rgba(17,17,17,0.06)", borderColor: "rgba(17,17,17,0.10)" };
    }
}
function toneTextStyle(tone: Tone) {
    if (tone === "danger") return { color: t.colors.danger };
    if (tone === "warning") return { color: t.colors.warning };
    if (tone === "success") return { color: t.colors.success };
    return { color: t.colors.text };
}

const s = StyleSheet.create({
    base: {
        paddingHorizontal: 10,
        height: 28,
        borderRadius: t.radius.pill,
        borderWidth: 1,
        alignSelf: "flex-start",
        alignItems: "center",
        justifyContent: "center",
    },
    text: { fontWeight: "900", fontSize: 11, letterSpacing: 0.3 },
});
