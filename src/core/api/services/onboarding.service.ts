import { api } from "../client";
import { endpoints } from "../endpoints";

export type OnboardingSalonPayload = {
    salon: {
        name: string;
        cnpj: string;
        cep?: string;
        street?: string;
        number?: string;
        district?: string;
        city?: string;
        state?: string;
        complement?: string;
    };
    referralToken?: string;
};

export type OnboardingSalonResponse = {
    user: {
        id: string;
        email: string;
        role: "SALON_OWNER" | "PENDING" | "SELLER" | "ADMIN";
        onboardingStatus: "INCOMPLETE" | "COMPLETE";
        salonId?: string | null;
    };
    salonReferralToken?: string;
};

export const OnboardingService = {
    salon: async (payload: OnboardingSalonPayload) => {
        const res = await api.post<OnboardingSalonResponse>(endpoints.onboarding.salon, payload);
        return res.data;
    },

    seller: async (payload: { referralToken?: string }) => {
        const res = await api.post(endpoints.onboarding.seller, payload);
        return res.data;
    },
};
