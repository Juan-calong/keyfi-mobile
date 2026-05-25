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

// --- PALETA DARK PREMIUM ---
const DRAWER_BG = "#141414";       
const CARD_BG = "#1F1F1F";         
const ITEM_BG = "transparent";     
const ITEM_BG_PRESSED = "#2A2A2A"; 
const ICON_BG = "#2A2A2A";         
const TEXT_DARK = "#F2F2F2";       
const TEXT_MUTED = "#8E8E93";      
const BORDER = "#2C2C2C";          
const DIVIDER = "#2C2C2C";         
const ICON_COLOR = "#E5E5EA";      

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
        pressed && { backgroundColor: ITEM_BG_PRESSED },
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
        {/* Header - Painel da Loja */}
        <View style={s.headerCard}>
          <View style={s.avatar}>
            <Icon name="storefront-outline" size={24} color={ICON_COLOR} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Painel</Text>
            <Text style={s.headerSubtitle}>Pedidos, carteira e conta</Text>
          </View>
        </View>

        {/* Título de Seção */}
        <Text style={s.sectionLabel}>Navegação</Text>

        {/* Menu de Navegação - Sem fundo envolvente */}
        <View style={s.menuCard}>
          <DrawerMenuItem
            icon="home-outline"
            label="Início"
            onPress={() => props.navigation.navigate(OWNER_SCREENS.Tabs)}
          />

          <View style={s.divider} />

          <DrawerMenuItem
            icon="receipt-outline"
            label="Pedidos"
            onPress={() => props.navigation.navigate(OWNER_SCREENS.Orders)}
          />

          <View style={s.divider} />

          <DrawerMenuItem
            icon="wallet-outline"
            label="Carteira"
            onPress={() => props.navigation.navigate(OWNER_SCREENS.Wallet)}
          />

          <View style={s.divider} />

          <DrawerMenuItem
            icon="notifications-outline"
            label="Notificações"
            onPress={() => props.navigation.navigate(OWNER_SCREENS.Notifications)}
          />

          <View style={s.divider} />

          <DrawerMenuItem
            icon="person-circle-outline"
            label="Minha conta"
            onPress={() => props.navigation.navigate(OWNER_SCREENS.Me)}
          />
        </View>

        {/* Footer - Sair */}
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
              pressed && { backgroundColor: ITEM_BG_PRESSED },
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
        overlayColor: "rgba(0,0,0,0.6)", // Overlay escurecido
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
    marginBottom: 28,
  },

  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ICON_BG,
    marginRight: 14,
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: TEXT_DARK,
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "400",
    color: TEXT_MUTED,
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 16,
    marginLeft: 16,
  },

  menuCard: {
    paddingHorizontal: 0, 
  },

  menuItem: {
    minHeight: 58, 
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ITEM_BG,
  },

  divider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginHorizontal: 16,
    marginVertical: 10,
  },

  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ICON_BG,
    marginRight: 14,
  },

  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
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
    borderColor: BORDER,
    backgroundColor: CARD_BG,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  logoutText: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: "600",
    color: TEXT_DARK,
  },
});