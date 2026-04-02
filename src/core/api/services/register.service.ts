import { api } from "../client";
import { endpoints } from "../endpoints";

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
    cnpj: string;
    email: string;
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

  registerSalon: async (payload: RegisterSalonPayload) =>
    (await api.post(endpoints.auth.registerSalon, payload)).data,

  createSeller: async (payload: RegisterSellerPayload) =>
    (await api.post(endpoints.auth.registerSeller, payload)).data,

  createSalon: async (payload: RegisterSalonPayload) =>
    (await api.post(endpoints.auth.registerSalon, payload)).data,
};