export type RefundRequestReason =
  | "PRODUCT_DAMAGED"
  | "WRONG_PRODUCT"
  | "MISSING_ITEM"
  | "DELIVERY_PROBLEM"
  | "OTHER";

export type RefundRequestStatus =
  | "REQUESTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "CANCELED"
  | "REFUNDED"
  | "FAILED";

export type RefundRequest = {
  id: string;
  orderId: string;
  paymentId?: string | null;
  requestedByUserId?: string | null;
  requestedByRole?: string | null;
  reason: RefundRequestReason | string;
  description?: string | null;
  status: RefundRequestStatus | string;
  adminNote?: string | null;
  requestedAt?: string | null;
  reviewedAt?: string | null;
  resolvedAt?: string | null;
  eligibilitySnapshot?: unknown;
};

export const REFUND_STATUS_LABELS: Record<string, string> = {
  REQUESTED: "Aguardando análise",
  UNDER_REVIEW: "Em análise",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
  CANCELED: "Cancelado",
  REFUNDED: "Reembolsado",
  FAILED: "Falha no reembolso",
};

export const REFUND_REASON_LABELS: Record<string, string> = {
  PRODUCT_DAMAGED: "Produto danificado",
  WRONG_PRODUCT: "Produto errado",
  MISSING_ITEM: "Item faltando",
  DELIVERY_PROBLEM: "Problema na entrega",
  OTHER: "Outro motivo",
};
