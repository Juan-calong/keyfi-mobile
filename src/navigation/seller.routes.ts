export const SELLER_SCREENS = {
  Tabs: "SELLER_TABS",

  Links: "SELLER_LINKS",
  Wallet: "SELLER_WALLET",
  Profile: "SELLER_PROFILE",
  ReferralApply: "SELLER_REFERRAL_APPLY",

  Buy: "SELLER_BUY",
  Cart: "SELLER_CART",

  ProductDetails: "SELLER_PRODUCT_DETAILS",

  CartRequests: "SELLER_CART_REQUESTS",
  CartRequestDetails: "SELLER_CART_REQUEST_DETAILS",
} as const;

export type SellerStackParamList = {
  [SELLER_SCREENS.Tabs]: undefined;

  [SELLER_SCREENS.Links]: undefined;
  [SELLER_SCREENS.Wallet]: undefined;
  [SELLER_SCREENS.Profile]: undefined;
  [SELLER_SCREENS.ReferralApply]: undefined;

  [SELLER_SCREENS.Buy]: undefined;

  [SELLER_SCREENS.Cart]: {
    salonId: string;
    items?: Array<{ productId: string; qty: number }>;
  };

  [SELLER_SCREENS.ProductDetails]: { productId: string } | { product: any };

  [SELLER_SCREENS.CartRequests]: undefined;
  [SELLER_SCREENS.CartRequestDetails]: { requestId: string };
};