import { api } from "../api/client";
import { endpoints } from "../api/endpoints";

export type CepLookupResponse = {
  cep: string;
  street: string;
  district: string;
  city: string;
  state: string;
  ibge?: string;
};

export function onlyDigits(value = "") {
  return String(value).replace(/\D/g, "");
}

export function formatCep(value = "") {
  const digits = onlyDigits(value).slice(0, 8);

  if (digits.length <= 5) {
    return digits;
  }

  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function isCepComplete(value = "") {
  return onlyDigits(value).length === 8;
}

export async function fetchAddressByCep(cep: string) {
  const cleanCep = onlyDigits(cep);

  const response = await api.get<CepLookupResponse>(endpoints.utils.cep(cleanCep));

  return response.data;
}