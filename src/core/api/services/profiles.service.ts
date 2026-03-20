// src/core/api/services/profiles.service.ts
import { api } from "../client";
import { endpoints } from "../endpoints";

export type MeDTO = {
  id: string;
  role: "SALON_OWNER" | "SELLER" | "ADMIN" | "CUSTOMER" | "PENDING";
  onboardingStatus?: string;
  // pode ter mais campos, não precisa tipar tudo agora
};

export const ProfilesService = {
  me: async (): Promise<MeDTO> => {
    const res = await api.get(endpoints.profiles.me);
    return res.data;
  },
};