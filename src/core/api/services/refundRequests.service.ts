import { api } from "../client";
import { endpoints } from "../endpoints";
import type { RefundRequest, RefundRequestReason } from "./refundRequests.types";

export const RefundRequestsService = {
  listMine: async (): Promise<RefundRequest[]> => {
    const res = await api.get(endpoints.refundRequests.mine);
    const data = res.data;
    if (Array.isArray(data)) return data as RefundRequest[];
    if (Array.isArray(data?.items)) return data.items as RefundRequest[];
    return [];
  },

  create: async (orderId: string, payload: { reason: RefundRequestReason; description?: string }) => {
    const res = await api.post(endpoints.refundRequests.create(orderId), payload);
    return res.data as RefundRequest;
  },
};
