import React from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { t } from "../tokens";

export function Loading({ small }: { small?: boolean }) {
    return (
        <View style={[s.center, small && { paddingVertical: 12 }]}>
            <ActivityIndicator color={t.colors.text} />
            <Text style={s.muted}>Carregando…</Text>
        </View>
    );
}

export function Empty({ text }: { text: string }) {
    return (
        <View style={s.center}>
            <Text style={s.muted}>{text}</Text>
        </View>
    );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <View style={s.center}>
            <Text style={s.err}>Falha ao carregar.</Text>
            <Pressable style={s.retry} onPress={onRetry}>
                <Text style={s.retryText}>Tentar novamente</Text>
            </Pressable>
        </View>
    );
}

const s = StyleSheet.create({
    center: { alignItems: "center", justifyContent: "center", paddingVertical: 26, gap: 10 },
    muted: { color: t.colors.text2, fontWeight: "800" },
    err: { color: t.colors.danger, fontWeight: "900" },
    retry: {
        paddingHorizontal: 14,
        height: 40,
        borderRadius: t.radius.md,
        borderWidth: 1,
        borderColor: t.colors.border,
        backgroundColor: t.colors.surface,
        alignItems: "center",
        justifyContent: "center",
    },
    retryText: { color: t.colors.text, fontWeight: "900", fontSize: 12 },
});
