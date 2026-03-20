import type { BeneficiaryPayload } from "./sellerProfile.types";
import {
  hasCpfOrCnpjLength,
  hasPhoneLength,
  normalizeBeneficiaryPixKey,
  trimOrUndefined,
  validateBeneficiaryPixKey,
} from "./sellerProfile.utils";

export function hasAnyBeneficiaryBankData(input: {
  bankCode: string;
  bankName: string;
  accountType: string;
  agency: string;
  accountNumber: string;
  accountDigit: string;
  accountHolderName: string;
  accountHolderDocument: string;
}) {
  return !!(
    trimOrUndefined(input.bankCode) ||
    trimOrUndefined(input.bankName) ||
    trimOrUndefined(input.accountType) ||
    trimOrUndefined(input.agency) ||
    trimOrUndefined(input.accountNumber) ||
    trimOrUndefined(input.accountDigit) ||
    trimOrUndefined(input.accountHolderName) ||
    trimOrUndefined(input.accountHolderDocument)
  );
}

export function buildBeneficiaryPayload(input: {
  fullName: string;
  document: string;
  email: string;
  phone: string;
  birthDate: string;

  pixKeyType: BeneficiaryPayload["pixKeyType"];
  pixKey: string;

  bankCode: string;
  bankName: string;
  accountType: "CHECKING" | "SAVINGS";
  agency: string;
  accountNumber: string;
  accountDigit: string;
  accountHolderName: string;
  accountHolderDocument: string;

  notes: string;
}): BeneficiaryPayload {
  const hasPix = !!trimOrUndefined(input.pixKey);

  const hasBank = hasAnyBeneficiaryBankData({
    bankCode: input.bankCode,
    bankName: input.bankName,
    accountType: input.accountType,
    agency: input.agency,
    accountNumber: input.accountNumber,
    accountDigit: input.accountDigit,
    accountHolderName: input.accountHolderName,
    accountHolderDocument: input.accountHolderDocument,
  });

  return {
    fullName: String(input.fullName ?? "").trim(),
    document: String(input.document ?? "").trim(),
    email: trimOrUndefined(input.email),
    phone: trimOrUndefined(input.phone),
    birthDate: trimOrUndefined(input.birthDate),

    pixKeyType: hasPix ? input.pixKeyType : undefined,
    pixKey: hasPix && input.pixKeyType
      ? normalizeBeneficiaryPixKey(input.pixKeyType, input.pixKey)
      : undefined,

    bankCode: hasBank ? trimOrUndefined(input.bankCode) : undefined,
    bankName: hasBank ? trimOrUndefined(input.bankName) : undefined,
    accountType: hasBank ? input.accountType : undefined,
    agency: hasBank ? trimOrUndefined(input.agency) : undefined,
    accountNumber: hasBank ? trimOrUndefined(input.accountNumber) : undefined,
    accountDigit: hasBank ? trimOrUndefined(input.accountDigit) : undefined,
    accountHolderName: hasBank ? trimOrUndefined(input.accountHolderName) : undefined,
    accountHolderDocument: hasBank ? trimOrUndefined(input.accountHolderDocument) : undefined,

    notes: trimOrUndefined(input.notes),
  };
}

export function validateBeneficiaryPayload(payload: BeneficiaryPayload) {
  if (!payload.fullName || payload.fullName.length < 3) {
    return "Informe o nome completo do beneficiário.";
  }

  if (!payload.document || !hasCpfOrCnpjLength(payload.document)) {
    return "Informe CPF ou CNPJ do beneficiário.";
  }

  if (payload.phone && !hasPhoneLength(payload.phone)) {
    return "Telefone do beneficiário inválido.";
  }

  if (payload.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(payload.birthDate)) {
    return "Data de nascimento deve estar no formato YYYY-MM-DD.";
  }

  const hasPix = !!payload.pixKey;
  const hasBank = !!(
    payload.bankCode ||
    payload.bankName ||
    payload.accountType ||
    payload.agency ||
    payload.accountNumber ||
    payload.accountDigit ||
    payload.accountHolderName ||
    payload.accountHolderDocument
  );

  if (!hasPix && !hasBank) {
    return "Informe ao menos PIX ou dados bancários do beneficiário.";
  }

  if (hasPix) {
    if (!payload.pixKeyType) return "Selecione o tipo da chave PIX.";
    const err = validateBeneficiaryPixKey(payload.pixKeyType, payload.pixKey || "");
    if (err) return err;
  }

  if (hasBank) {
    if (!payload.bankCode) return "Informe o código do banco.";
    if (!payload.accountType) return "Selecione o tipo da conta.";
    if (!payload.agency) return "Informe a agência.";
    if (!payload.accountNumber) return "Informe o número da conta.";
    if (!payload.accountHolderName) return "Informe o nome do titular da conta.";
    if (!payload.accountHolderDocument || !hasCpfOrCnpjLength(payload.accountHolderDocument)) {
      return "Informe CPF ou CNPJ do titular da conta.";
    }
  }

  return null;
}