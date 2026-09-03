import { useEffect, useMemo, useState } from "react";

import type {
  BeneficiaryFormState,
  BeneficiaryPixKeyType,
  SellerBeneficiaryDTO,
} from "../sellerProfile.types";
import { formatHydratedPixKeyForDisplay, isoToDateInput, pixKeyTypeFromLegacy } from "../sellerProfile.utils";
import { buildBeneficiaryPayload } from "../sellerProfile.beneficiary";

export function useBeneficiaryForm(beneficiary: SellerBeneficiaryDTO | null): BeneficiaryFormState {
  const [fullName, setFullName] = useState("");
  const [document, setDocument] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");

  const [pixKeyType, setPixKeyType] = useState<BeneficiaryPixKeyType>("CPF");
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
  const [pixKeyTypeUnsupported, setPixKeyTypeUnsupported] = useState(false);

  useEffect(() => {
    if (!beneficiary) {
      setFullName("");
      setDocument("");
      setEmail("");
      setPhone("");
      setBirthDate("");
      setPixKeyType("CPF");
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
      setPixKeyTypeUnsupported(false);
      return;
    }

    setFullName(beneficiary.fullName ?? "");
    setDocument(beneficiary.document ?? "");
    setEmail(beneficiary.email ?? "");
    setPhone(beneficiary.phone ?? "");
    setBirthDate(isoToDateInput(beneficiary.birthDate));
    const type = pixKeyTypeFromLegacy(beneficiary.pixKeyType);
    setPixKeyType(type ?? "CPF");
    setPixKeyTypeUnsupported(!!beneficiary.pixKey && !type);
    setPixKey(formatHydratedPixKeyForDisplay(beneficiary.pixKeyType, beneficiary.pixKey));
    setBankCode(beneficiary.bankCode ?? "");
    setBankName(beneficiary.bankName ?? "");
    setAccountType(beneficiary.accountType ?? "CHECKING");
    setAgency(beneficiary.agency ?? "");
    setAccountNumber(beneficiary.accountNumber ?? "");
    setAccountDigit(beneficiary.accountDigit ?? "");
    setAccountHolderName(beneficiary.accountHolderName ?? "");
    setAccountHolderDocument(beneficiary.accountHolderDocument ?? "");
    setNotes(beneficiary.notes ?? "");
  }, [beneficiary]);

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
    setPixKeyType: (type) => { setPixKeyType(type); setPixKey(""); setPixKeyTypeUnsupported(false); },
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
    pixKeyTypeUnsupported,
  };
}
