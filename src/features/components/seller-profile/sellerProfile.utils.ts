import type { BeneficiaryPixKeyType, WalletPixKeyType } from "./sellerProfile.types";

export function normalizeToken(v?: string | null) {
  return String(v ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

export function onlyDigits(v: string) {
  return String(v ?? "").replace(/\D+/g, "");
}

export function maskCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function maskCnpj(value: string) {
  const digits = onlyDigits(value).slice(0, 14);
  if (!digits) return "";
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function maskPixCpfCnpjByType(type: WalletPixKeyType | BeneficiaryPixKeyType, value: string) {
  if (type === "CPF") return maskCpf(value);
  if (type === "CNPJ") return maskCnpj(value);
  return onlyDigits(value);
}

export function trimOrUndefined(v: string) {
  const x = String(v ?? "").trim();
  return x ? x : undefined;
}

export function normalizeWalletPixKey(type: WalletPixKeyType, key: string) {
  const raw = String(key ?? "").trim();

  if (type === "CPF") return onlyDigits(raw);
  if (type === "CNPJ") return onlyDigits(raw);

    return raw;
}

export function validateWalletPixKey(type: WalletPixKeyType, key: string) {
  const k = normalizeWalletPixKey(type, key);

  if (!k) return "Informe a chave PIX.";

  if (type === "CPF") {
    if (k.length !== 11) return "CPF inválido (11 dígitos).";
  }

  if (type === "CNPJ") {
    if (k.length !== 14) return "CNPJ inválido (14 dígitos).";
  }

  return null;
}

export function normalizeBeneficiaryPixKey(type: BeneficiaryPixKeyType, key: string) {
  const raw = String(key ?? "").trim();

  if (type === "CPF") return onlyDigits(raw);
  if (type === "CNPJ") return onlyDigits(raw);

  return raw;
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "").trim()
  );
}

export function hasCpfOrCnpjLength(value: string) {
  const digits = onlyDigits(value || "");
  return digits.length === 11 || digits.length === 14;
}

export function hasPhoneLength(value: string) {
  const digits = onlyDigits(value || "");
  return digits.length >= 10 && digits.length <= 13;
}

export function validateBeneficiaryPixKey(type: BeneficiaryPixKeyType, key: string) {
  const k = normalizeBeneficiaryPixKey(type, key);

  if (!k) return "Informe a chave PIX do beneficiário.";

  if (type === "CPF") {
    if (onlyDigits(k).length !== 11) return "Chave PIX CPF deve ter 11 dígitos.";
  }

  if (type === "CNPJ") {
    if (onlyDigits(k).length !== 14) return "Chave PIX CNPJ deve ter 14 dígitos.";
  }

  if (type !== "CPF" && type !== "CNPJ") return "A chave PIX do beneficiário deve ser CPF ou CNPJ.";
  
  return null;
}

export function formatDateTimeBR(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleString("pt-BR");
}

export function formatDateOnlyBR(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR");
}

export function isoToDateInput(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function isFuture(iso?: string | null) {
  if (!iso) return false;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return false;
  return d.getTime() > Date.now();
}