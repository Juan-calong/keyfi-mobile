import type { LegacyPixKeyType, PixKeyType } from "./sellerProfile.types";

export function normalizeToken(v?: string | null) {
  return String(v ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

export function onlyDigits(v: string) {
  return String(v ?? "").replace(/\D+/g, "");
}

export function maskCpf(value: string) {
  const digits = onlyDigits(value);
  if (!digits) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  const formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  return `${formatted}${digits.slice(11)}`;
}

export function maskCnpj(value: string) {
  const digits = onlyDigits(value);
  if (!digits) return "";
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  const formatted = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
  return `${formatted}${digits.slice(14)}`;
}

export function pixKeyTypeFromLegacy(type?: LegacyPixKeyType | string | null): PixKeyType | null {
  if (type === "EVP") return "RANDOM";
  return type === "CPF" || type === "CNPJ" || type === "EMAIL" || type === "PHONE" || type === "RANDOM"
    ? type
    : null;
}

export function formatPixKeyForDisplay(type: PixKeyType, value: string) {
  if (type === "CPF") return maskCpf(value);
  if (type === "CNPJ") return maskCnpj(value); // Numeric CNPJ UI only; backend remains authoritative for future alphanumeric CNPJ.
  if (type === "PHONE") {
    const digits = onlyDigits(value);
    const national = digits.startsWith("55") && (digits.length === 12 || digits.length === 13) ? digits.slice(2) : digits;
    if (national.length <= 2) return national ? `(${national}` : "";
    const localLength = national.length >= 11 ? 5 : 4;
    const coreLength = 2 + localLength + 4;
    if (national.length <= 2 + localLength) return `(${national.slice(0, 2)}) ${national.slice(2)}`;
    const formatted = `(${national.slice(0, 2)}) ${national.slice(2, 2 + localLength)}-${national.slice(2 + localLength, coreLength)}`;
    return `${formatted}${national.slice(coreLength)}`;
  }
  return value;
}

export function normalizePixKeyForSubmit(type: PixKeyType, value: string) {
  const raw = String(value ?? "").trim();
  if (type === "CPF" || type === "CNPJ") return onlyDigits(raw);
  if (type === "EMAIL") return raw.toLowerCase();
  if (type === "PHONE") {
    const digits = onlyDigits(raw);
    if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
    if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) return `+${digits}`;
    return raw;
  }
  return raw;
}

export function validatePixKeyForUx(type: PixKeyType, value: string) {
  const key = normalizePixKeyForSubmit(type, value);
  if (!key) return "Informe a chave PIX.";
  if (type === "CPF" && key.length !== 11) return "CPF inválido (11 dígitos).";
  if (type === "CNPJ" && key.length !== 14) return "CNPJ inválido (14 dígitos).";
  if (type === "EMAIL" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)) return "E-mail inválido.";
  if (type === "PHONE" && !/^\+55[1-9]\d(?:\d{8}|\d{9})$/.test(key)) return "Informe um telefone brasileiro válido com DDD.";
  return null;
}

export function getPixKeyboardType(type: PixKeyType): "numeric" | "email-address" | "phone-pad" | "default" {
  if (type === "CPF" || type === "CNPJ") return "numeric";
  if (type === "EMAIL") return "email-address";
  if (type === "PHONE") return "phone-pad";
  return "default";
}

export function getPixPlaceholder(type: PixKeyType) {
  return ({ CPF: "000.000.000-00", CNPJ: "00.000.000/0000-00", EMAIL: "voce@exemplo.com", PHONE: "(11) 99999-9999", RANDOM: "Chave aleatória" } as const)[type];
}

export function trimOrUndefined(v: string) {
  const x = String(v ?? "").trim();
  return x ? x : undefined;
}

export const normalizeWalletPixKey = normalizePixKeyForSubmit;
export const validateWalletPixKey = validatePixKeyForUx;
export const normalizeBeneficiaryPixKey = normalizePixKeyForSubmit;

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

export const validateBeneficiaryPixKey = validatePixKeyForUx;

export function buildWalletDestinationPayload(input: {
  pixKeyType: PixKeyType;
  pixKey: string;
  normalizedPixKey: string;
  holderName: string;
  holderDoc: string;
  bankName: string;
  notes: string;
}) {
  const err = validatePixKeyForUx(input.pixKeyType, input.pixKey);
  if (err) throw new Error(err);
  const payload = {
    pixKeyType: input.pixKeyType,
    pixKey: input.normalizedPixKey,
    holderName: String(input.holderName ?? "").trim(),
    holderDoc: onlyDigits(input.holderDoc ?? ""),
    bankName: String(input.bankName ?? "").trim(),
    notes: String(input.notes ?? "").trim() || null,
  };
  if (!payload.holderName) throw new Error("Informe o nome do titular.");
  if (!payload.holderDoc) throw new Error("Informe o CPF/CNPJ do titular (somente números).");
  if (!payload.bankName) throw new Error("Informe o banco.");
  return payload;
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
