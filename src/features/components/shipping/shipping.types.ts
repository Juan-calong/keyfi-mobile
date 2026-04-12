export type DeliveryWeekday =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type ShippingCarrier =
  | "BRASPRESS"
  | "CORREIOS"
  | "LOCAL_DELIVERY"
  | (string & {});

export type ShippingOption = {
  quoteId?: string;
  id?: string;

  carrier: ShippingCarrier;
  serviceCode: string;
  serviceName: string;

  price: number;
  originalPrice?: number;
  discount?: number;
  finalPrice?: number;

  deadlineDays?: number | null;

  deliveryMode?: string;
  isLocalDelivery?: boolean;

  minSubtotal?: number | null;
  freeShippingMinSubtotal?: number | null;
  qualifiesMinSubtotal?: boolean | null;
  qualifiesFreeShipping?: boolean | null;
  missingSubtotalForMin?: number | null;

  nextDeliveryInDays?: number | null;
  deliveryCountdownLabel?: string | null;
  nextDeliveryDate?: string | null;
  deliveryWeekdays?: DeliveryWeekday[] | null;

  zipcode?: string;
  expiresAt?: string | null;

  meta?: any;
};

export type ShippingQuoteOption = ShippingOption & {
  label?: string;
  description?: string | null;
  available?: boolean;
  reason?: string | null;
};

export type ShippingQuoteResponse = {
  ok: boolean;
  options: ShippingQuoteOption[];
  errors?: string[];
};