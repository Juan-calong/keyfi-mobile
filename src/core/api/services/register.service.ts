import { api } from "../client";
import { endpoints } from "../endpoints";
import { createIdempotencyKey } from "../idempotency";

export type RegisterSellerPayload = {
  name: string;
  email: string;
  password: string;
  cnpj: string;
  referralToken?: string;
};

export type RegisterSalonPayload = {
  owner: {
    name: string;
    email: string;
    password: string;
  };
  salon: {
    name: string;
    legalName?: string;
    tradeName?: string;
    cnpj: string;
    icmsTaxpayerType?: "CONTRIBUTOR" | "EXEMPT" | "NON_CONTRIBUTOR";
    hasStateRegistration?: boolean;
    stateRegistration?: string | null;
    cep: string;
    street: string;
    number: string;
    district: string;
    city: string;
    state: string;
    complement?: string;
  };
  referralToken?: string;
};

export const RegisterService = {
  registerSeller: async (payload: RegisterSellerPayload) =>
    (await api.post(endpoints.auth.registerSeller, payload)).data,

  registerSalon: async (payload: RegisterSalonPayload, idempotencyKey?: string) =>
    (
      await api.post(endpoints.auth.registerSalon, payload, {
        headers: { "Idempotency-Key": idempotencyKey || createIdempotencyKey("auth-register-salon") },
      })
    ).data,

  createSeller: async (payload: RegisterSellerPayload) =>
    (await api.post(endpoints.auth.registerSeller, payload)).data,

  createSalon: async (payload: RegisterSalonPayload, idempotencyKey?: string) =>
    (
      await api.post(endpoints.auth.registerSalon, payload, {
        headers: { "Idempotency-Key": idempotencyKey || createIdempotencyKey("auth-register-salon") },
      })
    ).data,
};
