import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { OwnerOrderDetailsScreen } from "../screens/owner/OwnerOrderDetailsScreen";
import { OwnerPixPaymentScreen } from "../screens/owner/OwnerPixPaymentScreen";
import { DebugCreateAccountsScreen } from "../screens/debug/DebugCreateAccountsScreen";
import { OwnerSellersScreen } from "../screens/owner/OwnerSellersScreen";
import { OwnerApplyReferralScreen } from "../screens/owner/OwnerLinkByToken.screen";
import { OwnerCardEntryScreen } from "../screens/owner/OwnerCardEntryScreen";
import { OwnerPromosScreen } from "../screens/owner/OwnerPromosScreen";
import { OwnerProductDetailsScreen } from "../screens/owner/OwnerProductDetailsScreen";
import { OwnerBoletoPayerFormScreen } from "../screens/owner/OwnerBoletoPayerFormScreen";
import { OWNER_SCREENS, OwnerStackParamList } from "./owner.routes";
import { OwnerDrawer } from "./OwnerDrawer";
import { OwnerProfileDetailsScreen } from "../screens/owner/ProfileDetailsScreen";
import { OwnerSalonTokenScreen } from "../screens/owner/OwnerSalonTokenScreen";
import { OwnerPixKeyScreen } from "../screens/owner/OwnerPixKeyScreen";
import { OwnerWalletScreen } from "../screens/owner/OwnerWalletScreen";
import { OwnerBoletoWebViewScreen } from "../screens/owner/OwnerBoletoWebViewScreen";
import { CardTokenizeWebViewScreen } from "../screens/payments/CardTokenizeWebViewScreen";
import { OwnerShippingMethodScreen } from "../screens/owner/OwnerShippingMethodScreen";
import { OwnerCheckoutAddressScreen } from "../screens/owner/OwnerCheckoutAddressScreen";
// NOVO
import { OwnerCartRequestsScreen } from "../screens/owner/OwnerCartRequestsScreen";
import { OwnerCartRequestDetailsScreen } from "../screens/owner/OwnerCartRequestDetailsScreen";
import { OwnerReferralLinksScreen } from "../screens/owner/OwnerReferralLinksScreen";

const Stack = createNativeStackNavigator<OwnerStackParamList>();

export function OwnerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={OWNER_SCREENS.Root}>
      <Stack.Screen name={OWNER_SCREENS.Root} component={OwnerDrawer} />
      <Stack.Screen name={OWNER_SCREENS.SalonToken} component={OwnerSalonTokenScreen} />
      <Stack.Screen name={OWNER_SCREENS.PixKey} component={OwnerPixKeyScreen} />
      <Stack.Screen name={OWNER_SCREENS.ProfileDetails} component={OwnerProfileDetailsScreen} />
      <Stack.Screen name={OWNER_SCREENS.Referrals} component={OwnerReferralLinksScreen} />
      <Stack.Screen name={OWNER_SCREENS.OrderDetails} component={OwnerOrderDetailsScreen} />
      <Stack.Screen name={OWNER_SCREENS.Wallet} component={OwnerWalletScreen} />
      <Stack.Screen name={OWNER_SCREENS.PixPayment} component={OwnerPixPaymentScreen} />

      <Stack.Screen name={OWNER_SCREENS.CardTokenize} component={CardTokenizeWebViewScreen} />
      <Stack.Screen name={OWNER_SCREENS.CardEntry} component={OwnerCardEntryScreen} />

      <Stack.Screen name={OWNER_SCREENS.OwnerSellers} component={OwnerSellersScreen} />
      <Stack.Screen name={OWNER_SCREENS.DebugCreate} component={DebugCreateAccountsScreen} />
      <Stack.Screen name={OWNER_SCREENS.BoletoWebView} component={OwnerBoletoWebViewScreen} />
      <Stack.Screen name={OWNER_SCREENS.ApplyReferral} component={OwnerApplyReferralScreen} />
      <Stack.Screen name={OWNER_SCREENS.ProductDetails} component={OwnerProductDetailsScreen} />
      <Stack.Screen name={OWNER_SCREENS.Promos} component={OwnerPromosScreen} />
      <Stack.Screen name={OWNER_SCREENS.BoletoPayerForm} component={OwnerBoletoPayerFormScreen} />

      <Stack.Screen
        name={OWNER_SCREENS.CartRequests}
        component={OwnerCartRequestsScreen}
      />
      <Stack.Screen
        name={OWNER_SCREENS.CartRequestDetails}
        component={OwnerCartRequestDetailsScreen}
      />
      <Stack.Screen
  name={OWNER_SCREENS.CheckoutAddress}
  component={OwnerCheckoutAddressScreen}
/>

<Stack.Screen
  name={OWNER_SCREENS.ShippingMethod}
  component={OwnerShippingMethodScreen}
/>

    </Stack.Navigator>
  );
}