import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { LoginScreen } from "../screens/auth/LoginScreen";
import { RegisterSellerScreen } from "../screens/auth/RegisterSellerScreen";
import { RegisterSalonScreen } from "../screens/auth/RegisterSalonScreen";
import { RegisterChooseRoleScreen } from "../screens/auth/RegisterChooseRoleScreen";
import { RegisterCustomerScreen } from "../screens/auth/RegisterCustomerScreen";
import { VerifyEmailScreen } from "../screens/auth/VerifyEmailScreen";

export type AuthStackParamList = {
  Login: { email?: string; message?: string } | undefined;
  RegisterChooseRole: undefined;
  RegisterSeller: undefined;
  RegisterSalon: undefined;
  RegisterCustomer: undefined;
    VerifyEmail: {
    email: string;
    source?: "register" | "login";
  };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="RegisterChooseRole" component={RegisterChooseRoleScreen} />
      <Stack.Screen name="RegisterSeller" component={RegisterSellerScreen} />
      <Stack.Screen name="RegisterSalon" component={RegisterSalonScreen} />
      <Stack.Screen name="RegisterCustomer" component={RegisterCustomerScreen} />
    </Stack.Navigator>
  );
}
