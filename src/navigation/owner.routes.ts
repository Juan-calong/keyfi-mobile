export const OWNER_SCREENS = {
  Root: "OwnerRoot",
  Tabs: "OwnerTabs",

  Home: "OwnerHome",
  Buy: "OwnerBuy",
  Cart: "OwnerCart",
  Me: "OwnerMe",

  Orders: "OwnerOrders",
  Wallet: "OwnerWallet",
  Notifications: "OwnerNotifications",

  OrderDetails: "OwnerOrderDetails",
  PixPayment: "OwnerPixPayment",

  CardTokenize: "OwnerCardTokenize",
  CardEntry: "OwnerCardEntry",
  MercadoPagoCardEntry: "OwnerMercadoPagoCardEntry",  

  BoletoPayerForm: "OwnerBoletoPayerForm",
  BoletoWebView: "OwnerBoletoWebView",

  CheckoutAddress: "OwnerCheckoutAddress",
  ShippingMethod: "OwnerShippingMethod",

  OwnerSellers: "OwnerSellers",
  DebugCreate: "DebugCreate",
  ApplyReferral: "ApplyReferral",
  ProductDetails: "OwnerProductDetails",
  Promos: "OwnerPromos",
  ProfileDetails: "OwnerProfileDetails",
  SalonToken: "OwnerSalonToken",
  PixKey: "OwnerPixKey",
  Referrals: "OwnerReferrals",
  Favorites: "OwnerFavorites",
  CartRequests: "OwnerCartRequests",
  CartRequestDetails: "OwnerCartRequestDetails",
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

export type OwnerStackParamList = {
  [OWNER_SCREENS.Root]: undefined;
  [OWNER_SCREENS.Tabs]: undefined;

  [OWNER_SCREENS.Home]: undefined;
  [OWNER_SCREENS.Buy]: { highlightProductId?: string; addProductId?: string } | undefined;
  [OWNER_SCREENS.Cart]: undefined;
  [OWNER_SCREENS.Me]: undefined;

  [OWNER_SCREENS.Orders]: undefined;
  [OWNER_SCREENS.Wallet]: undefined;
  [OWNER_SCREENS.Notifications]: undefined;

  [OWNER_SCREENS.OrderDetails]: { orderId: string };

  [OWNER_SCREENS.CheckoutAddress]: {
    items: { productId: string; qty: number }[];
    couponCode?: string;
    deliveryAddress?: CheckoutAddressPayload;
    zipcode?: string;
    zipCode?: string;
  };

  [OWNER_SCREENS.ShippingMethod]: {
    items: { productId: string; qty: number }[];
    couponCode?: string;
    deliveryAddress?: CheckoutAddressPayload;
    zipcode?: string;
    zipCode?: string;
  };

  [OWNER_SCREENS.PixPayment]:
    | { orderId: string; amount?: number }
    | { id: string; amount?: number };

  [OWNER_SCREENS.CardTokenize]: { orderId: string; amount?: number };
  [OWNER_SCREENS.CardEntry]: {
    orderId: string;
    amount?: number;
    cardToken: string;
    brand?: string;
    cardBin?: string;
    cardLast4Digits?: string;
  };

  [OWNER_SCREENS.MercadoPagoCardEntry]: {
    orderId: string;
    amount?: number;
    publicKey?: string | null;
  };

  [OWNER_SCREENS.BoletoPayerForm]: { orderId: string; defaultPayer?: any };
  [OWNER_SCREENS.BoletoWebView]: { url: string };

  [OWNER_SCREENS.OwnerSellers]: undefined;
  [OWNER_SCREENS.DebugCreate]: undefined;
  [OWNER_SCREENS.ApplyReferral]: undefined;
  [OWNER_SCREENS.ProductDetails]: { productId: string } | { product: any };
  [OWNER_SCREENS.Promos]: undefined;
  [OWNER_SCREENS.ProfileDetails]: undefined;
  [OWNER_SCREENS.SalonToken]: { token: string };
  [OWNER_SCREENS.PixKey]: undefined;
  [OWNER_SCREENS.Referrals]: undefined;

  [OWNER_SCREENS.CartRequests]: undefined;
  [OWNER_SCREENS.Favorites]: undefined;
  [OWNER_SCREENS.CartRequestDetails]: { requestId: string };
};