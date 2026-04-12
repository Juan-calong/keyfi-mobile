import { useEffect, useMemo, useState } from "react";

import type { DestinationDTO, WalletPixFormState, WalletPixKeyType } from "../sellerProfile.types";
import { normalizeWalletPixKey } from "../sellerProfile.utils";

export function useWalletPixForm(destination: DestinationDTO | null): WalletPixFormState {
  const [pixKeyType, setPixKeyType] = useState<WalletPixKeyType>("CPF");
  const [pixKey, setPixKey] = useState("");
  const [holderName, setHolderName] = useState("");
  const [holderDoc, setHolderDoc] = useState("");
  const [bankName, setBankName] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!destination) {
      setPixKeyType("CPF");
      setPixKey("");
      setHolderName("");
      setHolderDoc("");
      setBankName("");
      setNotes("");
      return;
    }

    setPixKeyType(destination.pixKeyType === "CPF" || destination.pixKeyType === "CNPJ" ? destination.pixKeyType : "CPF");
    setPixKey(destination.pixKey ?? "");
    setHolderName(destination.holderName ?? "");
    setHolderDoc(destination.holderDoc ?? "");
    setBankName(destination.bankName ?? "");
    setNotes(destination.notes ?? "");
  }, [destination]);

  const normalizedPixKey = useMemo(
    () => normalizeWalletPixKey(pixKeyType, pixKey),
    [pixKeyType, pixKey]
  );

  return {
    pixKeyType,
    setPixKeyType,
    pixKey,
    setPixKey,
    holderName,
    setHolderName,
    holderDoc,
    setHolderDoc,
    bankName,
    setBankName,
    notes,
    setNotes,
    normalizedPixKey,
  };
}