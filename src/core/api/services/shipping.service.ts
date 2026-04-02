import { api } from "../client";
import { endpoints } from "../endpoints";
import type { ShippingQuoteResponse } from "../../../features/components/shipping/shipping.types";

type QuoteItem = {
  productId: string;
  qty: number;
};

type QuoteInput = {
  items: QuoteItem[];
  zipcode: string;
  declaredValue?: number;
};

export const ShippingService = {
  async quote(input: QuoteInput) {
    const payload = {
      ...input,
      zipcode: String(input.zipcode || "").replace(/\D/g, ""),
    };

    const { data } = await api.post<ShippingQuoteResponse>(
      endpoints.shipping.quote,
      payload
    );

    return data;
  },
};