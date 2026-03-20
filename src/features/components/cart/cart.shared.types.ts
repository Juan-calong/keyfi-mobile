export type CartItem = {
  productId: string;
  qty: number;
};

export type QuantityDiscountPreview = {
  applied?: boolean;
  minQuantity?: number;
  discountType?: "PERCENT" | "FIXED";
  discountValue?: string | number;
  lineDiscount?: string | number;
};

export type CartPreviewItem = {
  productId: string;
  qty: number;
  product: {
    id: string;
    name: string;
    sku?: string | null;
    imageUrl?: string | null;
  };

  unitPriceBase: string;
  unitPriceFinal: string;
  lineBase: string;
  lineFinal: string;

  linePromoDiscount?: string;
  lineCouponDiscount?: string;
  lineQuantityDiscount?: string;

  quantityDiscount?: QuantityDiscountPreview;
  promo?: any | null;
};

export type CartPreviewResp = {
  ok: boolean;

  canCheckout?: boolean;
  unavailable?: Array<{
    productId: string;
    qty: number;
    reason: "NOT_FOUND" | "INACTIVE";
  }>;

  summary: {
    subtotalBase: string;
    discountProducts: string;
    subtotalAfterPromos: string;

    coupon: null | { code: string; type: string; value: string };
    couponDiscount: string;

    shipping: string;
    total: string;
  };

  items: CartPreviewItem[];
};

export type BannerState = null | {
  title: string;
  message: string;
};