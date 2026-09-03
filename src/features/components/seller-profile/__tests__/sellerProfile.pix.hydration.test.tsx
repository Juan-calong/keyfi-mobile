import React from "react";
import { act, create } from "react-test-renderer";

import { useBeneficiaryForm } from "../hooks/useBeneficiaryForm";
import { useWalletPixForm } from "../hooks/useWalletPixForm";
import type { DestinationDTO, SellerBeneficiaryDTO } from "../sellerProfile.types";

const destination = (pixKeyType: DestinationDTO["pixKeyType"], pixKey: string): DestinationDTO => ({
  id: "destination-1",
  walletId: "wallet-1",
  pixKeyType,
  pixKey,
  holderName: "Titular",
  holderDoc: "12345678901",
  bankName: "Banco",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const beneficiary = (pixKeyType: SellerBeneficiaryDTO["pixKeyType"], pixKey: string): SellerBeneficiaryDTO => ({
  id: "beneficiary-1",
  sellerId: "seller-1",
  beneficiaryType: "SELLER",
  fullName: "Beneficiário",
  document: "12345678901",
  pixKeyType,
  pixKey,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

describe("PIX form rehydration", () => {
  it.each([
    ["CPF", "12345678901", "123.456.789-01"],
    ["CNPJ", "12345678000190", "12.345.678/0001-90"],
    ["PHONE", "+5511999999999", "(11) 99999-9999"],
    ["EMAIL", "User@Example.COM", "User@Example.COM"],
    ["RANDOM", "a-b-c", "a-b-c"],
  ] as const)("formats %s received from the API in wallet and beneficiary forms", async (type, raw, display) => {
    let wallet: ReturnType<typeof useWalletPixForm>;
    let beneficiaryForm: ReturnType<typeof useBeneficiaryForm>;

    function WalletProbe() {
      wallet = useWalletPixForm(destination(type, raw));
      return null;
    }

    function BeneficiaryProbe() {
      beneficiaryForm = useBeneficiaryForm(beneficiary(type, raw));
      return null;
    }

    await act(async () => {
      create(<WalletProbe />);
      create(<BeneficiaryProbe />);
    });

    expect(wallet!.pixKey).toBe(display);
    expect(beneficiaryForm!.pixKey).toBe(display);
  });

  it("keeps save canonical and restores the display format when the destination rehydrates", async () => {
    let wallet: ReturnType<typeof useWalletPixForm>;
    const initial = destination("CPF", "12345678901");

    function WalletProbe({ value }: { value: DestinationDTO }) {
      wallet = useWalletPixForm(value);
      return null;
    }

    let tree: ReturnType<typeof create>;
    await act(async () => {
      tree = create(<WalletProbe value={initial} />);
    });

    expect(wallet!.normalizedPixKey).toBe("12345678901");

    await act(async () => {
      tree!.update(<WalletProbe value={{ ...initial }} />);
    });

    expect(wallet!.pixKey).toBe("123.456.789-01");
    expect(wallet!.normalizedPixKey).toBe("12345678901");
  });
});
