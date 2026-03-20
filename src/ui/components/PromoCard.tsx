// src/ui/components/PromoCard.tsx
import React from "react";
import { View, Text } from "react-native";

type Promo = {
    id: string;
    name: string;
    description?: string | null;
    appliesTo?: "SELLER" | "SALON" | "BOTH";
    discountPercent?: number | null;
    discountValue?: number | null;
    visibleTo?: "SELLER" | "SALON" | "BOTH";
};

export function PromoCard({ promo }: { promo: Promo }) {
    const discountLabel =
        promo.discountPercent != null
            ? `${promo.discountPercent}% OFF`
            : promo.discountValue != null
                ? `R$ ${promo.discountValue} OFF`
                : "Promoção";

    return (
        <View style={{ padding: 12, borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#FFF" }}>
            <Text style={{ fontSize: 14, fontWeight: "700" }}>{promo.name}</Text>
            <Text style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>{discountLabel}</Text>

            <View style={{ marginTop: 10 }}>
                <Text style={{ fontSize: 12, opacity: 0.8 }}>
                    Aplica para: {promo.appliesTo || "—"} • Visível: {promo.visibleTo || "—"}
                </Text>
            </View>

            {!!promo.description && (
                <Text style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>{promo.description}</Text>
            )}
        </View>
    );
}
