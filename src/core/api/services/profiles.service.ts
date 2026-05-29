// src/core/api/services/profiles.service.ts
import { api } from "../client";
import { endpoints } from "../endpoints";

export type MeDTO = {
  id: string;
  role: "SALON_OWNER" | "SELLER" | "ADMIN" | "CUSTOMER" | "PENDING";
  onboardingStatus?: string;
  salon?: {
    name?: string;
    legalName?: string;
    tradeName?: string;
    cnpj?: string;
    email?: string;
    icmsTaxpayerType?: "CONTRIBUTOR" | "EXEMPT" | "NON_CONTRIBUTOR" | null;
    hasStateRegistration?: boolean | null;
    stateRegistration?: string | null;
    cep?: string;
    street?: string;
    number?: string;
    district?: string;
    city?: string;
    state?: string;
    complement?: string;
  } | null;
};

export const ProfilesService = {
  me: async (): Promise<MeDTO> => {
    const res = await api.get(endpoints.profiles.me);
    return res.data;
  },
};
