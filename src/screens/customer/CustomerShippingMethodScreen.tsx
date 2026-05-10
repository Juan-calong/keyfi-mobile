import React from "react";
import { useNavigation } from "@react-navigation/native";
import { CUSTOMER_SCREENS } from "../../navigation/customer.routes";
import { SharedShippingMethodScreen } from "../../features/components/shipping/SharedShippingMethodScreen";

function onlyDigits(value: string | undefined | null) {
  return String(value ?? "").replace(/\D/g, "");
}

export function CustomerShippingMethodScreen({ route }: any) {
  const nav = useNavigation<any>();

  const items = React.useMemo(() => route?.params?.items || [], [route?.params?.items]);
  const couponCode = route?.params?.couponCode;
  const deliveryAddress = route?.params?.deliveryAddress;

  const zipcode = onlyDigits(
    route?.params?.zipcode ||
      route?.params?.zipCode ||
      deliveryAddress?.zipcode ||
      deliveryAddress?.zipCode
  );

  return (
    <SharedShippingMethodScreen
      role="CUSTOMER"
      title="Opções de envio"
      items={items}
      couponCode={couponCode}
      deliveryAddress={deliveryAddress}
      zipcode={zipcode}
      zipCode={zipcode}
      onBack={() => nav.goBack?.()}
      onEditAddress={() =>
        nav.navigate(CUSTOMER_SCREENS.CheckoutAddress, {
          items,
          couponCode,
          deliveryAddress,
          zipcode,
          zipCode: zipcode,
        })
      }
onContinue={({ orderId, amount, shippingOption }) => {
  nav.navigate(CUSTOMER_SCREENS.PixPayment, {
    orderId,
    amount,
    shippingOption,
  });
}}
    />
  );
}