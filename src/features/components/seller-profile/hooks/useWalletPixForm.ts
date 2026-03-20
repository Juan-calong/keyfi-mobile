import { useEffect, useMemo, useState } from "react";

import type { DestinationDTO, WalletPixFormState, WalletPixKeyType } from "../sellerProfile.types";
import { normalizeWalletPixKey } from "../sellerProfile.utils";

export function useWalletPixForm(destination: DestinationDTO | null): WalletPixFormState {
  const [pixKeyType, setPixKeyType] = useState<WalletPixKeyType>("EMAIL");
  const [pixKey, setPixKey] = useState("");
  const [holderName, setHolderName] = useState("");
  const [holderDoc, setHolderDoc] = useState("");
  const [bankName, setBankName] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!destination) {
      setPixKeyType("EMAIL");
      setPixKey("");
      setHolderName("");
      setHolderDoc("");
      setBankName("");
      setNotes("");
      return;
    }

    setPixKeyType(destination.pixKeyType ?? "EMAIL");
    setPixKey(destination.pixKey ?? "");
    setHolderName(destination.holderName ?? "");
    setHolderDoc(destination.holderDoc ?? "");
    setBankName(destination.bankName ?? "");
    setNotes(destination.notes ?? "");
  }, [destination?.id]);

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