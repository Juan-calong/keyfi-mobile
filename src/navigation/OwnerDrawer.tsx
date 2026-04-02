import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
} from "@react-navigation/drawer";
import Icon from "react-native-vector-icons/Ionicons";

import { OWNER_SCREENS } from "./owner.routes";
import { OwnerTabs } from "./OwnerTabs";

import { OwnerOrdersScreen } from "../screens/owner/OwnerOrdersScreen";
import { OwnerWalletScreen } from "../screens/owner/OwnerWalletScreen";
import { OwnerNotificationsScreen } from "../screens/owner/OwnerNotificationsScreen";
import { ProfileMeScreen } from "../screens/ProfileMeScreen";

import { useAuthStore } from "../stores/auth.store";

const Drawer = createDrawerNavigator();

const DRAWER_BG = "#F4F2EE";
const CARD_BG = "#FBF9F6";
const ITEM_BG = "#F8F5F1";
const ITEM_BG_PRESSED = "#EEE8E1";
const ICON_BG = "#ECE7E0";
const TEXT_DARK = "#2F2A24";
const TEXT_MUTED = "#7B746B";
const BORDER = "#E2DBD2";
const ICON_COLOR = "#8A8177";

function DrawerMenuItem({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.menuItem,
        pressed && { backgroundColor: ITEM_BG_PRESSED, opacity: 0.96 },
      ]}
    >
      <View style={s.iconWrap}>
        <Icon name={icon} size={18} color={ICON_COLOR} />
      </View>

      <Text style={s.menuLabel}>{label}</Text>
    </Pressable>
  );
}

function OwnerDrawerContent(props: any) {
  const logout = useAuthStore((s) => s.logout);

  return (
    <DrawerContentScrollView
      {...props}
      bounces={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={s.scrollContent}
      style={s.scroll}
    >
      <View style={s.container}>
        <View style={s.headerCard}>
          <View style={s.avatar}>
            <Icon name="storefront-outline" size={24} color={ICON_COLOR} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Painel</Text>
            <Text style={s.headerSubtitle}>Pedidos, carteira e conta</Text>
          </View>
        </View>

        <View style={s.menuCard}>
          <DrawerMenuItem
            icon="home-outline"
            label="Início"
            onPress={() => props.navigation.navigate(OWNER_SCREENS.Tabs)}
          />

          <DrawerMenuItem
            icon="receipt-outline"
            label="Pedidos"
            onPress={() => props.navigation.navigate(OWNER_SCREENS.Orders)}
          />

          <DrawerMenuItem
            icon="wallet-outline"
            label="Carteira"
            onPress={() => props.navigation.navigate(OWNER_SCREENS.Wallet)}
          />

          <DrawerMenuItem
            icon="notifications-outline"
            label="Notificações"
            onPress={() => props.navigation.navigate(OWNER_SCREENS.Notifications)}
          />

          <DrawerMenuItem
            icon="person-circle-outline"
            label="Minha conta"
            onPress={() => props.navigation.navigate(OWNER_SCREENS.Me)}
          />
        </View>

        <View style={s.footer}>
          <Pressable
            onPress={async () => {
              try {
                props.navigation?.closeDrawer?.();
              } catch {}
              await logout();
            }}
            style={({ pressed }) => [
              s.logoutButton,
              pressed && { backgroundColor: ITEM_BG_PRESSED, opacity: 0.96 },
            ]}
          >
            <Icon name="log-out-outline" size={18} color={TEXT_DARK} />
            <Text style={s.logoutText}>Sair</Text>
          </Pressable>
        </View>
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
        overlayColor: "rgba(0,0,0,0.18)",
        drawerStyle: {
          backgroundColor: DRAWER_BG,
          width: 304,
        },
        sceneStyle: {
          backgroundColor: "transparent",
        },
      }}
    >
      <Drawer.Screen
        name={OWNER_SCREENS.Tabs}
        component={OwnerTabs}
        options={{ title: "Início" }}
      />

      <Drawer.Screen
        name={OWNER_SCREENS.Orders}
        component={OwnerOrdersScreen}
        options={{ title: "Pedidos" }}
      />

      <Drawer.Screen
        name={OWNER_SCREENS.Wallet}
        component={OwnerWalletScreen}
        options={{ title: "Carteira" }}
      />

      <Drawer.Screen
        name={OWNER_SCREENS.Notifications}
        component={OwnerNotificationsScreen}
        options={{ title: "Notificações" }}
      />

      <Drawer.Screen
        name={OWNER_SCREENS.Me}
        component={ProfileMeScreen}
        options={{ title: "Minha conta" }}
      />
    </Drawer.Navigator>
  );
}

const s = StyleSheet.create({
  scroll: {
    backgroundColor: DRAWER_BG,
  },

  scrollContent: {
    flexGrow: 1,
    backgroundColor: DRAWER_BG,
    padding: 16,
  },

  container: {
    flex: 1,
  },

  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 24,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 18,
  },

  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAE4DC",
    borderWidth: 1,
    borderColor: "#D8D0C5",
    marginRight: 14,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: TEXT_DARK,
  },

  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "700",
    color: TEXT_MUTED,
  },

  menuCard: {
    backgroundColor: CARD_BG,
    borderRadius: 24,
    padding: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },

  menuItem: {
    minHeight: 58,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ITEM_BG,
    marginBottom: 8,
  },

  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ICON_BG,
    marginRight: 12,
  },

  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: TEXT_DARK,
  },

  footer: {
    marginTop: "auto",
    paddingTop: 18,
  },

  logoutButton: {
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DCD5CB",
    backgroundColor: "#FCFAF7",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  logoutText: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: "900",
    color: TEXT_DARK,
  },
});