import type { PixIntent } from "../payments/payments";
import type { PaymentIntentResponse } from "../api/services/payments.service";
import { Alert } from "react-native";
import { Linking } from "react-native";

export async function openCheckoutFromIntent(data: PaymentIntentResponse | PixIntent) {
    const url =
        ("url" in data ? data.url : null) ||
        ("checkoutUrl" in data ? data.checkoutUrl : null) ||
        ("initPoint" in data ? (data as any).initPoint : null) ||
        ("sandboxInitPoint" in data ? (data as any).sandboxInitPoint : null) ||
        ("ticketUrl" in data ? data.ticketUrl : null) ||
        null;

    if (!url) {
        console.log("INTENT_SEM_URL:", JSON.stringify(data, null, 2));
        Alert.alert("Pagamento", "Não recebi URL do checkout no intent.");
        return;
    }

    const can = await Linking.canOpenURL(url);
    if (!can) {
        Alert.alert("Pagamento", "Não foi possível abrir o checkout.");
        return;
    }
    await Linking.openURL(url);
}
