import ReactNativeBiometrics, {
  BiometryTypes,
} from "react-native-biometrics";

const rnBiometrics = new ReactNativeBiometrics();

export type BiometryLabel =
  | "FaceID"
  | "TouchID"
  | "Biometrics"
  | "Fingerprint"
  | null;

export async function getBiometricAvailability(): Promise<{
  available: boolean;
  biometryType: BiometryLabel;
}> {
  try {
    const { available, biometryType } = await rnBiometrics.isSensorAvailable();

    return {
      available,
      biometryType: (biometryType as BiometryLabel) ?? null,
    };
  } catch {
    return {
      available: false,
      biometryType: null,
    };
  }
}

export async function promptBiometricUnlock(): Promise<boolean> {
  try {
    const { success } = await rnBiometrics.simplePrompt({
      promptMessage: "Desbloquear app",
      cancelButtonText: "Cancelar",
    });

    return !!success;
  } catch {
    return false;
  }
}

export function getBiometryDisplayName(type: BiometryLabel) {
  if (type === BiometryTypes.FaceID) return "Face ID";
  if (type === BiometryTypes.TouchID) return "Touch ID";
  if (type === "Biometrics") return "Biometria";
  if (type === "Fingerprint") return "Digital";
  return "Biometria";
}