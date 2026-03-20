import { api } from "../client";
import { endpoints } from "../endpoints";

export type Product = {
  id: string;
  sku: string;
  name: string;
  price: string;
  description?: string | null;
  active: boolean;

  // se vier no backend, deixa opcional (não quebra)
  categoryId?: string | null;
  primaryImageUrl?: string | null;
  images?: { url: string; isPrimary?: boolean | null; sort?: number | null }[];
};

export type ProductsListResponse = { items: Product[] };

export type CreateProductPayload = {
  sku: string;
  name: string;
  price: string;
  description?: string;
  active?: boolean;
};

export type PromoDTO = {
  id: string;
  type: string;
  value: string;

  sellerValue?: string | null;
  salonValue?: string | null;

  appliesTo?: "SELLER" | "SALON" | "BOTH";
  appliesToSeller?: boolean;
  appliesToSalon?: boolean;
};

export type PromoRow = { promo: PromoDTO; product: Product };
export type PromosActiveResponse = { items: PromoRow[] } | PromoRow[];

export const ProductsService = {
  list: async (params?: { take?: number; active?: "true" | "false" }) => {
    const res = await api.get<ProductsListResponse>(endpoints.products.list, { params });
    return res.data;
  },

  create: async (payload: CreateProductPayload) => {
    const res = await api.post(endpoints.products.create, payload, {
      headers: { "Idempotency-Key": `product-${payload.sku}-${Date.now()}` },
    });
    return res.data;
  },

promosActive: async (params?: { take?: number; appliesTo?: "SELLER" | "SALON" | "BOTH" }) => {
  const res = await api.get(endpoints.products.promosActive, { params });
  return res.data;
},
};
