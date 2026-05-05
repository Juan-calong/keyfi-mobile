export const CUSTOMER_SCREENS = {
  Root: "CustomerRoot",
  Tabs: "CustomerTabs",

  Home: "CustomerHome",
  Buy: "CustomerBuy",
  Cart: "CustomerCart",
  Favorites: "CustomerFavorites",

  Me: "CustomerMe",
  ProfileDetails: "CustomerProfileDetails",

  Orders: "CustomerOrders",
  Notifications: "CustomerNotifications",

  OrderDetails: "CustomerOrderDetails",

  PixPayment: "CustomerPixPayment",

  CardEntry: "CustomerCardEntry",
  CardTokenize: "CustomerCardTokenize",
  MercadoPagoCardEntry: "CustomerMercadoPagoCardEntry",

  BoletoPayerForm: "CustomerBoletoPayerForm",
  BoletoWebView: "CustomerBoletoWebView",
  ApplyReferral: "CustomerApplyReferral",

  ProductDetails: "CustomerProductDetails",
  ProductComments: "CustomerProductComments",

  CheckoutAddress: "CustomerCheckoutAddress",
  ShippingMethod: "CustomerShippingMethod",
  PaymentSuccess: "CustomerPaymentSuccess",
} as const;

export type CheckoutAddressPayload = {
  zipCode: string;
  streetName: string;
  streetNumber: string;
  neighborhood: string;
  city: string;
  federalUnit: string;
  complement?: string;
};

export type CustomerStackParamList = {
  [CUSTOMER_SCREENS.Root]: undefined;
  [CUSTOMER_SCREENS.Tabs]: undefined;

  [CUSTOMER_SCREENS.Home]: undefined;
  [CUSTOMER_SCREENS.Buy]:
    | { highlightProductId?: string; addProductId?: string; showPromos?: boolean }
    | undefined;

  [CUSTOMER_SCREENS.Cart]: undefined;
  [CUSTOMER_SCREENS.Favorites]: undefined;

  [CUSTOMER_SCREENS.Me]: undefined;
  [CUSTOMER_SCREENS.ProfileDetails]: undefined;

  [CUSTOMER_SCREENS.Orders]: undefined;
  [CUSTOMER_SCREENS.Notifications]: undefined;

  [CUSTOMER_SCREENS.OrderDetails]: { orderId: string; showPaymentSuccessOnPaid?: boolean };
  [CUSTOMER_SCREENS.PaymentSuccess]: { orderId?: string; orderCode?: string; total?: number | string } | undefined;

  [CUSTOMER_SCREENS.CheckoutAddress]: {
    items: { productId: string; qty: number }[];
    couponCode?: string;
    deliveryAddress?: CheckoutAddressPayload;
    zipcode?: string;
    zipCode?: string;
  };

  [CUSTOMER_SCREENS.ShippingMethod]: {
    items: { productId: string; qty: number }[];
    couponCode?: string;
    deliveryAddress?: CheckoutAddressPayload;
    zipcode?: string;
    zipCode?: string;
  };

  [CUSTOMER_SCREENS.PixPayment]:
    | { orderId: string; amount?: number }
    | { id: string; amount?: number };

  [CUSTOMER_SCREENS.CardEntry]: {
    orderId: string;
    amount?: number;
    cardToken: string;
    brand?: string;
    cardBin?: string;
    cardLast4Digits?: string;
  };

  [CUSTOMER_SCREENS.CardTokenize]: {
    orderId: string;
    amount?: number;
    returnTo?: "CardEntry" | "PixPayment";
  };

    [CUSTOMER_SCREENS.MercadoPagoCardEntry]: {
    orderId: string;
    amount?: number;
    publicKey?: string | null;
  };

  [CUSTOMER_SCREENS.BoletoPayerForm]: {
    orderId: string;
    defaultPayer?: any;
  };

  [CUSTOMER_SCREENS.BoletoWebView]: { url: string };
  [CUSTOMER_SCREENS.ApplyReferral]: undefined;

  [CUSTOMER_SCREENS.ProductDetails]: { productId: string } | { product: any };

  [CUSTOMER_SCREENS.ProductComments]: {
    productId: string;
    productName: string;
    productPrice: number;
    productImage?: string | null;
    relatedItems: any[];
  };
};