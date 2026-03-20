// OwnerDrawer.tsx
import React from "react";
import { View, Text, Pressable } from "react-native";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";

import { t } from "../ui/tokens";
import { OWNER_SCREENS } from "./owner.routes";
import { OwnerTabs } from "./OwnerTabs";

import { OwnerOrdersScreen } from "../screens/owner/OwnerOrdersScreen";
import { OwnerWalletScreen } from "../screens/owner/OwnerWalletScreen";
import { OwnerNotificationsScreen } from "../screens/owner/OwnerNotificationsScreen";

import { useAuthStore } from "../stores/auth.store";

const Drawer = createDrawerNavigator();

function DrawerLabel({ label }: { label: string }) {
  return <Text style={{ fontWeight: "900", color: t.colors.text }}>{label}</Text>;
}

function OwnerDrawerContent(props: any) {
  const logout = useAuthStore((s) => s.logout);

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <DrawerItemList {...props} />
      </View>

      <View
        style={{
          padding: 16,
          borderTopWidth: 1,
          borderTopColor: t.colors.border,
          backgroundColor: t.colors.surface,
        }}
      >
        <Pressable
          onPress={async () => {
            try {
              props.navigation?.closeDrawer?.();
            } catch {}

            await logout();
          }}
          style={{
            height: 54,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: t.colors.border,
            backgroundColor: t.colors.surface,
          }}
        >
          <Text style={{ fontWeight: "900", color: t.colors.text, fontSize: 15 }}>
            Sair
          </Text>
        </Pressable>
      </View>
    </DrawerContentScrollView>
  );
}

export function OwnerDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <OwnerDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: "front",
        drawerActiveTintColor: t.colors.primary,
        drawerInactiveTintColor: t.colors.text2,
        drawerStyle: { backgroundColor: t.colors.surface },
      }}
    >
      <Drawer.Screen
        name={OWNER_SCREENS.Tabs}
        component={OwnerTabs}
        options={{ drawerLabel: () => <DrawerLabel label="Início" /> }}
      />

      <Drawer.Screen
        name={OWNER_SCREENS.Orders}
        component={OwnerOrdersScreen}
        options={{ drawerLabel: () => <DrawerLabel label="Pedidos" /> }}
      />

      <Drawer.Screen
        name={OWNER_SCREENS.Wallet}
        component={OwnerWalletScreen}
        options={{ drawerLabel: () => <DrawerLabel label="Carteira" /> }}
      />

      <Drawer.Screen
        name={OWNER_SCREENS.Notifications}
        component={OwnerNotificationsScreen}
        options={{ drawerLabel: () => <DrawerLabel label="Notificações" /> }}
      />
    </Drawer.Navigator>
  );
}
