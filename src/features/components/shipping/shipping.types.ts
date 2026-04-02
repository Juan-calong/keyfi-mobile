export type ShippingCarrier = "BRASPRESS" | "CORREIOS";

export type ShippingOption = {
  carrier: ShippingCarrier;
  serviceCode: string;
  serviceName: string;
  price: number;
  deadlineDays?: number | null;
  zipcode?: string;
  meta?: any;
};

export type ShippingQuoteOption = ShippingOption & {
  id?: string;
  label?: string;
  description?: string | null;
  available?: boolean;
  reason?: string | null;
};

export type ShippingQuoteResponse = {
  ok: boolean;
  options: ShippingQuoteOption[];
};