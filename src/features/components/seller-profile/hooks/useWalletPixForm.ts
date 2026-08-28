import { useEffect, useMemo, useState } from "react";

import type { DestinationDTO, WalletPixFormState, WalletPixKeyType } from "../sellerProfile.types";
import { normalizePixKeyForSubmit, pixKeyTypeFromLegacy } from "../sellerProfile.utils";

export function useWalletPixForm(destination: DestinationDTO | null): WalletPixFormState {
  const [pixKeyType, setPixKeyType] = useState<WalletPixKeyType>("CPF");
  const [pixKey, setPixKey] = useState("");
  const [holderName, setHolderName] = useState("");
  const [holderDoc, setHolderDoc] = useState("");
  const [bankName, setBankName] = useState("");
  const [notes, setNotes] = useState("");
  const [pixKeyTypeUnsupported, setPixKeyTypeUnsupported] = useState(false);

  useEffect(() => {
    if (!destination) {
      setPixKeyType("CPF");
      setPixKey("");
      setHolderName("");
      setHolderDoc("");
      setBankName("");
      setNotes("");
      setPixKeyTypeUnsupported(false);
      return;
    }

    const type = pixKeyTypeFromLegacy(destination.pixKeyType);
    setPixKeyType(type ?? "CPF");
    setPixKeyTypeUnsupported(!type);
    setPixKey(destination.pixKey ?? "");
    setHolderName(destination.holderName ?? "");
    setHolderDoc(destination.holderDoc ?? "");
    setBankName(destination.bankName ?? "");
    setNotes(destination.notes ?? "");
  }, [destination]);

  const normalizedPixKey = useMemo(
    () => normalizePixKeyForSubmit(pixKeyType, pixKey),
    [pixKeyType, pixKey]
  );

  return {
    pixKeyType,
    setPixKeyType: (type) => { setPixKeyType(type); setPixKey(""); setPixKeyTypeUnsupported(false); },
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
    pixKeyTypeUnsupported,
  };
}
