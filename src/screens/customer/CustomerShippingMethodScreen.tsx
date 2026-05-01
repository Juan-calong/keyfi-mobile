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

  React.useEffect(() => {
    console.log("[CUSTOMER_SHIPPING_METHOD][ROUTE_PARAMS]", route?.params);
    console.log("[CUSTOMER_SHIPPING_METHOD][DELIVERY_ADDRESS]", deliveryAddress);
    console.log("[CUSTOMER_SHIPPING_METHOD][ZIPCODE_RESOLVED]", zipcode);
    console.log("[CUSTOMER_SHIPPING_METHOD][ITEMS]", items);
  }, [route?.params, deliveryAddress, zipcode, items]);

  return (
    <SharedShippingMethodScreen
      role="CUSTOMER"
      title="Métodos de entrega"
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
        console.log("[SHIPPING_SCREEN][NAV_TO_PAYMENT]", {
          orderId,
          amount,
          hasAmount: Number(amount) > 0,
        });

        nav.navigate(CUSTOMER_SCREENS.PixPayment, {
          orderId,
          amount,
          shippingOption,
        });
      }}
    />
  );
}