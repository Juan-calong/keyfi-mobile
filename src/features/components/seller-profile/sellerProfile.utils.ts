import type { BeneficiaryPixKeyType, WalletPixKeyType } from "./sellerProfile.types";

export function normalizeToken(v?: string | null) {
  return String(v ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

export function onlyDigits(v: string) {
  return String(v ?? "").replace(/\D+/g, "");
}

export function trimOrUndefined(v: string) {
  const x = String(v ?? "").trim();
  return x ? x : undefined;
}

export function normalizeWalletPixKey(type: WalletPixKeyType, key: string) {
  const raw = String(key ?? "").trim();

  if (type === "EMAIL") return raw.toLowerCase();
  if (type === "PHONE") return onlyDigits(raw);
  if (type === "CPF") return onlyDigits(raw);
  if (type === "CNPJ") return onlyDigits(raw);

  return raw.replace(/\s+/g, "");
}

export function validateWalletPixKey(type: WalletPixKeyType, key: string) {
  const k = normalizeWalletPixKey(type, key);

  if (!k) return "Informe a chave PIX.";

  if (type === "EMAIL") {
    if (!k.includes("@") || !k.includes(".")) return "E-mail inválido.";
  }

  if (type === "PHONE") {
    if (k.length < 10 || k.length > 13) return "Telefone inválido (somente números).";
  }

  if (type === "CPF") {
    if (k.length !== 11) return "CPF inválido (11 dígitos).";
  }

  if (type === "CNPJ") {
    if (k.length !== 14) return "CNPJ inválido (14 dígitos).";
  }

  if (type === "EVP") {
    if (k.length < 32) return "Chave EVP parece curta demais.";
  }

  return null;
}

export function normalizeBeneficiaryPixKey(type: BeneficiaryPixKeyType, key: string) {
  const raw = String(key ?? "").trim();

  if (type === "EMAIL") return raw.toLowerCase();
  if (type === "PHONE") return onlyDigits(raw);
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

  if (type === "EMAIL") {
    if (!k.includes("@") || !k.includes(".")) return "Chave PIX EMAIL inválida.";
  }

  if (type === "PHONE") {
    if (!hasPhoneLength(k)) return "Chave PIX PHONE inválida.";
  }

  if (type === "CPF") {
    if (onlyDigits(k).length !== 11) return "Chave PIX CPF deve ter 11 dígitos.";
  }

  if (type === "CNPJ") {
    if (onlyDigits(k).length !== 14) return "Chave PIX CNPJ deve ter 14 dígitos.";
  }

  if (type === "RANDOM") {
    if (!isUuid(k)) return "Chave PIX RANDOM deve ser UUID.";
  }

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