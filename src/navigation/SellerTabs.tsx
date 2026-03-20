// src/navigation/SellerTabs.tsx
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Image, View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SellerLinksScreen } from "../screens/seller/SellerLinksScreen";
import { SellerWalletScreen } from "../screens/seller/SellerWalletScreen";
import { SellerProfileScreen } from "../screens/seller/SellerProfileScreen";

import linkIcon from "../assets/icons/link.png";
import walletIcon from "../assets/icons/wallet.png";
import profileIcon from "../assets/icons/profile.png";

import { SELLER_SCREENS } from "./seller.routes";

const Tab = createBottomTabNavigator();

function TabIcon({ focused, source }: { focused: boolean; source: any }) {
  const tintColor = focused ? "#000000" : "rgba(0,0,0,0.35)";
  return (
    <View style={s.iconWrap}>
      <Image source={source} style={[s.icon, { tintColor }]} resizeMode="contain" />
    </View>
  );
}

export function SellerTabs() {
  const insets = useSafeAreaInsets();

  const BASE_HEIGHT = 56;
  const PAD_TOP = 10;
  const extraBottom = Math.max(insets.bottom, 10);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          height: BASE_HEIGHT + extraBottom,
          paddingTop: PAD_TOP,
          paddingBottom: extraBottom,
          backgroundColor: "#FFFFFF",
          borderTopColor: "rgba(0,0,0,0.12)",
          borderTopWidth: StyleSheet.hairlineWidth,
        },
      }}
    >
      <Tab.Screen
        name={SELLER_SCREENS.Links}
        component={SellerLinksScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} source={linkIcon} /> }}
      />

      <Tab.Screen
        name={SELLER_SCREENS.Wallet}
        component={SellerWalletScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} source={walletIcon} /> }}
      />

      <Tab.Screen
        name={SELLER_SCREENS.Profile}
        component={SellerProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} source={profileIcon} /> }}
      />
    </Tab.Navigator>
  );
}

const s = StyleSheet.create({
  iconWrap: { width: 44, height: 34, alignItems: "center", justifyContent: "center" },
  icon: { width: 22, height: 22 },
});
