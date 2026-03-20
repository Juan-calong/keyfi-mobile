import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Card } from "../components/Card";
import { t } from "../tokens";

export type UIProduct = {
    price: number;
    id: string;
    name: string;
    priceLabel: string;
    imageUri?: string;
};

export function ProductCard({ item, onPress }: { item: UIProduct; onPress: (p: UIProduct) => void }) {
    return (
        <Pressable onPress={() => onPress(item)} style={{ flex: 1 }}>
            <Card style={s.card}>
                <View style={s.imgWrap}>
                    {item.imageUri ? (
                        <Image source={{ uri: item.imageUri }} style={s.img} />
                    ) : (
                        <View style={s.placeholder} />
                    )}
                </View>

                <Text style={s.name} numberOfLines={2}>
                    {item.name}
                </Text>
                <Text style={s.price} numberOfLines={1}>
                    {item.priceLabel}
                </Text>
            </Card>
        </Pressable>
    );
}

const s = StyleSheet.create({
    card: { padding: 12, borderRadius: 16 },

    imgWrap: {
        height: 108, // ⬅️ maior (antes 84)
        borderRadius: 14,
        backgroundColor: t.colors.surface2, // ⬅️ tema
        overflow: "hidden",
        marginBottom: 10,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: t.colors.border,
    },

    img: { width: "100%", height: "100%", resizeMode: "contain" },

    placeholder: { width: "100%", height: "100%", backgroundColor: t.colors.surface2 },
    name: {
        fontWeight: "900",
        color: t.colors.text,
        fontSize: 15,
        lineHeight: 18,
        letterSpacing: 0.2,
    },

    price: {
        marginTop: 6,
        fontWeight: "900",
        color: t.colors.text,
        fontSize: 14,
        letterSpacing: 0.2,
    },
});
