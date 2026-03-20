export type ActivePaymentEnvelope = {
  orderId: string;
  payment: null | {
    id: string;
    provider: string;
    externalId?: string;
    method: "PIX" | "BOLETO" | "CARD" | string;
    status: string;
    expiresAt?: string | null;
  };
  nextAction:
    | null
    | {
        type: "PIX";
        ticketUrl?: string;
        qrCode?: string;
        qrCodeBase64?: string;
      }
    | {
        type: "BOLETO";
        ticketUrl?: string;
        digitableLine?: string;
        barcode?: string;
      }
    | {
        type: "CARD";
        statusDetail?: string; // ✅ agora existe no type
      }
    | {
        type: string; // fallback caso backend mande algo novo
        [key: string]: any;
      };

  ui: { code: string; message: string };
  flags: { shouldPoll: boolean; canRetry: boolean };
};

export type PaymentIntentDTO = {
  paymentIntentId: string;
  providerPaymentId: string;
  status: string;
  method: "PIX" | "BOLETO" | "CARD" | string;
  expiresAt?: string | null;
  nextAction?:
    | {
        type: "PIX";
        ticketUrl?: string;
        qrCode?: string;
        qrCodeBase64?: string;
      }
    | {
        type: "BOLETO";
        ticketUrl?: string;
        digitableLine?: string;
        barcode?: string;
      }
    | {
        type: "CARD";
        statusDetail?: string;
      }
    | {
        type: string;
        [key: string]: any;
      }
    | null;
};

export type BoletoPayerAddress = {
  zipCode: string;
  streetName: string;
  streetNumber: string;
  neighborhood: string;
  city: string;
  federalUnit: string; // "SP"
};

export type BoletoPayer = {
  cpf: string; // CPF ou CNPJ (somente dígitos)
  firstName: string;
  lastName: string;
  email?: string;
  address: BoletoPayerAddress;
};
