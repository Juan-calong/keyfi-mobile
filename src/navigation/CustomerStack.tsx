import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { CUSTOMER_SCREENS, CustomerStackParamList } from "./customer.routes";
import { CustomerDrawer } from "./CustomerDrawer";

import { CustomerOrderDetailsScreen } from "../screens/customer/CustomerOrderDetailsScreen";
import { CustomerPixPaymentScreen } from "../screens/customer/CustomerPixPaymentScreen";
import { CustomerCardEntryScreen } from "../screens/customer/CustomerCardEntryScreen";
import { CustomerBoletoPayerFormScreen } from "../screens/customer/CustomerBoletoPayerFormScreen";
import { CustomerBoletoWebViewScreen } from "../screens/customer/CustomerBoletoWebViewScreen";
import { CustomerProductDetailsScreen } from "../screens/customer/CustomerProductDetailsScreen";
import { CardTokenizeWebViewScreen } from "../screens/payments/CardTokenizeWebViewScreen";
import { CustomerProfileMeScreen } from "../screens/customer/CustomerProfileMeScreen";
import { CustomerShippingMethodScreen } from "../screens/customer/CustomerShippingMethodScreen";
import { CustomerCheckoutAddressScreen } from "../screens/customer/CustomerCheckoutAddressScreen";
import { ApplyReferralScreen } from "../screens/ApplyReferralScreen";
import { MercadoPagoCardEntryScreen } from "../screens/payments/MercadoPagoCardEntryScreen";
import { PaymentSuccessScreen } from "../screens/payments/PaymentSuccessScreen";


const Stack = createNativeStackNavigator<CustomerStackParamList>();

export function CustomerStack() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={CUSTOMER_SCREENS.Root}
    >
      <Stack.Screen name={CUSTOMER_SCREENS.Root} component={CustomerDrawer} />

      <Stack.Screen
        name={CUSTOMER_SCREENS.ProfileDetails}
        component={CustomerProfileMeScreen}
      />

      <Stack.Screen
        name={CUSTOMER_SCREENS.CardTokenize}
        component={CardTokenizeWebViewScreen}
      />

      <Stack.Screen
        name={CUSTOMER_SCREENS.OrderDetails}
        component={CustomerOrderDetailsScreen}
      />

      <Stack.Screen
        name={CUSTOMER_SCREENS.PixPayment}
        component={CustomerPixPaymentScreen}
      />

      <Stack.Screen
        name={CUSTOMER_SCREENS.CardEntry}
        component={CustomerCardEntryScreen}
      />

        <Stack.Screen
        name={CUSTOMER_SCREENS.MercadoPagoCardEntry}
        component={MercadoPagoCardEntryScreen}
      />

      <Stack.Screen
        name={CUSTOMER_SCREENS.BoletoWebView}
        component={CustomerBoletoWebViewScreen}
      />

      <Stack.Screen
        name={CUSTOMER_SCREENS.ApplyReferral}
        component={ApplyReferralScreen}
      />

      <Stack.Screen
        name={CUSTOMER_SCREENS.ProductDetails}
        component={CustomerProductDetailsScreen}
      />
      <Stack.Screen
  name={CUSTOMER_SCREENS.CheckoutAddress}
  component={CustomerCheckoutAddressScreen}
/>

      <Stack.Screen
        name={CUSTOMER_SCREENS.PaymentSuccess}
        component={PaymentSuccessScreen}
      />

<Stack.Screen
  name={CUSTOMER_SCREENS.ShippingMethod}
  component={CustomerShippingMethodScreen}
/>
    </Stack.Navigator>
  );
}