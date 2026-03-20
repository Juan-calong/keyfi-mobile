import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuthStore } from "../stores/auth.store";

import { OwnerStack } from "./OwnerStack";
import { SellerHomeScreen } from "../screens/seller/SellerHomeScreen";
import { AdminStack } from "./AdminStack";
import { ReferralScreen } from "../screens/shared/ReferralScreen";
import { t } from "../ui/tokens";

const Tab = createBottomTabNavigator();

export function RoleTabs() {
    const role = useAuthStore((s) => s.activeRole);

    // ✅ ADMIN: SEM bottom tabs (remove a barra fantasma)
    if (role === "ADMIN") {
        return <AdminStack />;
    }

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: {
                    height: 62,
                    paddingBottom: 10,
                    paddingTop: 10,
                    backgroundColor: "#fff",
                    borderTopWidth: 1,
                    borderTopColor: t.colors.border,
                },
            }}
        >
            {role === "SELLER" ? (
                <>
                    <Tab.Screen name="SellerHome" component={SellerHomeScreen} options={{ title: "Vendas" }} />
                    <Tab.Screen name="Referral" component={ReferralScreen} options={{ title: "Indicação" }} />
                </>
            ) : (
                <>
                    <Tab.Screen name="Owner" component={OwnerStack} options={{ title: "Salão" }} />
                    <Tab.Screen name="Referral" component={ReferralScreen} options={{ title: "Indicação" }} />
                </>
            )}
        </Tab.Navigator>
    );
}