import React from "react";
import { ImageBackground, StyleSheet, Text, View } from "react-native";
import { Button } from "./Button";
import { t } from "../tokens";

export function HeroBanner({
    title = "New in",
    cta = "Shop now",
    onPress,
    imageUri,
}: {
    title?: string;
    cta?: string;
    onPress: () => void;
    imageUri: string;
}) {
    return (
        <ImageBackground source={{ uri: imageUri }} style={s.hero} imageStyle={s.heroImg}>
            <View style={s.overlay} />
            <View style={s.content}>
                <Text style={s.title}>{title}</Text>
                <Button title={cta} onPress={onPress} variant="ghost" style={s.cta} />
            </View>
        </ImageBackground>
    );
}

const s = StyleSheet.create({
    hero: { height: 250, borderRadius: 18, overflow: "hidden" },
    heroImg: { resizeMode: "cover" },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.18)" },
    content: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16, gap: 10 },
    title: { ...t.text.heroTitle, color: "#fff" },
    // botão branco igual print
    cta: { height: 40, minWidth: 120, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.92)", borderColor: "transparent", },
});
