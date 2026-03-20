import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { SellerTabs } from "./SellerTabs";
import { SELLER_SCREENS, SellerStackParamList } from "./seller.routes";

import { SellerCartScreen } from "../screens/seller/SellerCartScreen";
import { SellerCartCheckoutScreen } from "../screens/seller/SellerCartCheckoutScreen";
import { SellerCartRequestsScreen } from "../screens/seller/SellerCartRequestsScreen";
import { SellerCartRequestDetailsScreen } from "../screens/seller/SellerCartRequestDetailsScreen";

const Stack = createNativeStackNavigator<SellerStackParamList>();

export function SellerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={SELLER_SCREENS.Tabs} component={SellerTabs} />

      <Stack.Screen name={SELLER_SCREENS.Buy} component={SellerCartScreen} />
      <Stack.Screen
        name={SELLER_SCREENS.Cart}
        component={SellerCartCheckoutScreen}
      />

      <Stack.Screen
        name={SELLER_SCREENS.CartRequests}
        component={SellerCartRequestsScreen}
      />
      <Stack.Screen
        name={SELLER_SCREENS.CartRequestDetails}
        component={SellerCartRequestDetailsScreen}
      />
    </Stack.Navigator>
  );
}