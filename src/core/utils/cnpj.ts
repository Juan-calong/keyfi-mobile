import { api } from "../api/client";
import { endpoints } from "../api/endpoints";

export type CnpjLookupResponse = {
  cnpj: string;
  companyName: string;
  tradeName: string;
  status: string;
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
  zipcode: string;
  complement: string;
  cnae: string;
  secondaryCnaes?: string[];
};

export async function fetchCompanyByCnpj(cnpj: string) {
  const cleanCnpj = String(cnpj).replace(/\D/g, "");
  const response = await api.get<CnpjLookupResponse>(endpoints.utils.cnpj(cleanCnpj));
  return response.data;
}