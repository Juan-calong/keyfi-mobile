import { Alert } from "react-native";
import { PaymentsService } from "../api/services/payments.service";
import { normalizePixIntent } from "../utils/normalizePixIntent";
import type { PixIntent } from "../payments/payments";

export async function startPixPayment({
  orderId,
  nav,
  screen,
  title,
}: {
  orderId: string;
  nav: any;
  screen: string;
  title?: string;
}) {
  const intentRaw = await PaymentsService.createIntent(orderId, {
    method: "PIX",
  });

  const intent = normalizePixIntent(intentRaw) as PixIntent;

  if (!intent.ticketUrl && !intent.qrCode && !intent.qrCodeBase64) {
    Alert.alert("Pagamento", "Intent veio sem dados de PIX/checkout.");
    return;
  }

  nav.navigate(screen, { orderId, intent: { ...intent, title } });
}