import React from "react";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import {
  OWNER_SCREENS,
  OwnerStackParamList,
} from "../../navigation/owner.routes";
import {
  SharedCheckoutAddressScreen,
  CheckoutAddressValues,
} from "../../features/checkout/SharedCheckoutAddressScreen";

type Nav = NativeStackNavigationProp<
  OwnerStackParamList,
  typeof OWNER_SCREENS.CheckoutAddress
>;

type R = RouteProp<
  OwnerStackParamList,
  typeof OWNER_SCREENS.CheckoutAddress
>;

function onlyDigits(value: string | undefined | null) {
  return String(value ?? "").replace(/\D/g, "");
}

export function OwnerCheckoutAddressScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();

  const { items, couponCode } = route.params;

  React.useEffect(() => {
    console.log("[OWNER_CHECKOUT_ADDRESS][MOUNT]", {
      params: route.params,
      itemsLength: items?.length ?? 0,
      couponCode,
    });
  }, [route.params, items, couponCode]);

  const handleContinue = (deliveryAddress: CheckoutAddressValues) => {
    const normalizedZipcode = onlyDigits(
      deliveryAddress?.zipcode || deliveryAddress?.zipCode
    );

    console.log("[OWNER_CHECKOUT_ADDRESS][CONTINUE]", {
      items,
      couponCode,
      deliveryAddress,
      normalizedZipcode,
    });

    navigation.navigate(
      OWNER_SCREENS.ShippingMethod,
      {
        items,
        couponCode,
        deliveryAddress,

        // mando achatado também para não depender do próximo wrapper
        zipcode: normalizedZipcode,
        zipCode: normalizedZipcode,
      } as any
    );
  };

  return (
    <SharedCheckoutAddressScreen
      title="Endereço de entrega"
      subtitle="Confirme o endereço para calcular o frete"
      profileMode="owner"
      items={items}
      initialCouponCode={couponCode}
      onContinue={handleContinue}
    />
  );
}