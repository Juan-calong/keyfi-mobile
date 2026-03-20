import { useEffect, useMemo, useState } from "react";

import type {
  BeneficiaryFormState,
  BeneficiaryPixKeyType,
  SellerBeneficiaryDTO,
} from "../sellerProfile.types";
import { isoToDateInput } from "../sellerProfile.utils";
import { buildBeneficiaryPayload } from "../sellerProfile.beneficiary";

export function useBeneficiaryForm(beneficiary: SellerBeneficiaryDTO | null): BeneficiaryFormState {
  const [fullName, setFullName] = useState("");
  const [document, setDocument] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");

  const [pixKeyType, setPixKeyType] = useState<BeneficiaryPixKeyType>("EMAIL");
  const [pixKey, setPixKey] = useState("");

  const [bankCode, setBankCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountType, setAccountType] = useState<"CHECKING" | "SAVINGS">("CHECKING");
  const [agency, setAgency] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountDigit, setAccountDigit] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountHolderDocument, setAccountHolderDocument] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!beneficiary) {
      setFullName("");
      setDocument("");
      setEmail("");
      setPhone("");
      setBirthDate("");
      setPixKeyType("EMAIL");
      setPixKey("");
      setBankCode("");
      setBankName("");
      setAccountType("CHECKING");
      setAgency("");
      setAccountNumber("");
      setAccountDigit("");
      setAccountHolderName("");
      setAccountHolderDocument("");
      setNotes("");
      return;
    }

    setFullName(beneficiary.fullName ?? "");
    setDocument(beneficiary.document ?? "");
    setEmail(beneficiary.email ?? "");
    setPhone(beneficiary.phone ?? "");
    setBirthDate(isoToDateInput(beneficiary.birthDate));
    setPixKeyType(beneficiary.pixKeyType ?? "EMAIL");
    setPixKey(beneficiary.pixKey ?? "");
    setBankCode(beneficiary.bankCode ?? "");
    setBankName(beneficiary.bankName ?? "");
    setAccountType(beneficiary.accountType ?? "CHECKING");
    setAgency(beneficiary.agency ?? "");
    setAccountNumber(beneficiary.accountNumber ?? "");
    setAccountDigit(beneficiary.accountDigit ?? "");
    setAccountHolderName(beneficiary.accountHolderName ?? "");
    setAccountHolderDocument(beneficiary.accountHolderDocument ?? "");
    setNotes(beneficiary.notes ?? "");
  }, [beneficiary?.id]);

  const payload = useMemo(
    () =>
      buildBeneficiaryPayload({
        fullName,
        document,
        email,
        phone,
        birthDate,
        pixKeyType,
        pixKey,
        bankCode,
        bankName,
        accountType,
        agency,
        accountNumber,
        accountDigit,
        accountHolderName,
        accountHolderDocument,
        notes,
      }),
    [
      fullName,
      document,
      email,
      phone,
      birthDate,
      pixKeyType,
      pixKey,
      bankCode,
      bankName,
      accountType,
      agency,
      accountNumber,
      accountDigit,
      accountHolderName,
      accountHolderDocument,
      notes,
    ]
  );

  return {
    fullName,
    setFullName,
    document,
    setDocument,
    email,
    setEmail,
    phone,
    setPhone,
    birthDate,
    setBirthDate,

    pixKeyType,
    setPixKeyType,
    pixKey,
    setPixKey,

    bankCode,
    setBankCode,
    bankName,
    setBankName,
    accountType,
    setAccountType,
    agency,
    setAgency,
    accountNumber,
    setAccountNumber,
    accountDigit,
    setAccountDigit,
    accountHolderName,
    setAccountHolderName,
    accountHolderDocument,
    setAccountHolderDocument,

    notes,
    setNotes,

    payload,
  };
}