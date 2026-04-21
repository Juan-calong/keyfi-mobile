import React from "react";
import {
  CommonActions,
  RouteProp,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
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

  const { items, couponCode, deliveryAddress } = route.params;

  React.useEffect(() => {
    console.log("[OWNER_CHECKOUT_ADDRESS][MOUNT]", {
      params: route.params,
      itemsLength: items?.length ?? 0,
      couponCode,
    });
  }, [route.params, items, couponCode]);

  const handleContinue = (nextDeliveryAddress: CheckoutAddressValues) => {
    const normalizedZipcode = onlyDigits(
      nextDeliveryAddress?.zipcode || nextDeliveryAddress?.zipCode
    );

    console.log("[OWNER_CHECKOUT_ADDRESS][CONTINUE]", {
      items,
      couponCode,
      deliveryAddress: nextDeliveryAddress,
      normalizedZipcode,
    });

    navigation.dispatch(
      CommonActions.navigate({
        name: OWNER_SCREENS.ShippingMethod,
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
      subtitle="Confirme o endereço para calcular o frete"
      profileMode="owner"
      items={items}
      initialAddress={deliveryAddress}
      initialCouponCode={couponCode}
      onContinue={handleContinue}
    />
  );
}