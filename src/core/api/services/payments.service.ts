import { api } from "../client";
import { endpoints } from "../endpoints";
import type {
  ActivePaymentEnvelope,
  BoletoPayer,
  CreateSavedPaymentCardPayload,
  PaymentIntentDTO,
  SavedPaymentCard,
} from "./payments.types";

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

function normalizeSavedCard(card: any): SavedPaymentCard {
  return {
    id: String(card?.id || ""),
    brand: String(card?.brand || ""),
    last4: String(card?.last4 || ""),
    expirationMonth: Number(card?.expirationMonth || 0),
    expirationYear: Number(card?.expirationYear || 0),
    paymentMethodId: String(card?.paymentMethodId || ""),
    issuerId: card?.issuerId != null ? String(card.issuerId) : null,
    isDefault: Boolean(card?.isDefault),
    tokenizationCardId: String(card?.tokenizationCardId || ""),
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

export type PaymentMethodsResponse = {
  pix?: unknown;
  boleto?: unknown;
  card: {
    enabled: boolean;
    provider: string;
    publicKey?: string | null;
    maxInstallments?: number;
  };
};

export const PaymentsService = {
  getPaymentMethods: async (): Promise<PaymentMethodsResponse> => {
    try {
      const res = await api.get(endpoints.payments.methods);
      const data = res?.data ?? {};
      const card = data?.card ?? {};

      return {
        pix: data?.pix,
        boleto: data?.boleto,
        card: {
          enabled: Boolean(card?.enabled),
          provider: String(card?.provider || "MERCADOPAGO").toUpperCase(),
          publicKey: card?.publicKey ?? null,
          maxInstallments:
            typeof card?.maxInstallments === "number" ? card.maxInstallments : undefined,
        },
      };
    } catch {
      return {
        pix: undefined,
        boleto: undefined,
        card: { enabled: false, provider: "MERCADOPAGO", publicKey: null },
      };
    }
  },

  active: async (orderId: string): Promise<ActivePaymentEnvelope> => {
    const res = await api.get(endpoints.payments.active(orderId));
    return res.data;
  },

  cardToken: async (body: {
    cardNumber: string;
    exp: string;
    cvv: string;
    name: string;
    docNumber: string;
  }): Promise<{ token: string; issuerId: string | null; firstSixDigits?: string }> => {
    const digits = (v?: any) => String(v ?? "").replace(/\D/g, "");

    const expDigits = digits(body.exp);
    if (expDigits.length !== 4) {
      throw new Error("Validade inválida (use MM/AA).");
    }

    const mmNum = Number(expDigits.slice(0, 2));
    const yyNum = Number(expDigits.slice(2, 4));

    if (!mmNum || mmNum < 1 || mmNum > 12) {
      throw new Error("Mês de validade inválido.");
    }

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

    const tk = r.data?.token;
    const iss = r.data?.issuer_id ?? null;
    const firstSix = r.data?.first_six_digits;

    if (!tk) {
      throw new Error("Backend retornou 200, mas não trouxe token.");
    }

    return {
      token: String(tk),
      issuerId: iss != null ? String(iss) : null,
      firstSixDigits: firstSix ? String(firstSix) : undefined,
    };
  },

  listSavedCards: async (): Promise<SavedPaymentCard[]> => {
    const res = await api.get(endpoints.payments.savedCards);
    const rawCards = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res?.data?.items)
      ? res.data.items
      : Array.isArray(res?.data?.cards)
      ? res.data.cards
      : [];

    if (!Array.isArray(rawCards)) {
      return [];
    }

    return rawCards
      .map(normalizeSavedCard)
      .filter((card) => card.id && card.paymentMethodId && card.tokenizationCardId);
  },

  createSavedCard: async (payload: CreateSavedPaymentCardPayload): Promise<SavedPaymentCard> => {
    const res = await api.post(endpoints.payments.savedCards, {
      cardToken: payload.cardToken,
      paymentMethodId: payload.paymentMethodId,
      issuerId: payload.issuerId ?? undefined,
      isDefault: payload.isDefault,
    });

    return normalizeSavedCard(res?.data?.card ?? res?.data);
  },

  deleteSavedCard: async (id: string): Promise<void> => {
    await api.delete(endpoints.payments.savedCardById(id));
  },

  setDefaultSavedCard: async (id: string): Promise<void> => {
    await api.patch(endpoints.payments.savedCardDefault(id));
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

    const res = await api.post(endpoints.payments.intent(orderId), payload, {
      headers: { "Idempotency-Key": `intent-${orderId}-${Date.now()}` },
    });
    return res.data;
  },

  intentCARD: async (
    orderId: string,
    body: {
      installments: number;
      payer?: BoletoPayer;
      card: {
        token?: string;
        payment_method_id?: string;
        issuer_id?: string;
        cardToken?: string;
        paymentMethodId?: string;
        issuerId?: string;
        securityCode?: string;
        deviceSessionId?: string;
        savedCardId?: string;
      };
    }
  ): Promise<PaymentIntentDTO> => {
    const rawCard = body.card || {};
    const normalizedCard: any = {
      cardToken: rawCard.cardToken || rawCard.token,
    };

    const paymentMethodId = rawCard.paymentMethodId || rawCard.payment_method_id;
    const issuerId = rawCard.issuerId || rawCard.issuer_id;

    if (paymentMethodId) {
      normalizedCard.paymentMethodId = paymentMethodId;
    }

    if (issuerId) {
      normalizedCard.issuerId = issuerId;
    }

    if (rawCard.securityCode) {
      normalizedCard.securityCode = rawCard.securityCode;
    }

    if (rawCard.deviceSessionId) {
      normalizedCard.deviceSessionId = rawCard.deviceSessionId;
    }

    if (rawCard.savedCardId) {
      normalizedCard.savedCardId = rawCard.savedCardId;
    }

    const payload: any = {
      method: "CARD",
      installments: Number(body.installments || 1),
      card: normalizedCard,
    };

    if (body.payer) {
      payload.payer = normalizeBoletoPayer(body.payer);
    }

    const res = await api.post(endpoints.payments.intent(orderId), payload, {
      headers: { "Idempotency-Key": buildIdempotencyKey(orderId, "CARD") },
    });

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

    const res = await api.post(endpoints.payments.intent(orderId), payload, {
      headers: { "Idempotency-Key": buildIdempotencyKey(orderId, method) },
    });

    return res.data;
  },
};
