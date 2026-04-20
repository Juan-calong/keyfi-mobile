import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  Text,
  View,
  StyleSheet,
  Platform,
  Image,
  ImageSourcePropType,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Ionicons";

import { CUSTOMER_SCREENS } from "./customer.routes";

import { CustomerHomeScreen } from "../screens/customer/CustomerHomeScreen";
import { CustomerBuyScreen } from "../screens/customer/CustomerBuyScreen";
import { CustomerCartScreen } from "../screens/customer/CustomerCartScreen";
import { CustomerFavoritesScreen } from "../screens/customer/CustomerFavoritesScreen";

import homeIcon from "../assets/icons/home.png";
import cartIcon from "../assets/icons/cart.png";

import homeIconBlack from "../assets/icons/casa-black.png";
import cartIconBlack from "../assets/icons/carrinho-black.png";

const Tab = createBottomTabNavigator();
const GOLD = "#B8943C";
const SOFT_BG = "#FFFFFF";

function TabBarBg() {
  return (
   <View style={[StyleSheet.absoluteFill, { backgroundColor: SOFT_BG }]} />
  );
}

function TabItem({
  icon,
  title,
  focused,
}: {
  icon: ImageSourcePropType;
  title: string;
  focused: boolean;
}) {
  return (
    <View style={s.item}>
      <Image
        source={icon}
        resizeMode="contain"
        style={[
          s.tabIcon,
          !focused && s.tabIconOff,
          focused && { transform: [{ scale: 1.08 }] },
        ]}
      />
      <Text style={[s.label, focused ? s.labelOn : s.labelOff]}>{title}</Text>
    </View>
  );
}

function ShopTabItem({ focused }: { focused: boolean }) {
  return (
    <View style={s.item}>
      <Icon
        name={focused ? "bag" : "bag-outline"}
        size={22}
        color={focused ? "#000" : GOLD}
        style={focused ? { transform: [{ scale: 1.08 }] } : undefined}
      />
      <Text style={[s.label, focused ? s.labelOn : s.labelOff]}>Shop</Text>
    </View>
  );
}

function FavoritesTabItem({ focused }: { focused: boolean }) {
  return (
    <View style={s.item}>
      <Icon
        name={focused ? "heart" : "heart-outline"}
        size={22}
        color={focused ? "#000" : GOLD}
        style={focused ? { transform: [{ scale: 1.08 }] } : undefined}
      />
      <Text style={[s.label, focused ? s.labelOn : s.labelOff]}>Favs</Text>
    </View>
  );
}

export function CustomerTabs() {
  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets.bottom, 10);
  const tabBarHeight = 68 + safeBottom;

  return (
    <Tab.Navigator
      initialRouteName={CUSTOMER_SCREENS.Home}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarBackground: () => <TabBarBg />,
        tabBarItemStyle: s.tabBarItem,
        tabBarStyle: [
          s.tabBar,
          {
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: tabBarHeight,
            paddingTop: 8,
            paddingBottom: safeBottom,
            paddingHorizontal: 10,
          },
        ],
      }}
    >
      <Tab.Screen
        name={CUSTOMER_SCREENS.Home}
        component={CustomerHomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabItem
              focused={focused}
              icon={focused ? homeIconBlack : homeIcon}
              title="Home"
            />
          ),
        }}
      />

      <Tab.Screen
        name={CUSTOMER_SCREENS.Buy}
        component={CustomerBuyScreen}
        options={{
          tabBarIcon: ({ focused }) => <ShopTabItem focused={focused} />,
        }}
      />

      <Tab.Screen
        name={CUSTOMER_SCREENS.Favorites}
        component={CustomerFavoritesScreen}
        options={{
          tabBarIcon: ({ focused }) => <FavoritesTabItem focused={focused} />,
        }}
      />

      <Tab.Screen
        name={CUSTOMER_SCREENS.Cart}
        component={CustomerCartScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabItem
              focused={focused}
              icon={focused ? cartIconBlack : cartIcon}
              title="Cart"
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const s = StyleSheet.create({
  tabBar: {
    backgroundColor: "transparent",
    borderTopColor: "rgba(184,148,60,0.35)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: "hidden",
    ...(Platform.OS === "ios"
      ? {
          shadowColor: "transparent",
          shadowOpacity: 0,
          shadowRadius: 0,
          shadowOffset: { width: 0, height: 0 },
        }
      : { elevation: 0 }),
  },

  tabBarItem: {
    justifyContent: "center",
    alignItems: "center",
  },

  item: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    width: 64,
    height: 44,
    backgroundColor: "transparent",
  },

  tabIcon: {
    width: 22,
    height: 22,
  },

  tabIconOff: {
    tintColor: GOLD,
  },

  label: {
    fontSize: 11,
    letterSpacing: 0.2,
  },

  labelOn: {
    color: "#000",
    fontSize: 11.5,
    fontWeight: "900",
  },

  labelOff: {
    color: GOLD,
    fontSize: 11,
    fontWeight: "800",
  },
});