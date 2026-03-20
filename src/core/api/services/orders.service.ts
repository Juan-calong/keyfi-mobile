// src/core/api/services/orders.service.ts
import { api } from "../client";
import { endpoints } from "../endpoints";

export type CreateOrderPayload = {
    buyerType: "SALON_OWNER";
    items: { productId: string; qty: number }[];
};

export type OrderListItem = {
    id: string;
    code: string;
    buyerType: string;
    status: string;
    paymentStatus: string;
    totalAmount: string;
    createdAt: string;
};


export type OrdersListResponse = { items: OrderListItem[] };

export const OrdersService = {

    list: async (params?: any): Promise<OrdersListResponse> => {
        const res = await api.get(endpoints.orders.list, { params });
        const data = res.data;

        if (Array.isArray(data)) return { items: data as OrderListItem[] };
        return { items: (data?.items ?? []) as OrderListItem[] };
    },

    create: async (payload: CreateOrderPayload) => {
        return (
            await api.post(endpoints.orders.create, payload, {
                headers: { "Idempotency-Key": `order-${Date.now()}` },
            })
        ).data;
    },

    byId: async (orderId: string) => {
        return (await api.get(endpoints.orders.byId(orderId))).data;
    },

    refund: async (orderId: string) => {
        return (
            await api.post(
                endpoints.payments.refund(orderId),
                {},
                {
                    headers: { "Idempotency-Key": `refund-${orderId}-${Date.now()}` },
                }
            )
        ).data;
    },
};
