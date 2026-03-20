import React from "react";
import { View, Text, Pressable } from "react-native";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";

import { t } from "../ui/tokens";
import { CUSTOMER_SCREENS } from "./customer.routes";
import { CustomerTabs } from "./customerTabs";

import { CustomerOrdersScreen } from "../screens/customer/CustomerOrdersScreen";
import { CustomerProfileMe } from "../screens/customer/CustomerProfileMe";
import { useAuthStore } from "../stores/auth.store";

const Drawer = createDrawerNavigator();

function DrawerLabel({ label }: { label: string }) {
  return <Text style={{ fontWeight: "900", color: t.colors.text }}>{label}</Text>;
}

function CustomerDrawerContent(props: any) {
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

export function CustomerDrawer() {
  return (
    <Drawer.Navigator
      initialRouteName={CUSTOMER_SCREENS.Tabs}
      drawerContent={(props) => <CustomerDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: "front",
        drawerActiveTintColor: t.colors.primary,
        drawerInactiveTintColor: t.colors.text2,
        drawerStyle: { backgroundColor: t.colors.surface },
      }}
    >
      <Drawer.Screen
        name={CUSTOMER_SCREENS.Tabs}
        component={CustomerTabs}
        options={{ drawerLabel: () => <DrawerLabel label="Início" /> }}
      />

      <Drawer.Screen
        name={CUSTOMER_SCREENS.Orders}
        component={CustomerOrdersScreen}
        options={{ drawerLabel: () => <DrawerLabel label="Pedidos" /> }}
      />

      <Drawer.Screen
        name={CUSTOMER_SCREENS.Me}
        component={CustomerProfileMe}
        options={{ drawerLabel: () => <DrawerLabel label="Perfil" /> }}
      />
    </Drawer.Navigator>
  );
}