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
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { useAuthStore } from "../../stores/auth.store";
import { friendlyError } from "../../core/errors/friendlyError";
import { IosAlert } from "../../ui/components/IosAlert";
import { getBiometricStatus } from "../../core/security/keychain";

function isEmail(v: string) {
  const s = v.trim().toLowerCase();
  return s.includes("@") && s.includes(".");
}

export function LoginScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const login = useAuthStore((s) => s.login);
  const loginWithBiometrics = useAuthStore((s) => s.loginWithBiometrics);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);

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
    ? `Tente novamente em ${formatLeft(left)}`
    : "Entrar";

  async function onSubmit() {
    setTouched({ email: true, password: true });
    if (!can) return;

    if (submittingRef.current) return;
    submittingRef.current = true;

    try {
      setLoading(true);
      await login(email.trim(), password);

      const token = useAuthStore.getState().token;
      console.log("TOKEN", token);
    } catch (e: any) {
      showError(friendlyError(e));
      handleCooldownFromError(e);

      const code = String(e?.response?.data?.code ?? "").toUpperCase();
      const status = e?.response?.status;

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

      <View style={[styles.navbar, { paddingTop: topPad }]}>
        <View style={{ width: 32 }} />
        <Text style={styles.navTitle}>Entrar</Text>

        <Pressable
          hitSlop={12}
          onPress={() =>
            showError({
              title: "Ajuda",
              message: "Coloque aqui sua tela/ação de ajuda.",
            })
          }
          style={({ pressed }) => [styles.helpBtn, pressed && styles.pressed]}
        >
          <Text style={styles.helpIcon}>?</Text>
        </Pressable>
      </View>

      <View style={styles.hairline} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Container>
            <View style={styles.header}>
              <Text style={styles.h1}>Bem-vindo</Text>
              <Text style={styles.sub}>Faça login para continuar</Text>
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

              <Pressable
                onPress={onForgot}
                hitSlop={10}
                style={({ pressed }) => [styles.forgot, pressed && styles.pressed]}
              >
                <Text style={styles.forgotText}>Esqueci minha senha</Text>
              </Pressable>

              <View style={[styles.hairline, { marginTop: 18 }]} />
            </View>
          </Container>
        </ScrollView>

        <View style={[styles.cta, { paddingBottom: Math.max(insets.bottom, 12) }]}>
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

const HAIRLINE = StyleSheet.hairlineWidth;

const COLORS = {
  bg: "#FFFFFF",
  text: "#0F172A",
  sub: "#475569",
  placeholder: "#94A3B8",
  border: "#E2E8F0",
  borderStrong: "#94A3B8",
  icon: "#334155",
  primary: "#0B63F6",
  primaryText: "#FFFFFF",
  link: "#0B63F6",
  danger: "#DC2626",
  inputBg: "#FFFFFF",
  inputBgFocused: "#F8FAFC",
};

const styles = StyleSheet.create({
  navbar: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: 16,
    paddingBottom: 8,
    height: 44 + 14,
    justifyContent: "flex-end",
    alignItems: "center",
  },

  navTitle: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "800",
    letterSpacing: -0.2,
  },

  helpBtn: {
    position: "absolute",
    right: 16,
    bottom: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
  },

  helpIcon: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    marginTop: -1,
  },

  hairline: {
    height: HAIRLINE,
    backgroundColor: COLORS.border,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120,
  },

  header: {
    alignItems: "center",
    marginTop: 18,
    marginBottom: 18,
  },

  h1: {
    fontSize: 31,
    lineHeight: 36,
    color: COLORS.text,
    fontWeight: "900",
    letterSpacing: -0.8,
  },

  sub: {
    marginTop: 6,
    fontSize: 14,
    color: COLORS.sub,
    fontWeight: "600",
    letterSpacing: -0.1,
  },

  form: {
    marginTop: 2,
  },

  label: {
    marginBottom: 7,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "800",
    letterSpacing: -0.1,
  },

  inputWrap: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    height: 50,
    paddingHorizontal: 14,
    justifyContent: "center",
    backgroundColor: COLORS.inputBg,
  },

  inputWrapFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.inputBgFocused,
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
    height: 14,
  },

  forgot: {
    alignSelf: "flex-start",
    marginTop: 10,
  },

  forgotText: {
    fontSize: 13,
    color: COLORS.link,
    fontWeight: "800",
    letterSpacing: -0.1,
  },

  cta: {
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 18,
    paddingTop: 10,
  },

  terms: {
    textAlign: "center",
    fontSize: 12,
    color: COLORS.sub,
    fontWeight: "500",
    marginBottom: 10,
    lineHeight: 17,
  },

  termsLink: {
    color: COLORS.link,
    fontWeight: "800",
  },

  ctaBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },

  ctaBtnPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },

  ctaBtnDisabled: {
    opacity: 0.5,
  },

  ctaText: {
    fontSize: 16,
    color: COLORS.primaryText,
    fontWeight: "900",
    letterSpacing: -0.1,
  },

  bioBtn: {
    marginTop: 10,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: COLORS.primary,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },

  bioBtnPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },

  bioBtnDisabled: {
    opacity: 0.6,
  },

  bioBtnText: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: "900",
    letterSpacing: -0.1,
  },

  bottomLine: {
    marginTop: 12,
    marginBottom: 2,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  bottomText: {
    fontSize: 13,
    color: COLORS.sub,
    fontWeight: "500",
    letterSpacing: -0.1,
  },

  bottomLink: {
    fontSize: 13,
    color: COLORS.link,
    fontWeight: "800",
    letterSpacing: -0.1,
    textDecorationLine: "underline",
  },

  pressed: {
    opacity: 0.75,
  },
});

export default LoginScreen;