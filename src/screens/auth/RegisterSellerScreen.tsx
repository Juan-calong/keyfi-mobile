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

import LinearGradient from "react-native-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";

import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";
import { useAuthStore } from "../../stores/auth.store";

import { friendlyError } from "../../core/errors/friendlyError";
import { IosAlert } from "../../ui/components/IosAlert";

const COLORS = {
  bg: "#FFFFFF",
  card: "#FFFFFF",
  text: "#0F172A",
  sub: "#64748B",
  placeholder: "#94A3B8",
  border: "#E2E8F0",
  borderStrong: "#CBD5E1",
  focus: "#2E6BFF",
  inputBg: "#F8FAFC",
  inputBgFocus: "#FFFFFF",
  error: "#DC2626",
  errorBorder: "#FCA5A5",
  errorBg: "#FFF7F7",
  primaryA: "#2E6BFF",
  primaryB: "#1F4FDB",
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

      await api.post(endpoints.auth.registerSeller, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        cnpj: cnpjDigits,
      });

const normalizedEmail = email.trim().toLowerCase();

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

      console.log("[REGISTER_SELLER][ERR]", e?.response?.data || e);
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
    ? `Tente novamente em ${formatLeft(left)}`
    : "Criar conta";

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
                <Text style={styles.backText}>Back</Text>
              </Pressable>

              <Text numberOfLines={1} style={styles.navTitle}>
                Criar conta
              </Text>

              <View style={styles.navSideSpacer} />
            </View>
          </View>

          <View style={styles.hairline} />

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
                <Text style={styles.h1}>Seller</Text>
                <Text style={styles.sub}>Crie sua conta para começar</Text>
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
                    placeholder="Nome completo"
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
                    placeholder="email@exemplo.com"
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
                    placeholder="Crie uma senha"
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
                      size={18}
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
                    placeholder="00.000.000/0000-00"
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
              <LinearGradient
                colors={[COLORS.primaryA, COLORS.primaryB]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
              <Text style={styles.btnText}>{btnText}</Text>
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
    justifyContent: "space-between",
  },

  backBtn: {
    width: 78,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
  },

  backText: {
    marginLeft: 2,
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
  },

  navTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.2,
  },

  navSideSpacer: {
    width: 78,
    minHeight: 40,
  },

  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
  },

  scrollContent: {
    flexGrow: 1,
  },

  header: {
    alignItems: "center",
    paddingTop: 18,
    paddingBottom: 14,
  },

  h1: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "900",
    letterSpacing: -0.7,
    color: COLORS.text,
  },

  sub: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.sub,
    textAlign: "center",
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
    gap: 8,
    marginTop: 8,
    marginBottom: 7,
  },

  label: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.1,
  },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.inputBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 50,
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
    height: 50,
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
    height: 10,
  },

  termsGap: {
    height: 16,
  },

  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },

  checkboxOn: {
    borderColor: COLORS.primaryA,
    backgroundColor: COLORS.primaryA,
  },

  checkboxError: {
    borderColor: COLORS.errorBorder,
  },

  termsText: {
    flex: 1,
    color: COLORS.sub,
    fontSize: 13,
    lineHeight: 18,
  },

  termsLink: {
    color: COLORS.primaryA,
    fontWeight: "800",
  },

  cta: {
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 16,
    paddingTop: 10,
  },

  ctaKeyboardOpen: {
    paddingTop: 8,
  },

  btn: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.10,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
  },

  btnDisabled: {
    opacity: 0.55,
  },

  btnPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.995 }],
  },

  btnText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },

  bottomLine: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  bottomText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.sub,
  },

  bottomLink: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.primaryA,
  },

  pressed: {
    opacity: 0.72,
  },
});

export default RegisterSellerScreen;