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
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { cnpj as cnpjValidator } from "cpf-cnpj-validator";

import Ionicons from "react-native-vector-icons/Ionicons";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";

import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";
import { useAuthStore } from "../../stores/auth.store";

import { friendlyError } from "../../core/errors/friendlyError";
import { IosAlert } from "../../ui/components/IosAlert";

const COLORS = {
  bg: "#FAFAFA",
  card: "#FAFAFA",
  text: "#0F172A",
  sub: "#475569",
  placeholder: "#94A3B8",
  border: "#E2E8F0",
  borderStrong: "#CBD5E1",
  focus: "#006175",
  inputBg: "#FFFFFF",
  inputBgFocus: "#F0FDF4",
  error: "#DC2626",
  errorBorder: "#FCA5A5",
  errorBg: "#FFF7F7",
  primary: "#006175", // Azul Petróleo da KeyFi
  primaryText: "#FFFFFF",
};

function isEmail(v: string) {
  const s = v.trim().toLowerCase();
  return s.includes("@") && s.includes(".");
}

function onlyDigits(v: string) {
  return String(v ?? "").replace(/\D+/g, "");
}

function maskCNPJ(digits: string) {
  const d = digits.slice(0, 14);
  const p1 = d.slice(0, 2);
  const p2 = d.slice(2, 5);
  const p3 = d.slice(5, 8);
  const p4 = d.slice(8, 12);
  const p5 = d.slice(12, 14);

  let out = p1;
  if (p2) out += "." + p2;
  if (p3) out += "." + p3;
  if (p4) out += "/" + p4;
  if (p5) out += "-" + p5;
  return out;
}

