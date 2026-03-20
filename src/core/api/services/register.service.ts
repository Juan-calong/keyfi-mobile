import { api } from "../client";
import { endpoints } from "../endpoints";

export type RegisterSellerPayload = {
    name: string;
    email: string;
    password: string;
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
        cnaes: string;
        email: string;
        password: string;
    };
    referralToken?: string;
};

export const RegisterService = {
    registerSeller: async (payload: any) =>
        (await api.post(endpoints.auth.registerSeller, payload)).data,

    registerSalon: async (payload: any) =>
        (await api.post(endpoints.auth.registerSalon, payload)).data,

    createSeller: async (payload: any) =>
        (await api.post(endpoints.auth.registerSeller, payload)).data,

    createSalon: async (payload: any) =>
        (await api.post(endpoints.auth.registerSalon, payload)).data,
};
