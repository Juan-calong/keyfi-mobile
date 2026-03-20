import React from "react";
import { View, Text, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";

type DesiredRole = "SELLER" | "SALON_OWNER";

export function RoleSelectScreen() {
    const nav = useNavigation<any>();

    function go(desiredRole: DesiredRole) {
        nav.navigate("Login", { desiredRole });
    }

    return (
        <View style={{ flex: 1, padding: 18, justifyContent: "center" }}>
            <Text style={{ fontSize: 28, fontWeight: "900", marginBottom: 8, color: "#0B0B0B" }}>
                KeyFi
            </Text>

            <Text style={{ color: "rgba(0,0,0,0.6)", fontSize: 14, marginBottom: 18 }}>
                Escolha como você quer entrar.
            </Text>

            <Pressable
                onPress={() => go("SELLER")}
                style={{
                    paddingVertical: 14,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#2563EB",
                }}
            >
                <Text style={{ color: "white", fontWeight: "900" }}>Entrar como Seller</Text>
            </Pressable>

            <View style={{ height: 12 }} />

            <Pressable
                onPress={() => go("SALON_OWNER")}
                style={{
                    paddingVertical: 14,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#0B0B0B",
                }}
            >
                <Text style={{ color: "white", fontWeight: "900" }}>Entrar como Salon</Text>
            </Pressable>
        </View>
    );
}
