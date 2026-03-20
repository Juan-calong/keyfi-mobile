import React from "react";
import { View, Text, Pressable } from "react-native";
import { useAuthStore } from "../../stores/auth.store";

export function AdminHomeScreen() {
    const logout = useAuthStore((s) => s.logout);

    return (
        <View style={{ flex: 1, padding: 16, gap: 12 }}>
            <Text style={{ fontSize: 20, fontWeight: "800" }}>Admin Home</Text>

            <Pressable onPress={logout} style={{ padding: 14, borderWidth: 1, borderRadius: 12 }}>
                <Text>Sair</Text>
            </Pressable>
        </View>
    );
}
