export type PixIntent = {
    paymentId?: string | null;
    ticketUrl?: string | null;
    qrCode?: string | null;
    qrCodeBase64?: string | null;
};

export function normalizePixIntent(input: any): PixIntent {
    const data = input?.intent ?? input;

    const td =
        data?.point_of_interaction?.transaction_data ||
        data?.raw?.point_of_interaction?.transaction_data ||
        null;

    return {
        paymentId: String(data?.paymentId ?? data?.id ?? data?.raw?.id ?? "") || null,
        ticketUrl:
            data?.ticketUrl ??
            data?.ticket_url ??
            data?.checkoutUrl ??
            data?.url ??
            data?.initPoint ??
            data?.init_point ??
            data?.raw?.init_point ??
            td?.ticket_url ??
            null,
        qrCode:
            data?.qrCode ??
            data?.qr_code ??
            data?.pix?.copyPaste ??
            td?.qr_code ??
            null,
        qrCodeBase64:
            data?.qrCodeBase64 ??
            data?.qr_code_base64 ??
            data?.pix?.qrCodeBase64 ??
            td?.qr_code_base64 ??
            null,
    };
}
