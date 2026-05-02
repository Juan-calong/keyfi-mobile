import { api } from "../client";
import { endpoints } from "../endpoints";

export type SellerPermissionDTO = {
  id?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED" | "REVOKED" | string;
  salonId?: string;
  salonUUID?: string;
  salonName?: string;
  name?: string;
  code?: string;
  token?: string;
  referralCode?: string;
  sellerCode?: string;
  permissionCode?: string;
  salon?: {
    id?: string;
    uuid?: string;
    name?: string;
    code?: string;
    referralCode?: string;
    cnpj?: string;
  };
  [key: string]: any;
};

export const SellerService = {
  listPermissions: async () => {
    const res = await api.get(endpoints.sellerPermissions);
    return res.data as SellerPermissionDTO[] | { items?: SellerPermissionDTO[]; permissions?: SellerPermissionDTO[] };  },

  requestPermission: async (salonId: string) => {
    const id = String(salonId || "").trim();
    const res = await api.post(
      endpoints.sellerRequestPermission(id),
      {},
      { headers: { "Idempotency-Key": `perm-${id}-${Date.now()}` } }
    );
    return res.data;
  },

  // ✅ Draft do pedido pro salão (agora com cupom opcional)
  createDraftOrderForSalon: async (
    salonId: string,
    items: Array<{ productId: string; qty: number }>,
    couponCode?: string
  ) => {
    const body: any = { items };
    console.log("[DRAFT] POST", `/seller/salons/${salonId}/orders/draft`);
    const code = String(couponCode ?? "").trim();
    console.log("[DRAFT] POST", `/seller/salons/${salonId}/orders/draft`);
    if (code) body.couponCode = code;
    console.log("[DRAFT] POST", `/seller/salons/${salonId}/orders/draft`);
    const res = await api.post(
      endpoints.sellerCreateDraftOrder(salonId),
      body,
      { headers: { "Idempotency-Key": `draft-${salonId}-${Date.now()}` } }
      
    );
    console.log("[DRAFT] POST", `/seller/salons/${salonId}/orders/draft`);
    return res.data;
  },

  createPaymentIntent: async (orderId: string, method: "PIX"  | "CARD" = "PIX") => {
  const id = String(orderId || "").trim();
  if (!id) throw new Error("orderId inválido");

  const url = (endpoints as any)?.paymentsIntent?.(id) ?? `/payments/${id}/intent`;

  const res = await api.post(
    url,
    { method }, // ✅ agora manda body válido
    { headers: { "Idempotency-Key": `intent-${id}-${Date.now()}` } }
  );
  return res.data;
},
};
