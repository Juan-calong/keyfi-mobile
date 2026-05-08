import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Ionicons from "react-native-vector-icons/Ionicons";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { useAuthStore } from "../../stores/auth.store";
import { friendlyError } from "../../core/errors/friendlyError";
import { IosAlert } from "../../ui/components/IosAlert";
import { getBiometricStatus } from "../../core/security/keychain";
import type { AuthStackParamList } from "../../navigation/AuthStack";

function isEmail(v: string) {
  const s = v.trim().toLowerCase();
  return s.includes("@") && s.includes(".");
}

type LoginRouteProps = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<LoginRouteProps["route"]>();
  const insets = useSafeAreaInsets();

  const login = useAuthStore((s) => s.login);
  const loginWithBiometrics = useAuthStore((s) => s.loginWithBiometrics);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [rememberMe, setRememberMe] = useState(false); // Adicionado para a UI do Lembre-se de mim

  const [touched, setTouched] = useState({ email: false, password: false });
  const [focused, setFocused] = useState({ email: false, password: false });

  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const [alert, setAlert] = useState<{ title: string; message: string } | null>(null);

  const submittingRef = useRef(false);
  const biometricSubmittingRef = useRef(false);

  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  useEffect(() => {
    if (route.params?.email) setEmail(route.params.email);
    if (route.params?.message) showError({ title: "Aviso", message: route.params.message });
  }, [route.params?.email, route.params?.message]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const status = await getBiometricStatus();
        if (!mounted) return;
        setBiometricEnabled(!!status.enabled);
      } catch {
        if (!mounted) return;
        setBiometricEnabled(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  function showError(v: { title: string; message: string }) {
    setAlert(v);
  }

  const inCooldown = cooldownUntil > now;

  function secondsLeft() {
    const ms = cooldownUntil - now;
    return Math.max(0, Math.ceil(ms / 1000));
  }

  function formatLeft(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m <= 0) return `${s}s`;
    return s === 0 ? `${m} min` : `${m}m ${s}s`;
  }

  function handleCooldownFromError(e: any) {
    const retry = Number(e?.response?.data?.retryAfterSec);
    if (Number.isFinite(retry) && retry > 0) {
      setCooldownUntil(Date.now() + retry * 1000);
    }
  }

  const emailOk = isEmail(email);
  const passOk = password.trim().length >= 6;

  const can = useMemo(
    () => emailOk && passOk && !loading && !inCooldown && !biometricLoading,
    [emailOk, passOk, loading, inCooldown, biometricLoading]
  );

  const left = secondsLeft();
  const btnText = loading
    ? "Entrando..."
    : inCooldown
    ? `Aguarde ${formatLeft(left)}`
    : "Entrar";

  async function onSubmit() {
    setTouched({ email: true, password: true });
    if (!can) return;

    if (submittingRef.current) return;
    submittingRef.current = true;

    try {
      setLoading(true);
      await login(email.trim(), password);
    } catch (e: any) {
const status = e?.response?.status;
const code = String(e?.response?.data?.code ?? "").toUpperCase();
const requiresEmailVerification =
  status === 403 &&
  (
    code === "EMAIL_NOT_VERIFIED" ||
    e?.response?.data?.requiresEmailVerification === true ||
    e?.response?.data?.nextStep === "VERIFY_EMAIL"
  );

if (requiresEmailVerification) {
  nav.navigate("VerifyEmail", {
    email: email.trim().toLowerCase(),
    source: "login",
  });
  return;
}
      showError(friendlyError(e));
      handleCooldownFromError(e);

      if (code === "INVALID_CREDENTIALS" || status === 401) {
        setTouched({ email: true, password: true });
      }
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }

  async function onBiometricLogin() {
    if (biometricSubmittingRef.current) return;

    try {
      biometricSubmittingRef.current = true;
      setBiometricLoading(true);

      await loginWithBiometrics();
    } catch (e: any) {
      showError(friendlyError(e));
    } finally {
      setBiometricLoading(false);
      biometricSubmittingRef.current = false;
    }
  }

  function onForgot() {
    showError({
      title: "Esqueci minha senha",
      message: "Implementar fluxo de recuperação aqui.",
    });
  }

  function onSignUp() {
    nav.navigate("RegisterChooseRole");
  }

  const showEmailErr = touched.email && !emailOk;
  const showPassErr = touched.password && !passOk;
  const topPad = Math.max(insets.top, 12);

  return (
    <Screen style={{ backgroundColor: COLORS.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingTop: topPad + 20 }]}
        >
          <Container>
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Text style={styles.logoText}>KeyFi</Text>
              </View>
              <Text style={styles.h1}>Acesse sua conta</Text>
              <Text style={styles.sub}>Faça login ou continue com sua conta social.</Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>Email</Text>
              <View
                style={[
                  styles.inputWrap,
                  focused.email && styles.inputWrapFocused,
                  showEmailErr && styles.inputWrapError,
                ]}
              >
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocused((s) => ({ ...s, email: true }))}
                  onBlur={() => {
                    setFocused((s) => ({ ...s, email: false }));
                    setTouched((s) => ({ ...s, email: true }));
                  }}
                  placeholder="seuemail@exemplo.com"
                  placeholderTextColor={COLORS.placeholder}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoComplete="email"
                  textContentType="emailAddress"
                  style={styles.input}
                  selectionColor={COLORS.primary}
                  returnKeyType="next"
                  underlineColorAndroid="transparent"
                />
              </View>
              {showEmailErr ? <Text style={styles.errorText}>Email inválido.</Text> : null}

              <View style={styles.fieldGap} />

              <Text style={styles.label}>Senha</Text>
              <View
                style={[
                  styles.inputWrap,
                  focused.password && styles.inputWrapFocused,
                  showPassErr && styles.inputWrapError,
                ]}
              >
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocused((s) => ({ ...s, password: true }))}
                  onBlur={() => {
                    setFocused((s) => ({ ...s, password: false }));
                    setTouched((s) => ({ ...s, password: true }));
                  }}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.placeholder}
                  secureTextEntry={secure}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  textContentType="password"
                  style={[styles.input, styles.passwordInput]}
                  selectionColor={COLORS.primary}
                  returnKeyType="done"
                  onSubmitEditing={onSubmit}
                  underlineColorAndroid="transparent"
                />

                <Pressable
                  onPress={() => setSecure((s) => !s)}
                  hitSlop={10}
                  style={({ pressed }) => [styles.eyeBtn, pressed && styles.pressed]}
                >
                  <Ionicons
                    name={secure ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={COLORS.icon}
                  />
                </Pressable>
              </View>
              {showPassErr ? (
                <Text style={styles.errorText}>Senha deve ter pelo menos 6 caracteres.</Text>
              ) : null}

              <View style={styles.optionsRow}>
                <Pressable 
                  style={styles.checkboxContainer} 
                  onPress={() => setRememberMe(!rememberMe)}
                  hitSlop={8}
                >
                  <Ionicons 
                    name={rememberMe ? "checkmark-circle" : "ellipse-outline"} 
                    size={22} 
                    color={rememberMe ? COLORS.primary : COLORS.icon} 
                  />
                  <Text style={styles.rememberText}>Lembre-se de mim</Text>
                </Pressable>

                <Pressable
                  onPress={onForgot}
                  hitSlop={10}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <Text style={styles.forgotText}>Esqueci minha senha</Text>
                </Pressable>
              </View>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OU CONTINUE COM</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialRow}>
                <Pressable 
                  style={styles.socialBtn}
                  onPress={() => showError({ title: "Google Login", message: "Fluxo social pendente" })}
                >
                  <Ionicons name="logo-google" size={20} color="#DB4437" />
                  <Text style={styles.socialBtnText}>Entrar com Google</Text>
                </Pressable>

                <Pressable 
                  style={styles.socialBtn}
                  onPress={() => showError({ title: "Apple Login", message: "Fluxo social pendente" })}
                >
                  <Ionicons name="logo-apple" size={20} color="#000000" />
                  <Text style={styles.socialBtnText}>Entrar com Apple</Text>
                </Pressable>
              </View>

            </View>
          </Container>
        </ScrollView>

        <View style={[styles.cta, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable
            disabled={!can}
            onPress={onSubmit}
            style={({ pressed }) => [
              styles.ctaBtn,
              !can && styles.ctaBtnDisabled,
              pressed && can ? styles.ctaBtnPressed : null,
            ]}
          >
            <Text style={styles.ctaText}>{btnText}</Text>
            {!loading && !inCooldown && (
               <Ionicons name="arrow-forward" size={20} color={COLORS.primaryText} style={styles.ctaIcon} />
            )}
          </Pressable>

          {biometricEnabled ? (
            <Pressable
              disabled={biometricLoading || loading}
              onPress={onBiometricLogin}
              style={({ pressed }) => [
                styles.bioBtn,
                (biometricLoading || loading) && styles.bioBtnDisabled,
                pressed && !(biometricLoading || loading) ? styles.bioBtnPressed : null,
              ]}
            >
              <Ionicons
                name={Platform.OS === "ios" ? "scan-outline" : "finger-print-outline"}
                size={20}
                color={COLORS.primary}
              />
              <Text style={styles.bioBtnText}>
                {biometricLoading ? "Verificando..." : "Entrar com biometria"}
              </Text>
            </Pressable>
          ) : null}

          <Text style={styles.terms}>
            Ao continuar, você concorda com os nossos{" "}
            <Text
              style={styles.termsLink}
              onPress={() =>
                showError({ title: "Termos de Uso", message: "Abrir link/rota aqui." })
              }
            >
              Termos de Uso
            </Text>{" "}
            e{" "}
            <Text
              style={styles.termsLink}
              onPress={() =>
                showError({
                  title: "Política de Privacidade",
                  message: "Abrir link/rota aqui.",
                })
              }
            >
              Política de Privacidade
            </Text>
            .
          </Text>

          <View style={styles.bottomLine}>
            <Text style={styles.bottomText}>Não tem conta? </Text>
            <Pressable
              onPress={onSignUp}
              hitSlop={10}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Text style={styles.bottomLink}>Criar uma conta</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <IosAlert
        visible={!!alert}
        title={alert?.title}
        message={alert?.message}
        onClose={() => setAlert(null)}
      />
    </Screen>
  );
}

