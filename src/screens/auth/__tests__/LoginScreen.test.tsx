import React from "react";
import { act, create } from "react-test-renderer";

import { LoginScreen } from "../LoginScreen";

const mockTextInputs: Array<Record<string, unknown>> = [];
const mockTexts: unknown[] = [];
let mockIosAlertVisible = false;

jest.mock("react-native", () => {
  const passthrough = ({ children }: { children?: React.ReactNode }) => children ?? null;

  return {
    View: passthrough,
    Text: ({ children }: { children?: unknown }) => {
      mockTexts.push(children);
      return null;
    },
    TextInput: (props: Record<string, unknown>) => {
      mockTextInputs.push(props);
      return null;
    },
    Pressable: passthrough,
    KeyboardAvoidingView: passthrough,
    ScrollView: passthrough,
    StatusBar: () => null,
    Platform: { OS: "ios" },
    StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
    useWindowDimensions: () => ({ width: 390, height: 844 }),
  };
});

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useRoute: () => ({
    params: {
      email: "verified@example.com",
      message: "Email verificado com sucesso. Faça login para continuar.",
    },
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
  SafeAreaView: "SafeAreaView",
}));

jest.mock("react-native-vector-icons/Ionicons", () => "Ionicons");

jest.mock("../../../stores/auth.store", () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      login: jest.fn(),
      loginWithSocial: jest.fn(),
      loginWithBiometrics: jest.fn(),
    }),
}));

jest.mock("../../../core/security/keychain", () => ({
  getBiometricStatus: jest.fn().mockResolvedValue({ enabled: false }),
}));

jest.mock("../../../core/auth/googleSignIn", () => ({
  getGoogleIdToken: jest.fn(),
  isGoogleSignInCancelled: jest.fn(),
}));

jest.mock("../../../ui/components/IosAlert", () => ({
  IosAlert: ({ visible }: { visible: boolean }) => {
    mockIosAlertVisible = visible;
    return null;
  },
}));

describe("LoginScreen", () => {
  it("keeps the verified-email login form unblocked while preserving the confirmation", async () => {
    mockTextInputs.length = 0;
    mockTexts.length = 0;
    mockIosAlertVisible = false;

    await act(async () => {
      create(<LoginScreen />);
    });

    expect(mockTextInputs.some((input) => input.value === "verified@example.com")).toBe(true);
    expect(mockTextInputs.find((input) => input.placeholder === "••••••••")?.editable).not.toBe(false);
    expect(mockIosAlertVisible).toBe(false);
    expect(mockTexts).toContain("Email verificado com sucesso. Faça login para continuar.");
    expect(mockTexts).toContain("Criar uma conta");
  });
});
