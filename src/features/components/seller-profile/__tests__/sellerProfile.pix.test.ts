import { PIX_KEY_TYPES } from "../sellerProfile.types";
import { buildWalletDestinationPayload, formatPixKeyForDisplay, getPixKeyboardType, normalizePixKeyForSubmit, pixKeyTypeFromLegacy, validatePixKeyForUx } from "../sellerProfile.utils";
import { buildBeneficiaryPayload } from "../sellerProfile.beneficiary";
import { createIdempotencyKey } from "../../../../core/api/idempotency";

describe("PIX key helpers", () => {
  it("uses canonical types and only maps legacy EVP on read", () => {
    expect(PIX_KEY_TYPES).toEqual(["CPF", "CNPJ", "EMAIL", "PHONE", "RANDOM"]);
    expect(pixKeyTypeFromLegacy("EVP")).toBe("RANDOM");
    expect(pixKeyTypeFromLegacy("UNKNOWN")).toBeNull();
  });

  it("formats documents and preserves email/random data", () => {
    expect(formatPixKeyForDisplay("CPF", "12345678901")).toBe("123.456.789-01");
    expect(normalizePixKeyForSubmit("CNPJ", "12.345.678/0001-90")).toBe("12345678000190");
    expect(normalizePixKeyForSubmit("EMAIL", " User@Example.COM ")).toBe("user@example.com");
    expect(normalizePixKeyForSubmit("RANDOM", " uuid-Aa-1 ")).toBe("uuid-Aa-1");
    expect(formatPixKeyForDisplay("EMAIL", " User@Example.COM ")).toBe(" User@Example.COM ");
    expect(formatPixKeyForDisplay("RANDOM", "a-b-c")).toBe("a-b-c");
  });

  it("does not silently truncate overlong document keys", () => {
    const cpf = "123456789012";
    const cnpj = "123456780001905";
    expect(normalizePixKeyForSubmit("CPF", cpf)).toBe(cpf);
    expect(normalizePixKeyForSubmit("CNPJ", cnpj)).toBe(cnpj);
    expect(validatePixKeyForUx("CPF", cpf)).toBeTruthy();
    expect(validatePixKeyForUx("CNPJ", cnpj)).toBeTruthy();
  });

  it("normalizes Brazilian phones to E.164", () => {
    expect(normalizePixKeyForSubmit("PHONE", "(11) 99999-9999")).toBe("+5511999999999");
    expect(normalizePixKeyForSubmit("PHONE", "11999999999")).toBe("+5511999999999");
    expect(normalizePixKeyForSubmit("PHONE", "+55 11 99999-9999")).toBe("+5511999999999");
    expect(normalizePixKeyForSubmit("PHONE", "(11) 3333-4444")).toBe("+551133334444");
    expect(normalizePixKeyForSubmit("PHONE", "1133334444")).toBe("+551133334444");
    expect(validatePixKeyForUx("PHONE", "99999-9999")).toMatch(/DDD/);
    expect(validatePixKeyForUx("PHONE", "119999999999")).toMatch(/DDD/);
    expect(validatePixKeyForUx("PHONE", "+54 11 99999-9999")).toMatch(/DDD/);
    expect(getPixKeyboardType("PHONE")).toBe("phone-pad");
  });

  it("builds canonical beneficiary payloads and PII-free idempotency keys", () => {
    const payload = buildBeneficiaryPayload({
      fullName: "Pessoa Fictícia", document: "12345678901", email: "", phone: "", birthDate: "",
      pixKeyType: "EMAIL", pixKey: " User@Example.COM ", bankCode: "", bankName: "", accountType: "CHECKING",
      agency: "", accountNumber: "", accountDigit: "", accountHolderName: "", accountHolderDocument: "", notes: "",
    });
    expect(payload).toMatchObject({ pixKeyType: "EMAIL", pixKey: "user@example.com" });
    const key = createIdempotencyKey("wallet-dest");
    const nextKey = createIdempotencyKey("wallet-dest");
    expect(key).toMatch(/^wallet-dest-/);
    expect(key).not.toBe(nextKey);
    expect(key).not.toContain("user@example.com");
    expect(key).not.toContain("12345678901");
  });

  it("keeps canonical beneficiary and wallet destination payload types", () => {
    for (const [pixKeyType, pixKey] of [["PHONE", "11999999999"], ["RANDOM", " AbC-123 "]] as const) {
      const payload = buildBeneficiaryPayload({ fullName: "Pessoa Fictícia", document: "12345678901", email: "", phone: "", birthDate: "", pixKeyType, pixKey, bankCode: "", bankName: "", accountType: "CHECKING", agency: "", accountNumber: "", accountDigit: "", accountHolderName: "", accountHolderDocument: "", notes: "" });
      expect(payload.pixKeyType).toBe(pixKeyType);
      expect(payload.pixKey).toBe(normalizePixKeyForSubmit(pixKeyType, pixKey));
    }
    expect(buildWalletDestinationPayload({ pixKeyType: "EMAIL", pixKey: "User@Example.COM", normalizedPixKey: "user@example.com", holderName: " Titular ", holderDoc: "123.456.789-01", bankName: " Banco ", notes: "" })).toEqual(expect.objectContaining({ pixKeyType: "EMAIL", pixKey: "user@example.com", holderName: "Titular", holderDoc: "12345678901" }));
  });
});
