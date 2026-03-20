import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SellerPendingScreen } from "../screens/seller/SellerPendingScreen";

type Params = {
  SellerPending: undefined;
};

const Stack = createNativeStackNavigator<Params>();

export function SellerPendingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SellerPending" component={SellerPendingScreen} />
    </Stack.Navigator>
  );
}