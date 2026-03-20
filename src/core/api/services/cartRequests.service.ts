import { api } from "../client";
import { endpoints } from "../endpoints";

export type CartItemInput = {
  productId: string;
  qty: number;
};

export type CartPreviewBody = {
  items: CartItemInput[];
  couponCode?: string;
  shipping?: number;
  salonId?: string;
};

export type CartPreviewResponse = {
  ok: boolean;
  canCheckout: boolean;
  unavailable: Array<{
    productId: string;
    qty: number;
    reason: string;
  }>;
  warnings?: Array<{
    code: string;
    message: string;
  }>;
  summary: {
    subtotalBase: string;
    discountProducts: string;
    subtotalAfterPromos: string;
    coupon: null | {
      code: string;
      type: string;
      value: string;
    };
    couponDiscount: string;
    shipping: string;
    total: string;
  };
  items: Array<{
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
    lineQuantityDiscount: string;
    linePromoDiscount: string;
    lineCouponDiscount: string;
    quantityDiscount: null | {
      applied: true;
      minQuantity: number;
      discountType: string;
      discountValue: string;
      lineDiscount: string;
    };
    promo: null | {
      id: string;
      type: string;
      value: string;
      appliesTo: string;
      endsAt?: string | null;
      priority?: number;
    };
  }>;
};

export type SalonCartRequestItem = {
  id: string;
  productId: string;
  qty: number;
  unitPriceBase: string;
  unitPrice: string;
  total: string;
  promoId: string | null;
  promoMeta: any;
  product: null | {
    id: string;
    name: string;
    sku?: string | null;
  };
};

export type SalonCartRequest = {
  id: string;
  salonId: string;
  sellerId: string;
  createdByUserId: string | null;
  status: "DRAFT" | "SENT" | "APPROVED" | "REJECTED" | "EXPIRED" | "CANCELED";
  note: string | null;

  subtotalBase: string;
  subtotalAfterPromos: string;
  couponCode: string | null;
  couponDiscount: string;
  totalAmount: string;

  decidedAt: string | null;
  decidedByUserId: string | null;
  orderId: string | null;
  createdAt: string;
  updatedAt: string;

  salon: null | {
    id: string;
    name: string;
    email?: string | null;
  };

  seller: null | {
    id: string;
    userId: string | null;
    name: string | null;
    email: string | null;
    phone: string | null;
  };

  items: SalonCartRequestItem[];
};

export type CreateSellerCartRequestBody = {
  items: CartItemInput[];
  couponCode?: string;
  note?: string;
};

export type CreateSellerCartRequestResponse = {
  ok: boolean;
  warnings?: Array<{
    code: string;
    message: string;
  }>;
  request: SalonCartRequest;
};

export type ListCartRequestsResponse = {
  ok: boolean;
  items: SalonCartRequest[];
};

export type GetCartRequestResponse = {
  ok: boolean;
  request: SalonCartRequest;
};

export type ApproveCartRequestResponse = {
  ok: boolean;
  orderId: string;
  code: string;
  total: string;
  paymentUrl: string;
};

export async function previewCart(body: CartPreviewBody) {
  const { data } = await api.post<CartPreviewResponse>(endpoints.cart.preview, body);
  return data;
}

export async function createSellerCartRequest(
  salonId: string,
  body: CreateSellerCartRequestBody
) {
  const { data } = await api.post<CreateSellerCartRequestResponse>(
    endpoints.sellerCartRequests.create(salonId),
    body
  );
  return data;
}

export async function listSellerCartRequests(status?: string) {
  const { data } = await api.get<ListCartRequestsResponse>(
    endpoints.sellerCartRequests.list,
    {
      params: status ? { status } : undefined,
    }
  );
  return data;
}

export async function getSellerCartRequestById(id: string) {
  const { data } = await api.get<GetCartRequestResponse>(
    endpoints.sellerCartRequests.byId(id)
  );
  return data;
}

export async function sendSellerCartRequest(id: string) {
  const { data } = await api.post<GetCartRequestResponse>(
    endpoints.sellerCartRequests.send(id)
  );
  return data;
}

export async function listSalonCartRequests(status?: string) {
  const { data } = await api.get<ListCartRequestsResponse>(
    endpoints.salonCartRequests.list,
    {
      params: status ? { status } : undefined,
    }
  );
  return data;
}

export async function getSalonCartRequestById(id: string) {
  const { data } = await api.get<GetCartRequestResponse>(
    endpoints.salonCartRequests.byId(id)
  );
  return data;
}

export async function approveSalonCartRequest(id: string) {
  const { data } = await api.patch<ApproveCartRequestResponse>(
    endpoints.salonCartRequests.approve(id)
  );
  return data;
}

export async function rejectSalonCartRequest(id: string) {
  const { data } = await api.patch<{ ok: boolean }>(
    endpoints.salonCartRequests.reject(id)
  );
  return data;
}