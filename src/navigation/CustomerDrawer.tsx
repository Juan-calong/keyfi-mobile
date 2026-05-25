import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
} from "@react-navigation/drawer";
import Icon from "react-native-vector-icons/Ionicons";

import { CUSTOMER_SCREENS } from "./customer.routes";
import { CustomerTabs } from "./customerTabs";

import { CustomerOrdersScreen } from "../screens/customer/CustomerOrdersScreen";
import { CustomerProfileMe } from "../screens/customer/CustomerProfileMe";
import { CustomerNotificationsScreen } from "../screens/customer/CustomerNotificationsScreen";
import { useAuthStore } from "../stores/auth.store";

const Drawer = createDrawerNavigator();

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

function CustomerDrawerContent(props: any) {
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
        {/* Header - Perfil */}
        <View style={s.headerCard}>
          <View style={s.avatar}>
            <Icon name="person-outline" size={24} color={ICON_COLOR} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Minha conta</Text>
            <Text style={s.headerSubtitle}>Acesse pedidos e perfil</Text>
          </View>
        </View>

        {/* Título de Seção - Agora em Branco */}
        <Text style={s.sectionLabel}>Navegação</Text>

        {/* Menu de Navegação - Sem fundo escurinho abraçando os itens */}
        <View style={s.menuCard}>
          <DrawerMenuItem
            icon="home-outline"
            label="Início"
            onPress={() => props.navigation.navigate(CUSTOMER_SCREENS.Tabs)}
          />
          
          <View style={s.divider} />

          <DrawerMenuItem
            icon="receipt-outline"
            label="Pedidos"
            onPress={() => props.navigation.navigate(CUSTOMER_SCREENS.Orders)}
          />

          <View style={s.divider} />

          <DrawerMenuItem
            icon="notifications-outline"
            label="Notificações"
            onPress={() => props.navigation.navigate(CUSTOMER_SCREENS.Notifications)}
          />

          <View style={s.divider} />

          <DrawerMenuItem
            icon="person-circle-outline"
            label="Minha conta"
            onPress={() => props.navigation.navigate(CUSTOMER_SCREENS.Me)}
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

export function CustomerDrawer() {
  return (
    <Drawer.Navigator
      initialRouteName={CUSTOMER_SCREENS.Tabs}
      drawerContent={(props) => <CustomerDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: "front",
        overlayColor: "rgba(0,0,0,0.6)",
        drawerStyle: {
          backgroundColor: DRAWER_BG,
          width: 304,
        },
        sceneStyle: {
          backgroundColor: "transparent",
        },
      }}
    >
      <Drawer.Screen name={CUSTOMER_SCREENS.Tabs} component={CustomerTabs} />
      <Drawer.Screen name={CUSTOMER_SCREENS.Orders} component={CustomerOrdersScreen} />
      <Drawer.Screen name={CUSTOMER_SCREENS.Notifications} component={CustomerNotificationsScreen} />
      <Drawer.Screen name={CUSTOMER_SCREENS.Me} component={CustomerProfileMe} />
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
    color: "#FFFFFF", // Alterado para branco puro
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 16, // Mais espaço entre a label e o primeiro item
    marginLeft: 16,   // Alinhado com o texto do menu
  },

  menuCard: {
    // Todo o backgroundColor e as bordas que formavam o "escurinho" foram removidos
    paddingHorizontal: 0, 
  },

  menuItem: {
    minHeight: 58, 
    borderRadius: 14, // Borda um pouco mais sutil ao clicar
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ITEM_BG,
  },

  divider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginHorizontal: 16,
    marginVertical: 10, // Adicionado espaçamento vertical maior para separar os itens
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