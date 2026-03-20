// core/api/services/owner.sellers.service.ts
import { api } from "../client";
import { endpoints } from "../endpoints";

export type SalonSellerPermissionRequest = {
    id: string;
    salonId: string;
    sellerId: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "REVOKED" | string;
    createdAt: string;
    decidedAt?: string | null;
    seller?: { id: string; email?: string; name?: string } | null;
};

export const OwnerSellersService = {
    listRequests: async () => {
        const res = await api.get(endpoints.salonPermissionRequests);
        return res.data;
    },

    inviteByEmail: async (email: string) => {
        const res = await api.post(
            endpoints.salonInviteSellerByEmail,
            { email },
            { headers: { "Idempotency-Key": `invite-${Date.now()}` } }
        );
        return res.data;
    },

    decide: async (requestId: string, action: "approve" | "reject") => {
        const res = await api.patch(
            endpoints.salonDecidePermissionRequest(requestId),
            { action },
            { headers: { "Idempotency-Key": `decide-${requestId}-${Date.now()}` } }
        );
        return res.data;
    },
};
