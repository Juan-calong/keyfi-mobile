// core/api/services/payments.service.ts
import { api } from "../client";
import { endpoints } from "../endpoints";
import type { ActivePaymentEnvelope, PaymentIntentDTO, BoletoPayer } from "./payments.types";

function onlyDigits(v?: string) {
  return String(v || "").replace(/\D/g, "");
}

function buildIdempotencyKey(orderId: string, method: string) {
  return `intent-${method}-${orderId}-${Date.now()}`;
}

function normalizeBoletoPayer(payer: BoletoPayer): BoletoPayer {
  return {
    cpf: onlyDigits(payer.cpf),
    firstName: String(payer.firstName || "").trim(),
    lastName: String(payer.lastName || "").trim(),
    email: String(payer.email || "").trim(),
    address: {
      zipCode: onlyDigits(payer.address?.zipCode),
      streetName: String(payer.address?.streetName || "").trim(),
      streetNumber: String(payer.address?.streetNumber || "").trim(),
      neighborhood: String(payer.address?.neighborhood || "").trim(),
      city: String(payer.address?.city || "").trim(),
      federalUnit: String(payer.address?.federalUnit || "").trim(),
    },
  };
}

export type CreateIntentBody =
  | { method: "PIX"; cpf?: string }
  | { method: "BOLETO"; payer: BoletoPayer }
  | {
      method: "CARD";
      installments: number;
      payer?: BoletoPayer;
      card: {
        token: string;
        payment_method_id: string;
        issuer_id?: string;
      };
    };

export const PaymentsService = {
  active: async (orderId: string): Promise<ActivePaymentEnvelope> => {
    const res = await api.get(endpoints.payments.active(orderId));
    console.log("[PAY][ACTIVE]", JSON.stringify(res.data, null, 2));
    return res.data;
  },

  // ✅ AGORA não exige payment_method_id
  cardToken: async (body: {
    cardNumber: string;
    exp: string; // "MM/AA" ou "MM/YY"
    cvv: string;
    name: string;
    docNumber: string; // CPF/CNPJ
  }): Promise<{ token: string; issuerId: string | null; firstSixDigits?: string }> => {
    const digits = (v?: any) => String(v ?? "").replace(/\D/g, "");

    const expDigits = digits(body.exp); // MMYY
    if (expDigits.length !== 4) {
      throw new Error("Validade inválida (use MM/AA).");
    }

    const mmNum = Number(expDigits.slice(0, 2));
    const yyNum = Number(expDigits.slice(2, 4));

    if (!mmNum || mmNum < 1 || mmNum > 12) {
      throw new Error("Mês de validade inválido.");
    }

    // ✅ strings (como seu backend pediu antes)
    const expiration_month = String(mmNum).padStart(2, "0");
    const expiration_year = String(2000 + yyNum);

    const payload = {
      card_number: digits(body.cardNumber),
      expiration_month,
      expiration_year,
      security_code: digits(body.cvv),
      cardholder: {
        name: String(body.name ?? "").trim(),
        identification: {
          type: digits(body.docNumber).length === 14 ? "CNPJ" : "CPF",
          number: digits(body.docNumber),
        },
      },
    };

    const r = await api.post("/payments/card/token", payload);
    console.log("[CARD_TOKEN][OK] data:", JSON.stringify(r.data, null, 2));

    const tk = r.data?.token;
    const iss = r.data?.issuer_id ?? null;
    const firstSix = r.data?.first_six_digits;

    if (!tk) throw new Error("Backend retornou 200, mas não trouxe token.");

    return {
      token: String(tk),
      issuerId: iss != null ? String(iss) : null,
      firstSixDigits: firstSix ? String(firstSix) : undefined,
    };
  },

  intentPIX: async (orderId: string, cpf?: string) => {
    const cpfDigits = cpf ? onlyDigits(cpf) : undefined;

    const res = await api.post(
      endpoints.payments.intent(orderId),
      { method: "PIX", cpf: cpfDigits },
      { headers: { "Idempotency-Key": buildIdempotencyKey(orderId, "PIX") } }
    );
    return res.data;
  },

  intentBOLETO: async (orderId: string, payer: BoletoPayer): Promise<PaymentIntentDTO> => {
    const payload = {
      method: "BOLETO",
      payer: {
        ...payer,
        cpf: onlyDigits(payer.cpf),
        email: payer.email?.trim() || undefined,
        address: {
          ...payer.address,
          zipCode: onlyDigits(payer.address.zipCode),
          federalUnit: String(payer.address.federalUnit || "").trim().toUpperCase(),
          streetNumber: String(payer.address.streetNumber || "").trim(),
        },
      },
    };

    const res = await api.post(
      endpoints.payments.intent(orderId),
      payload,
      { headers: { "Idempotency-Key": `intent-${orderId}-${Date.now()}` } }
    );
    return res.data;
  },

  intentCARD: async (
    orderId: string,
    body: {
      installments: number;
      payer?: BoletoPayer;
      card: { token: string; payment_method_id: string; issuer_id?: string };
    }
  ): Promise<PaymentIntentDTO> => {
    const payload: any = {
      method: "CARD",
      installments: Number(body.installments || 1),
      card: body.card,
    };

    if (body.payer) payload.payer = normalizeBoletoPayer(body.payer);

    const res = await api.post(
      endpoints.payments.intent(orderId),
      payload,
      { headers: { "Idempotency-Key": buildIdempotencyKey(orderId, "CARD") } }
    );

    return res.data;
  },

  createIntent: async (orderId: string, body: CreateIntentBody): Promise<PaymentIntentDTO> => {
    const method = String((body as any)?.method || "").toUpperCase();
    const payload: any = { method };

    if (method === "PIX") payload.cpf = onlyDigits((body as any)?.cpf);
    if (method === "BOLETO") payload.payer = normalizeBoletoPayer((body as any).payer);

    if (method === "CARD") {
      payload.installments = Number((body as any)?.installments || 1);
      payload.card = (body as any)?.card;
      if ((body as any)?.payer) payload.payer = normalizeBoletoPayer((body as any).payer);
    }

    const res = await api.post(
      endpoints.payments.intent(orderId),
      payload,
      { headers: { "Idempotency-Key": buildIdempotencyKey(orderId, method) } }
    );

    return res.data;
  },
};