const COLORS = {
  bg: "#FAFAFA",
  text: "#0F172A",
  sub: "#475569",
  placeholder: "#94A3B8",
  border: "#E2E8F0",
  icon: "#64748B",
  primary: "#006175", // Azul Petróleo escuro da nova UI
  primaryText: "#FFFFFF",
  link: "#006175",
  danger: "#DC2626",
  inputBg: "#FFFFFF",
  inputBgFocused: "#F0FDF4",
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },

  header: {
    alignItems: "center",
    marginBottom: 28,
  },

  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  logoIcon: {
    marginRight: 6,
  },

  logoText: {
    fontSize: 28,
    fontWeight: "900",
    color: "#1E293B",
    letterSpacing: -0.5,
  },

  h1: {
    fontSize: 26,
    color: COLORS.text,
    fontWeight: "800",
    letterSpacing: -0.8,
  },

  sub: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.sub,
    fontWeight: "500",
    textAlign: "center",
  },

  form: {
    marginTop: 2,
  },

  label: {
    marginBottom: 7,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "700",
    letterSpacing: -0.1,
  },

  inputWrap: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 14,
    justifyContent: "center",
    backgroundColor: COLORS.inputBg,
    elevation: 1, // Sombra suave para Android
    shadowColor: "#000", // Sombras para iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },

  inputWrapFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.inputBg,
    shadowOpacity: 0.1,
  },

  inputWrapError: {
    borderColor: "rgba(220,38,38,0.75)",
    backgroundColor: "#FFFDFD",
  },

  input: {
    height: "100%",
    fontSize: 15,
    color: COLORS.text,
    fontWeight: "500",
    paddingVertical: 0,
    backgroundColor: "transparent",
    includeFontPadding: false,
    textAlignVertical: "center",
  },

  passwordInput: {
    paddingRight: 42,
  },

  errorText: {
    marginTop: 7,
    color: COLORS.danger,
    fontWeight: "700",
    fontSize: 12,
  },

  eyeBtn: {
    position: "absolute",
    right: 8,
    top: 0,
    bottom: 0,
    width: 38,
    alignItems: "center",
    justifyContent: "center",
  },

  fieldGap: {
    height: 16,
  },

  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },

  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  rememberText: {
    marginLeft: 6,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "600",
  },

  forgotText: {
    fontSize: 13,
    color: COLORS.link,
    fontWeight: "700",
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 32,
    marginBottom: 24,
  },

  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
  },

  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    color: COLORS.placeholder,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  socialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  socialBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },

  socialBtnText: {
    marginLeft: 8,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "700",
  },

  cta: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: 18,
    paddingTop: 16,
  },

  ctaBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    marginBottom: 16,
  },

  ctaBtnPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },

  ctaBtnDisabled: {
    opacity: 0.5,
    elevation: 0,
    shadowOpacity: 0,
  },

  ctaText: {
    fontSize: 16,
    color: COLORS.primaryText,
    fontWeight: "800",
  },

  ctaIcon: {
    marginLeft: 8,
  },

  bioBtn: {
    marginBottom: 16,
    height: 54,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: COLORS.primary,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  bioBtnPressed: {
    opacity: 0.6,
  },

  bioBtnDisabled: {
    opacity: 0.4,
  },

  bioBtnText: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: "800",
  },

  terms: {
    textAlign: "center",
    fontSize: 11,
    color: COLORS.sub,
    fontWeight: "500",
    marginBottom: 16,
    lineHeight: 16,
  },

  termsLink: {
    color: COLORS.text,
    fontWeight: "700",
  },

  bottomLine: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },

  bottomText: {
    fontSize: 14,
    color: COLORS.sub,
    fontWeight: "500",
  },

  bottomLink: {
    fontSize: 14,
    color: COLORS.link,
    fontWeight: "800",
  },

  pressed: {
    opacity: 0.7,
  },
});

export default LoginScreen;