function FieldLabel({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.fieldLabelRow}>
      <Ionicons name={icon as any} size={16} color={COLORS.sub} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

function ErrorText({ show, text }: { show: boolean; text: string }) {
  if (!show) return null;
  return <Text style={styles.errorText}>{text}</Text>;
}

export function RegisterSellerScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const login = useAuthStore((s) => s.login);
  const queueBiometricSetup = useAuthStore((s) => s.queueBiometricSetup);
  const setNeedsOnboarding = useAuthStore((s) => s.setNeedsOnboarding);

  const [alert, setAlert] = useState<{ title: string; message: string } | null>(null);
  function showModal(title: string, message: string) {
    setAlert({ title, message });
  }

  const submittingRef = useRef(false);

  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [now, setNow] = useState(Date.now());

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const cnpjRef = useRef<TextInput>(null);

  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

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

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [cnpjMasked, setCnpjMasked] = useState("");
  const [agree, setAgree] = useState(false);

  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    cnpj: false,
    agree: false,
  });

  const [focused, setFocused] = useState({
    name: false,
    email: false,
    password: false,
    cnpj: false,
  });

  const [loading, setLoading] = useState(false);

  const nameOk = name.trim().length >= 2;
  const emailOk = isEmail(email);
  const passOk = password.trim().length >= 8;

  const cnpjDigits = useMemo(() => onlyDigits(cnpjMasked).slice(0, 14), [cnpjMasked]);
  const cnpjOk = cnpjDigits.length === 14 && cnpjValidator.isValid(cnpjDigits);

  const can = useMemo(
    () => nameOk && emailOk && passOk && cnpjOk && agree && !inCooldown && !loading,
    [nameOk, emailOk, passOk, cnpjOk, agree, inCooldown, loading]
  );

  function goBack() {
    Keyboard.dismiss();
    if (nav.canGoBack?.()) nav.goBack();
    else nav.navigate("Login");
  }

  function goLogin() {
    Keyboard.dismiss();
    nav.popToTop?.();
    if (!nav.popToTop) nav.navigate("Login");
  }

  async function onSubmit() {
    setTouched({ name: true, email: true, password: true, cnpj: true, agree: true });
    if (!can) return;

    if (submittingRef.current) return;
    submittingRef.current = true;

    try {
      Keyboard.dismiss();
      setLoading(true);

      const response = await api.post(endpoints.auth.registerSeller, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        cnpj: cnpjDigits,
      });

      const normalizedEmail = email.trim().toLowerCase();
        const requiresEmailVerification =
        response?.data?.requiresEmailVerification === true ||
        response?.data?.nextStep === "VERIFY_EMAIL";

      if (requiresEmailVerification) {
        showModal("Verificação de email", "Verifique seu email para continuar.");
        nav.navigate("VerifyEmail", {
          email: response?.data?.user?.email || normalizedEmail,
          source: "register",
        });
        return;
      }

      await login(normalizedEmail, password);
      setNeedsOnboarding(false);
      await queueBiometricSetup(normalizedEmail);
    } catch (e: any) {
      handleCooldownFromError(e);

      const retry = Number(e?.response?.data?.retryAfterSec);
      if (e?.response?.status === 429 && Number.isFinite(retry) && retry > 0) {
        showModal("Aguarde um pouco", `Muitas tentativas. Tente novamente em ${formatLeft(Math.ceil(retry))}.`);
      } else {
        const fe = friendlyError(e);
        showModal(fe.title, fe.message);
      }
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }

  const showNameErr = touched.name && !nameOk;
  const showEmailErr = touched.email && !emailOk;
  const showPassErr = touched.password && !passOk;
  const showCnpjErr = touched.cnpj && !cnpjOk;
  const showAgreeErr = touched.agree && !agree;

  const topPad = Math.max(insets.top, 10);

  const left = secondsLeft();
  const btnText = loading
    ? "Criando..."
    : inCooldown
    ? `Aguarde ${formatLeft(left)}`
    : "Criar minha conta";

  return (
    <Screen style={{ backgroundColor: COLORS.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={[styles.navbar, { paddingTop: topPad }]}>
            <View style={styles.navRow}>
              <Pressable
                onPress={goBack}
                hitSlop={12}
                style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
              >
                <Ionicons name="chevron-back" size={18} color={COLORS.text} />
                <Text style={styles.backText}>Voltar</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: keyboardOpen ? 24 : 150 },
            ]}
          >
            <Container>
              <View style={styles.header}>
                <View style={styles.logoContainer}>
                  <View style={styles.logoTextWrapper}>
                    <Text style={styles.logoText}>KeyFi</Text>
                    <Text style={styles.logoSubText}>Vendedor</Text>
                  </View>
                </View>
                <Text style={styles.h1}>Seja um Vendedor KeyFi</Text>
                <Text style={styles.sub}>
                  Preencha seus dados abaixo para começar a indicar clientes e ganhar comissões a cada venda realizada.
                </Text>
              </View>

              <View style={styles.formCard}>
                <FieldLabel icon="person-outline" label="Nome" />
                <View
                  style={[
                    styles.inputWrap,
                    focused.name && styles.inputWrapFocused,
                    showNameErr && styles.inputWrapError,
                  ]}
                >
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    onFocus={() => setFocused((s) => ({ ...s, name: true }))}
                    onBlur={() => {
                      setFocused((s) => ({ ...s, name: false }));
                      setTouched((s) => ({ ...s, name: true }));
                    }}
                    placeholder="Ex: João Silva"
                    placeholderTextColor={COLORS.placeholder}
                    style={styles.input}
                    selectionColor={COLORS.focus}
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                    autoCorrect={false}
                    underlineColorAndroid="transparent"
                  />
                </View>
                <ErrorText show={showNameErr} text="Nome muito curto." />

                <View style={styles.gap} />
                <FieldLabel icon="mail-outline" label="Email" />
                <View
                  style={[
                    styles.inputWrap,
                    focused.email && styles.inputWrapFocused,
                    showEmailErr && styles.inputWrapError,
                  ]}
                >
                  <TextInput
                    ref={emailRef}
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocused((s) => ({ ...s, email: true }))}
                    onBlur={() => {
                      setFocused((s) => ({ ...s, email: false }));
                      setTouched((s) => ({ ...s, email: true }));
                    }}
                    placeholder="vendedor@keyfi.com"
                    placeholderTextColor={COLORS.placeholder}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    autoComplete="email"
                    textContentType="emailAddress"
                    style={styles.input}
                    selectionColor={COLORS.focus}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    underlineColorAndroid="transparent"
                  />
                </View>
                <ErrorText show={showEmailErr} text="Email inválido." />

                <View style={styles.gap} />
                <FieldLabel icon="lock-closed-outline" label="Senha" />
                <View
                  style={[
                    styles.inputWrap,
                    focused.password && styles.inputWrapFocused,
                    showPassErr && styles.inputWrapError,
                  ]}
                >
                  <TextInput
                    ref={passwordRef}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocused((s) => ({ ...s, password: true }))}
                    onBlur={() => {
                      setFocused((s) => ({ ...s, password: false }));
                      setTouched((s) => ({ ...s, password: true }));
                    }}
                    placeholder="Crie uma senha forte (min. 8 chars)"
                    placeholderTextColor={COLORS.placeholder}
                    secureTextEntry={secure}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="password"
                    textContentType="newPassword"
                    style={[styles.input, styles.inputWithRightButton]}
                    selectionColor={COLORS.focus}
                    returnKeyType="next"
                    onSubmitEditing={() => cnpjRef.current?.focus()}
                    underlineColorAndroid="transparent"
                  />
                  <Pressable
                    onPress={() => setSecure((s) => !s)}
                    hitSlop={10}
                    style={({ pressed }) => [styles.rightBtn, pressed && styles.pressed]}
                  >
                    <Ionicons
                      name={secure ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color={COLORS.sub}
                    />
                  </Pressable>
                </View>
                <ErrorText show={showPassErr} text="Mínimo de 8 caracteres." />

                <View style={styles.gap} />
                <FieldLabel icon="briefcase-outline" label="CNPJ" />
                <View
                  style={[
                    styles.inputWrap,
                    focused.cnpj && styles.inputWrapFocused,
                    showCnpjErr && styles.inputWrapError,
                  ]}
                >
                  <TextInput
                    ref={cnpjRef}
                    value={cnpjMasked}
                    onChangeText={(txt) => setCnpjMasked(maskCNPJ(onlyDigits(txt)))}
                    onFocus={() => setFocused((s) => ({ ...s, cnpj: true }))}
                    onBlur={() => {
                      setFocused((s) => ({ ...s, cnpj: false }));
                      setTouched((s) => ({ ...s, cnpj: true }));
                    }}
                    placeholder="12.345.678/0001-90"
                    placeholderTextColor={COLORS.placeholder}
                    keyboardType="numeric"
                    style={styles.input}
                    selectionColor={COLORS.focus}
                    returnKeyType="done"
                    onSubmitEditing={onSubmit}
                    underlineColorAndroid="transparent"
                  />
                </View>
                <ErrorText show={showCnpjErr} text="CNPJ inválido." />

                <View style={styles.termsGap} />
                <View style={styles.termsRow}>
                  <Pressable
                    onPress={() => {
                      setAgree((v) => !v);
                      setTouched((s) => ({ ...s, agree: true }));
                    }}
                    hitSlop={10}
                    style={[
                      styles.checkbox,
                      agree && styles.checkboxOn,
                      showAgreeErr && styles.checkboxError,
                    ]}
                  >
                    {agree ? <Ionicons name="checkmark" size={14} color="#FFF" /> : null}
                  </Pressable>

                  <Text style={styles.termsText}>
                    Eu li e aceito os{" "}
                    <Text
                      style={styles.termsLink}
                      onPress={() => showModal("Termos", "Abrir link/rota aqui.")}
                    >
                      Termos de Uso
                    </Text>{" "}
                    e a{" "}
                    <Text
                      style={styles.termsLink}
                      onPress={() => showModal("Privacidade", "Abrir link/rota aqui.")}
                    >
                      Política de Privacidade
                    </Text>
                    .
                  </Text>
                </View>
                <ErrorText
                  show={showAgreeErr}
                  text="Você precisa aceitar os termos para continuar."
                />
              </View>
            </Container>
          </ScrollView>

          <View
            style={[
              styles.cta,
              keyboardOpen && styles.ctaKeyboardOpen,
              { paddingBottom: Math.max(insets.bottom, keyboardOpen ? 8 : 14) },
            ]}
          >
            <Pressable
              disabled={!can}
              onPress={onSubmit}
              style={({ pressed }) => [
                styles.btn,
                !can && styles.btnDisabled,
                pressed && can ? styles.btnPressed : null,
              ]}
            >
              <Text style={styles.btnText}>{btnText}</Text>
              {!loading && !inCooldown && (
                 <Ionicons name="arrow-forward" size={20} color={COLORS.primaryText} style={styles.btnIcon} />
              )}
            </Pressable>

            {!keyboardOpen ? (
              <View style={styles.bottomLine}>
                <Text style={styles.bottomText}>Já tem conta? </Text>
                <Pressable onPress={goLogin} hitSlop={10} style={({ pressed }) => pressed && styles.pressed}>
                  <Text style={styles.bottomLink}>Entrar</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          <IosAlert
            visible={!!alert}
            title={alert?.title}
            message={alert?.message}
            onClose={() => setAlert(null)}
          />
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Screen>
  );
}

const styles = StyleSheet.create({
  navbar: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: 14,
    paddingBottom: 8,
  },

  navRow: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
  },

  backBtn: {
    flexDirection: "row",
    alignItems: "center",
  },

  backText: {
    marginLeft: 2,
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },

  scrollContent: {
    flexGrow: 1,
  },

  header: {
    alignItems: "center",
    paddingTop: 18,
    paddingBottom: 24,
  },

  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  logoIcon: {
    marginRight: 8,
  },

  logoTextWrapper: {
    alignItems: "flex-start",
  },

  logoText: {
    fontSize: 26,
    fontWeight: "900",
    color: "#1E293B",
    letterSpacing: -0.5,
    lineHeight: 26,
  },

  logoSubText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
    letterSpacing: 0.5,
  },

  h1: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: COLORS.text,
    textAlign: "center",
  },

  sub: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.sub,
    textAlign: "center",
    paddingHorizontal: 10,
    lineHeight: 20,
  },

  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },

  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    marginBottom: 7,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: -0.1,
  },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 52,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },

  inputWrapFocused: {
    borderColor: COLORS.focus,
    backgroundColor: COLORS.inputBgFocus,
  },

  inputWrapError: {
    borderColor: COLORS.errorBorder,
    backgroundColor: COLORS.errorBg,
  },

  input: {
    flex: 1,
    height: 52,
    fontSize: 15,
    color: COLORS.text,
    paddingVertical: 0,
    backgroundColor: "transparent",
    includeFontPadding: false,
    textAlignVertical: "center",
  },

  inputWithRightButton: {
    paddingRight: 42,
  },

  rightBtn: {
    position: "absolute",
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  errorText: {
    marginTop: 6,
    color: COLORS.error,
    fontWeight: "700",
    fontSize: 12,
  },

  gap: {
    height: 16,
  },

  termsGap: {
    height: 24,
  },

  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -2,
  },

  checkboxOn: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },

  checkboxError: {
    borderColor: COLORS.error,
  },

  termsText: {
    flex: 1,
    color: COLORS.sub,
    fontSize: 13,
    lineHeight: 18,
  },

  termsLink: {
    color: COLORS.primary,
    fontWeight: "700",
  },

  cta: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: 16,
    paddingTop: 10,
  },

  ctaKeyboardOpen: {
    paddingTop: 8,
  },

  btn: {
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

  btnDisabled: {
    opacity: 0.55,
    elevation: 0,
    shadowOpacity: 0,
  },

  btnPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },

  btnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  btnIcon: {
    marginLeft: 8,
  },

  bottomLine: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },

  bottomText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.sub,
  },

  bottomLink: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.primary,
  },

  pressed: {
    opacity: 0.72,
  },
});

export default RegisterSellerScreen;