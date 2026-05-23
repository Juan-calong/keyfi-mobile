import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import Config from "react-native-config";

let configured = false;

function ensureConfigured() {
  if (configured) return;

  const webClientId = String(Config.GOOGLE_WEB_CLIENT_ID || "").trim();

  if (!webClientId) {
    const err: any = new Error("GOOGLE_WEB_CLIENT_ID não configurado.");
    err.code = "GOOGLE_WEB_CLIENT_ID_MISSING";
    throw err;
  }

  GoogleSignin.configure({
    webClientId,
  });

  configured = true;
}

export async function getGoogleIdToken(): Promise<string> {
  ensureConfigured();

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const result = await GoogleSignin.signIn();
  const idToken = result.data?.idToken ?? null;

  if (!idToken) {
    const err: any = new Error("Não foi possível obter o token da conta Google.");
    err.code = "GOOGLE_ID_TOKEN_MISSING";
    throw err;
  }

  return idToken;
}

export function isGoogleSignInCancelled(error: any): boolean {
  const code = error?.code;
  return code === statusCodes.SIGN_IN_CANCELLED || code === "12501";
}
