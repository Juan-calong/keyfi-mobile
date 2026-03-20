import { api } from "../client";
import { endpoints } from "../endpoints";

export const AdminService = {
    salesReport: () => api.get(endpoints.reports.sales).then((r) => r.data),
    commissionsReport: () => api.get(endpoints.reports.commissions).then((r) => r.data),

    refundOrder: (orderId: string) =>
        api
            .post(
                endpoints.orders.refund(orderId), // ✅ rota real
                {},
                { headers: { "Idempotency-Key": `refund-${orderId}-${Date.now()}` } }
            )
            .then((r) => r.data),

    updatePayoutStatus: (payoutId: string, payload: { status: "APPROVED" | "PAID" | "REJECTED" }) =>
        api.patch(endpoints.admin.payoutById(payoutId), payload).then((r) => r.data),
};
