import React from "react";
import {
  CommonActions,
  RouteProp,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import {
  CUSTOMER_SCREENS,
  CustomerStackParamList,
} from "../../navigation/customer.routes";
import {
  SharedCheckoutAddressScreen,
  CheckoutAddressValues,
} from "../../features/checkout/SharedCheckoutAddressScreen";

type Nav = NativeStackNavigationProp<
  CustomerStackParamList,
  typeof CUSTOMER_SCREENS.CheckoutAddress
>;

type R = RouteProp<
  CustomerStackParamList,
  typeof CUSTOMER_SCREENS.CheckoutAddress
>;

function onlyDigits(value: string | undefined | null) {
  return String(value ?? "").replace(/\D/g, "");
}

export function CustomerCheckoutAddressScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();

 const { items, couponCode, deliveryAddress } = route.params;

  React.useEffect(() => {
    console.log("[CUSTOMER_CHECKOUT_ADDRESS][MOUNT]", {
      params: route.params,
      itemsLength: items?.length ?? 0,
      couponCode,
    });
  }, [route.params, items, couponCode]);

  const handleContinue = (nextDeliveryAddress: CheckoutAddressValues) => {
    const normalizedZipcode = onlyDigits(
      nextDeliveryAddress?.zipcode || nextDeliveryAddress?.zipCode
    );

    console.log("[CUSTOMER_CHECKOUT_ADDRESS][CONTINUE]", {
      items,
      couponCode,
      deliveryAddress,
      normalizedZipcode,
    });

    navigation.dispatch(
      CommonActions.navigate({
        name: CUSTOMER_SCREENS.ShippingMethod,
        params: {
          items,
          couponCode,
          deliveryAddress: nextDeliveryAddress,
          zipcode: normalizedZipcode,
          zipCode: normalizedZipcode,
        },
        merge: true,
      })
    );
  };

  return (
    <SharedCheckoutAddressScreen
      title="Endereço de entrega"
      subtitle="Confirme seu endereço para calcular o frete"
      profileMode="customer"
      items={items}
      initialAddress={deliveryAddress}
      initialCouponCode={couponCode}
      onContinue={handleContinue}
    />
  );
}