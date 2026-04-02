import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  TextInputProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { cnpj as cnpjValidator } from "cpf-cnpj-validator";
import { fetchAddressByCep, formatCep } from "../../core/utils/cep";
import { fetchCompanyByCnpj } from "../../core/utils/cnpj";

import Ionicons from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";

import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";
import { useAuthStore } from "../../stores/auth.store";
import { friendlyError } from "../../core/errors/friendlyError";
import { IosAlert } from "../../ui/components/IosAlert";

type Step = 1 | 2;

type CompanyInfo = {
  companyName: string;
  tradeName: string;
  status: string;
  cnae: string;
  secondaryCnaes: string[];
};

const TOKEN_RE = /^[A-HJ-NP-Z2-9]{8}$/;

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
  successBg: "#F8FAFC",
};

function isEmail(v: string) {
  const s = v.trim().toLowerCase();
  return s.includes("@") && s.includes(".");
}

function onlyDigits(v: string) {
  return String(v ?? "").replace(/\D+/g, "");
}

function normalizeToken(v: string) {
  return String(v ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

function normalizeCEP(v: string) {
  return onlyDigits(v).slice(0, 8);
}

function normalizeUF(v: string) {
  return String(v ?? "").trim().toUpperCase().slice(0, 2);
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

type InputRowProps = {
  value: string;
  onChangeText: (v: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  placeholder: string;
  error?: boolean;
  focused?: boolean;
  inputRef?: React.RefObject<TextInput | null>;
  right?: React.ReactNode;
  editable?: boolean;
} & Pick<
  TextInputProps,
  | "keyboardType"
  | "autoCapitalize"
  | "autoCorrect"
  | "secureTextEntry"
  | "returnKeyType"
  | "onSubmitEditing"
  | "autoComplete"
  | "textContentType"
>;

function InputRow({
  value,
  onChangeText,
  onBlur,
  onFocus,
  placeholder,
  keyboardType,
  autoCapitalize,
  autoCorrect,
  secureTextEntry,
  right,
  error,
  focused,
  inputRef,
  returnKeyType,
  onSubmitEditing,
  autoComplete,
  textContentType,
  editable = true,
}: InputRowProps) {
  return (
    <View
      style={[
        styles.inputWrap,
        focused && styles.inputWrapFocused,
        error && styles.inputWrapError,
        !editable && styles.inputWrapReadonly,
      ]}
    >
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        onFocus={onFocus}
        placeholder={placeholder}
        placeholderTextColor={COLORS.placeholder}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        secureTextEntry={secureTextEntry}
        style={[styles.input, right ? styles.inputWithRightButton : null]}
        selectionColor={COLORS.focus}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        autoComplete={autoComplete}
        textContentType={textContentType}
        underlineColorAndroid="transparent"
        editable={editable}
      />
      {right}
    </View>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  if (!value?.trim()) return null;
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export function RegisterSalonScreen() {
  const nav = useNavigation<any>();
  const insets = useSafeAreaInsets();

const login = useAuthStore((s) => s.login);
const queueBiometricSetup = useAuthStore((s) => s.queueBiometricSetup);
const setNeedsOnboarding = useAuthStore((s) => s.setNeedsOnboarding);

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  const [alert, setAlert] = useState<{ title: string; message: string } | null>(null);
  function showModal(title: string, message: string) {
    setAlert({ title, message });
  }

  const submittingRef = useRef(false);

  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [now, setNow] = useState(Date.now());
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

  const ownerNameRef = useRef<TextInput>(null);
  const ownerEmailRef = useRef<TextInput>(null);
  const ownerPasswordRef = useRef<TextInput>(null);

  const salonNameRef = useRef<TextInput>(null);
  const salonEmailRef = useRef<TextInput>(null);
  const cnpjRef = useRef<TextInput>(null);
  const cepRef = useRef<TextInput>(null);
  const streetRef = useRef<TextInput>(null);
  const numberRef = useRef<TextInput>(null);
  const districtRef = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);
  const stateRef = useRef<TextInput>(null);
  const complementRef = useRef<TextInput>(null);
  const referralRef = useRef<TextInput>(null);

  const [focused, setFocused] = useState({
    ownerName: false,
    ownerEmail: false,
    ownerPassword: false,
    salonName: false,
    salonEmail: false,
    cnpj: false,
    cep: false,
    street: false,
    number: false,
    district: false,
    city: false,
    state: false,
    complement: false,
    referralToken: false,
  });

  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [ownerSecure, setOwnerSecure] = useState(true);

  const [salonName, setSalonName] = useState("");
  const [salonEmail, setSalonEmail] = useState("");
  const [cnpjMasked, setCnpjMasked] = useState("");

  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [complement, setComplement] = useState("");

  const [referralToken, setReferralToken] = useState("");
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);

  const lastCepFetchedRef = useRef("");
  const lastCnpjFetchedRef = useRef("");
  const addressManuallyEditedRef = useRef(false);
  const salonNameManuallyEditedRef = useRef(false);

  function markAddressEdited() {
    addressManuallyEditedRef.current = true;
  }

  async function fillAddressFromCep(rawCep: string) {
    const cleanCep = onlyDigits(rawCep);

    if (cleanCep.length !== 8) return;
    if (lastCepFetchedRef.current === cleanCep) return;

    try {
      const data = await fetchAddressByCep(cleanCep);

      setCep(formatCep(data.cep || cleanCep));
      setStreet(data.street || "");
      setDistrict(data.district || "");
      setCity(data.city || "");
      setState(data.state || "");

      lastCepFetchedRef.current = cleanCep;
    } catch (e: any) {
      lastCepFetchedRef.current = "";
      showModal("CEP", e?.response?.data?.message || "Não foi possível consultar o CEP.");
    }
  }

  async function fillCompanyFromCnpj(rawCnpj: string) {
    const cleanCnpj = onlyDigits(rawCnpj);

    if (cleanCnpj.length !== 14) return;
    if (lastCnpjFetchedRef.current === cleanCnpj) return;

    try {
      const data = await fetchCompanyByCnpj(cleanCnpj);

      const tradeName = String(data.tradeName ?? "").trim();
      const companyName = String(data.companyName ?? "").trim();
      const mainCnae = String(data.cnae ?? "").trim();
      const secondary = Array.isArray(data.secondaryCnaes)
        ? data.secondaryCnaes.map((item) => String(item).trim()).filter(Boolean)
        : [];

      setCnpjMasked(maskCNPJ(data.cnpj || cleanCnpj));
      setCompanyInfo({
        companyName,
        tradeName,
        status: String(data.status ?? "").trim(),
        cnae: mainCnae,
        secondaryCnaes: secondary,
      });

      if (!salonNameManuallyEditedRef.current && !salonName.trim()) {
        const preferredName = tradeName || companyName;
        if (preferredName.length >= 2) {
          setSalonName(preferredName);
        }
      }

      const canHydrateAddress = !addressManuallyEditedRef.current;

      if (canHydrateAddress) {
        if (data.zipcode) setCep(formatCep(data.zipcode));
        if (data.street) setStreet(data.street);
        if (data.number) setNumber(data.number);
        if (data.district) setDistrict(data.district);
        if (data.city) setCity(data.city);
        if (data.state) setState(data.state);
        if (data.complement) setComplement(data.complement);
      }

      lastCnpjFetchedRef.current = cleanCnpj;

      const shouldFallbackToCep =
        canHydrateAddress &&
        !!data.zipcode &&
        (!data.street || !data.city || !data.state);

      if (shouldFallbackToCep) {
        await fillAddressFromCep(data.zipcode);
      }
    } catch (e: any) {
      lastCnpjFetchedRef.current = "";
      setCompanyInfo(null);
      showModal("CNPJ", e?.response?.data?.message || "Não foi possível consultar o CNPJ.");
    }
  }

  function handleCepChange(text: string) {
    const masked = formatCep(text);
    const cleanCep = onlyDigits(masked);

    setCep(masked);

    if (cleanCep.length < 8) {
      lastCepFetchedRef.current = "";
    }
  }

  function handleCnpjChange(text: string) {
    const masked = maskCNPJ(onlyDigits(text));
    const cleanCnpj = onlyDigits(masked);

    setCnpjMasked(masked);

    if (cleanCnpj.length < 14) {
      lastCnpjFetchedRef.current = "";
      setCompanyInfo(null);
    }
  }

  useEffect(() => {
    const cleanCep = onlyDigits(cep);

    if (cleanCep.length === 8 && lastCepFetchedRef.current !== cleanCep) {
      void fillAddressFromCep(cleanCep);
    }
  }, [cep]);

  useEffect(() => {
    const cleanCnpj = onlyDigits(cnpjMasked).slice(0, 14);

    if (cleanCnpj.length === 14 && lastCnpjFetchedRef.current !== cleanCnpj) {
      void fillCompanyFromCnpj(cleanCnpj);
    }
  }, [cnpjMasked]);

  const [touched, setTouched] = useState({
    ownerName: false,
    ownerEmail: false,
    ownerPassword: false,

    salonName: false,
    salonEmail: false,
    cnpj: false,

    cep: false,
    street: false,
    number: false,
    district: false,
    city: false,
    state: false,
    complement: false,

    referralToken: false,
  });

  const ownerNameOk = ownerName.trim().length >= 2;
  const ownerEmailOk = isEmail(ownerEmail);
  const ownerPassOk = ownerPassword.trim().length >= 8;
  const canStep1 = ownerNameOk && ownerEmailOk && ownerPassOk;

  const salonNameOk = salonName.trim().length >= 2;
  const salonEmailOk = isEmail(salonEmail);

  const cnpjDigits = useMemo(() => onlyDigits(cnpjMasked).slice(0, 14), [cnpjMasked]);
  const cnpjOk = cnpjDigits.length === 14 && cnpjValidator.isValid(cnpjDigits);

  const cepDigits = useMemo(() => normalizeCEP(cep), [cep]);
  const cepOk = cepDigits.length === 8;
  const streetOk = street.trim().length >= 2;
  const numberOk = number.trim().length >= 1;
  const districtOk = district.trim().length >= 2;
  const cityOk = city.trim().length >= 2;
  const uf = useMemo(() => normalizeUF(state), [state]);
  const stateOk = uf.length === 2;

  const tokenNorm = useMemo(() => normalizeToken(referralToken), [referralToken]);
  const tokenOk = !tokenNorm || TOKEN_RE.test(tokenNorm);

  const canStep2 =
    salonNameOk &&
    salonEmailOk &&
    cnpjOk &&
    cepOk &&
    streetOk &&
    numberOk &&
    districtOk &&
    cityOk &&
    stateOk &&
    tokenOk;

  function goLogin() {
    Keyboard.dismiss();
    nav.popToTop?.();
    if (!nav.popToTop) nav.navigate("Login");
  }

  function markTouchedStep1() {
    setTouched((s) => ({
      ...s,
      ownerName: true,
      ownerEmail: true,
      ownerPassword: true,
    }));
  }

  function markTouchedStep2() {
    setTouched((s) => ({
      ...s,
      salonName: true,
      salonEmail: true,
      cnpj: true,
      cep: true,
      street: true,
      number: true,
      district: true,
      city: true,
      state: true,
      complement: true,
      referralToken: true,
    }));
  }

  function next() {
    markTouchedStep1();
    if (!canStep1) return;
    Keyboard.dismiss();
    setStep(2);
  }

  function back() {
    Keyboard.dismiss();
    if (step === 1) return goLogin();
    setStep(1);
  }

  async function submit() {
    markTouchedStep2();
    if (!canStep2 || loading || inCooldown) return;

    if (submittingRef.current) return;
    submittingRef.current = true;

    try {
      Keyboard.dismiss();
      setLoading(true);

      await api.post(endpoints.auth.registerSalon, {
        owner: {
          name: ownerName.trim(),
          email: ownerEmail.trim().toLowerCase(),
          password: ownerPassword,
        },
        salon: {
          name: salonName.trim(),
          cnpj: cnpjDigits,
          email: salonEmail.trim().toLowerCase(),
          cep: cepDigits,
          street: street.trim(),
          number: number.trim(),
          district: district.trim(),
          city: city.trim(),
          state: uf,
          complement: complement.trim() || "",
        },
        referralToken: tokenNorm ? tokenNorm : undefined,
      });

const normalizedEmail = ownerEmail.trim().toLowerCase();

await login(normalizedEmail, ownerPassword);
setNeedsOnboarding(false);
await queueBiometricSetup(normalizedEmail);
    } catch (e: any) {
      handleCooldownFromError(e);

      const retry = Number(e?.response?.data?.retryAfterSec);
      if (e?.response?.status === 429 && Number.isFinite(retry) && retry > 0) {
        showModal(
          "Aguarde um pouco",
          `Muitas tentativas. Tente novamente em ${formatLeft(Math.ceil(retry))}.`
        );
      } else {
        const fe = friendlyError(e);
        showModal(fe.title, fe.message);
      }

      console.log("[REGISTER_SALON][ERR]", e?.response?.data || e);
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }

  const showOwnerNameErr = touched.ownerName && !ownerNameOk;
  const showOwnerEmailErr = touched.ownerEmail && !ownerEmailOk;
  const showOwnerPassErr = touched.ownerPassword && !ownerPassOk;

  const showSalonNameErr = touched.salonName && !salonNameOk;
  const showSalonEmailErr = touched.salonEmail && !salonEmailOk;
  const showCnpjErr = touched.cnpj && !cnpjOk;
  const showCepErr = touched.cep && !cepOk;
  const showStreetErr = touched.street && !streetOk;
  const showNumberErr = touched.number && !numberOk;
  const showDistrictErr = touched.district && !districtOk;
  const showCityErr = touched.city && !cityOk;
  const showStateErr = touched.state && !stateOk;
  const showTokenErr = touched.referralToken && !tokenOk;

  const topPad = Math.max(insets.top, 10);

  const left = secondsLeft();
  const ctaDisabled =
    (step === 1 ? !canStep1 : !canStep2) || loading || (step === 2 && inCooldown);

  const ctaText = loading
    ? "Criando..."
    : step === 1
    ? "Próximo"
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
                onPress={back}
                hitSlop={12}
                style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
              >
                <Ionicons name="chevron-back" size={18} color={COLORS.text} />
                <Text style={styles.backText}>Back</Text>
              </Pressable>

              <Text numberOfLines={1} style={styles.navTitle}>
                Criar conta
              </Text>

              <View style={styles.navRight}>
                <Text style={styles.stepBadge}>{step}/2</Text>
              </View>
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
                <Text style={styles.h1}>Salão</Text>
                <Text style={styles.sub}>
                  Preencha os dados abaixo para criar sua conta
                </Text>
              </View>

              <View style={styles.formCard}>
                {step === 1 ? (
                  <>
                    <Text style={styles.sectionTitle}>Responsável</Text>

                    <FieldLabel icon="person-outline" label="Nome do responsável" />
                    <InputRow
                      inputRef={ownerNameRef}
                      value={ownerName}
                      onChangeText={setOwnerName}
                      onFocus={() => setFocused((s) => ({ ...s, ownerName: true }))}
                      onBlur={() => {
                        setFocused((s) => ({ ...s, ownerName: false }));
                        setTouched((s) => ({ ...s, ownerName: true }));
                      }}
                      placeholder="Nome completo"
                      error={showOwnerNameErr}
                      focused={focused.ownerName}
                      returnKeyType="next"
                      onSubmitEditing={() => ownerEmailRef.current?.focus()}
                      autoCorrect={false}
                    />
                    <ErrorText show={showOwnerNameErr} text="Nome muito curto." />

                    <View style={styles.gap} />

                    <FieldLabel icon="mail-outline" label="Email" />
                    <InputRow
                      inputRef={ownerEmailRef}
                      value={ownerEmail}
                      onChangeText={setOwnerEmail}
                      onFocus={() => setFocused((s) => ({ ...s, ownerEmail: true }))}
                      onBlur={() => {
                        setFocused((s) => ({ ...s, ownerEmail: false }));
                        setTouched((s) => ({ ...s, ownerEmail: true }));
                      }}
                      placeholder="email@exemplo.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      textContentType="emailAddress"
                      error={showOwnerEmailErr}
                      focused={focused.ownerEmail}
                      returnKeyType="next"
                      onSubmitEditing={() => ownerPasswordRef.current?.focus()}
                    />
                    <ErrorText show={showOwnerEmailErr} text="Email inválido." />

                    <View style={styles.gap} />

                    <FieldLabel icon="lock-closed-outline" label="Senha" />
                    <InputRow
                      inputRef={ownerPasswordRef}
                      value={ownerPassword}
                      onChangeText={setOwnerPassword}
                      onFocus={() => setFocused((s) => ({ ...s, ownerPassword: true }))}
                      onBlur={() => {
                        setFocused((s) => ({ ...s, ownerPassword: false }));
                        setTouched((s) => ({ ...s, ownerPassword: true }));
                      }}
                      placeholder="Crie uma senha"
                      secureTextEntry={ownerSecure}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="password"
                      textContentType="newPassword"
                      error={showOwnerPassErr}
                      focused={focused.ownerPassword}
                      right={
                        <Pressable
                          onPress={() => setOwnerSecure((s) => !s)}
                          hitSlop={10}
                          style={({ pressed }) => [styles.rightBtn, pressed && styles.pressed]}
                        >
                          <Ionicons
                            name={ownerSecure ? "eye-outline" : "eye-off-outline"}
                            size={18}
                            color={COLORS.sub}
                          />
                        </Pressable>
                      }
                      returnKeyType="done"
                      onSubmitEditing={next}
                    />
                    <ErrorText show={showOwnerPassErr} text="Mínimo de 8 caracteres." />
                  </>
                ) : (
                  <>
                    <Text style={styles.sectionTitle}>Dados do salão</Text>

                    <FieldLabel icon="storefront-outline" label="Nome do salão" />
                    <InputRow
                      inputRef={salonNameRef}
                      value={salonName}
                      onChangeText={(text) => {
                        salonNameManuallyEditedRef.current = true;
                        setSalonName(text);
                      }}
                      onFocus={() => setFocused((s) => ({ ...s, salonName: true }))}
                      onBlur={() => {
                        setFocused((s) => ({ ...s, salonName: false }));
                        setTouched((s) => ({ ...s, salonName: true }));
                      }}
                      placeholder="Nome do salão"
                      error={showSalonNameErr}
                      focused={focused.salonName}
                      returnKeyType="next"
                      onSubmitEditing={() => salonEmailRef.current?.focus()}
                    />
                    <ErrorText show={showSalonNameErr} text="Nome muito curto." />

                    <View style={styles.gap} />

                    <FieldLabel icon="mail-outline" label="Email do salão" />
                    <InputRow
                      inputRef={salonEmailRef}
                      value={salonEmail}
                      onChangeText={setSalonEmail}
                      onFocus={() => setFocused((s) => ({ ...s, salonEmail: true }))}
                      onBlur={() => {
                        setFocused((s) => ({ ...s, salonEmail: false }));
                        setTouched((s) => ({ ...s, salonEmail: true }));
                      }}
                      placeholder="salao@exemplo.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      textContentType="emailAddress"
                      error={showSalonEmailErr}
                      focused={focused.salonEmail}
                      returnKeyType="next"
                      onSubmitEditing={() => cnpjRef.current?.focus()}
                    />
                    <ErrorText show={showSalonEmailErr} text="Email inválido." />

                    <View style={styles.gap} />

                    <FieldLabel icon="briefcase-outline" label="CNPJ" />
                    <InputRow
                      inputRef={cnpjRef}
                      value={cnpjMasked}
                      onChangeText={handleCnpjChange}
                      onFocus={() => setFocused((s) => ({ ...s, cnpj: true }))}
                      onBlur={() => {
                        setFocused((s) => ({ ...s, cnpj: false }));
                        setTouched((s) => ({ ...s, cnpj: true }));
                      }}
                      placeholder="00.000.000/0000-00"
                      keyboardType="numeric"
                      error={showCnpjErr}
                      focused={focused.cnpj}
                      returnKeyType="next"
                      onSubmitEditing={() => cepRef.current?.focus()}
                    />
                    <ErrorText show={showCnpjErr} text="CNPJ inválido." />

                    {companyInfo ? (
                      <>
                        <View style={styles.gap} />
                        <View style={styles.infoCard}>
                          <Text style={styles.infoCardTitle}>Dados encontrados do CNPJ</Text>

                          <InfoItem
                            label="Razão social"
                            value={companyInfo.companyName}
                          />
                          <InfoItem
                            label="Nome fantasia"
                            value={companyInfo.tradeName}
                          />
                          <InfoItem
                            label="Situação"
                            value={companyInfo.status}
                          />
                          <InfoItem
                            label="CNAE principal"
                            value={companyInfo.cnae}
                          />
                          <InfoItem
                            label="CNAEs secundários"
                            value={companyInfo.secondaryCnaes.join(", ")}
                          />

                          <Text style={styles.infoHelp}>
                            Os CNAEs são apenas informativos aqui. A validação real
                            acontece no backend a partir do CNPJ.
                          </Text>
                        </View>
                      </>
                    ) : null}

                    <View style={styles.divider} />

                    <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Endereço</Text>

                    <FieldLabel icon="location-outline" label="CEP" />
                    <InputRow
                      inputRef={cepRef}
                      value={cep}
                      onChangeText={handleCepChange}
                      onFocus={() => setFocused((s) => ({ ...s, cep: true }))}
                      onBlur={() => {
                        setFocused((s) => ({ ...s, cep: false }));
                        setTouched((s) => ({ ...s, cep: true }));
                      }}
                      placeholder="00000-000"
                      keyboardType="numeric"
                      error={showCepErr}
                      focused={focused.cep}
                      returnKeyType="next"
                      onSubmitEditing={() => streetRef.current?.focus()}
                    />
                    <ErrorText show={showCepErr} text="CEP inválido." />

                    <View style={styles.gap} />

                    <FieldLabel icon="map-outline" label="Rua" />
                    <InputRow
                      inputRef={streetRef}
                      value={street}
                      onChangeText={(text) => {
                        markAddressEdited();
                        setStreet(text);
                      }}
                      onFocus={() => setFocused((s) => ({ ...s, street: true }))}
                      onBlur={() => {
                        setFocused((s) => ({ ...s, street: false }));
                        setTouched((s) => ({ ...s, street: true }));
                      }}
                      placeholder="Rua"
                      error={showStreetErr}
                      focused={focused.street}
                      returnKeyType="next"
                      onSubmitEditing={() => numberRef.current?.focus()}
                    />
                    <ErrorText show={showStreetErr} text="Rua muito curta." />

                    <View style={styles.gap} />

                    <FieldLabel icon="home-outline" label="Número" />
                    <InputRow
                      inputRef={numberRef}
                      value={number}
                      onChangeText={(text) => {
                        markAddressEdited();
                        setNumber(text);
                      }}
                      onFocus={() => setFocused((s) => ({ ...s, number: true }))}
                      onBlur={() => {
                        setFocused((s) => ({ ...s, number: false }));
                        setTouched((s) => ({ ...s, number: true }));
                      }}
                      placeholder="Número"
                      error={showNumberErr}
                      focused={focused.number}
                      returnKeyType="next"
                      onSubmitEditing={() => districtRef.current?.focus()}
                    />
                    <ErrorText show={showNumberErr} text="Informe o número." />

                    <View style={styles.gap} />

                    <FieldLabel icon="business-outline" label="Bairro" />
                    <InputRow
                      inputRef={districtRef}
                      value={district}
                      onChangeText={(text) => {
                        markAddressEdited();
                        setDistrict(text);
                      }}
                      onFocus={() => setFocused((s) => ({ ...s, district: true }))}
                      onBlur={() => {
                        setFocused((s) => ({ ...s, district: false }));
                        setTouched((s) => ({ ...s, district: true }));
                      }}
                      placeholder="Bairro"
                      error={showDistrictErr}
                      focused={focused.district}
                      returnKeyType="next"
                      onSubmitEditing={() => cityRef.current?.focus()}
                    />
                    <ErrorText show={showDistrictErr} text="Bairro muito curto." />

                    <View style={styles.gap} />

                    <FieldLabel icon="location-outline" label="Cidade" />
                    <InputRow
                      inputRef={cityRef}
                      value={city}
                      onChangeText={(text) => {
                        markAddressEdited();
                        setCity(text);
                      }}
                      onFocus={() => setFocused((s) => ({ ...s, city: true }))}
                      onBlur={() => {
                        setFocused((s) => ({ ...s, city: false }));
                        setTouched((s) => ({ ...s, city: true }));
                      }}
                      placeholder="Cidade"
                      error={showCityErr}
                      focused={focused.city}
                      returnKeyType="next"
                      onSubmitEditing={() => stateRef.current?.focus()}
                    />
                    <ErrorText show={showCityErr} text="Cidade muito curta." />

                    <View style={styles.gap} />

                    <FieldLabel icon="flag-outline" label="UF" />
                    <InputRow
                      inputRef={stateRef}
                      value={state}
                      onChangeText={(text) => {
                        markAddressEdited();
                        setState(normalizeUF(text));
                      }}
                      onFocus={() => setFocused((s) => ({ ...s, state: true }))}
                      onBlur={() => {
                        setFocused((s) => ({ ...s, state: false }));
                        setTouched((s) => ({ ...s, state: true }));
                      }}
                      placeholder="SP"
                      autoCapitalize="characters"
                      autoCorrect={false}
                      error={showStateErr}
                      focused={focused.state}
                      returnKeyType="next"
                      onSubmitEditing={() => complementRef.current?.focus()}
                    />
                    <ErrorText show={showStateErr} text="UF inválida." />

                    <View style={styles.gap} />

                    <FieldLabel icon="layers-outline" label="Complemento" />
                    <InputRow
                      inputRef={complementRef}
                      value={complement}
                      onChangeText={(text) => {
                        markAddressEdited();
                        setComplement(text);
                      }}
                      onFocus={() => setFocused((s) => ({ ...s, complement: true }))}
                      onBlur={() => {
                        setFocused((s) => ({ ...s, complement: false }));
                        setTouched((s) => ({ ...s, complement: true }));
                      }}
                      placeholder="Complemento (opcional)"
                      focused={focused.complement}
                      returnKeyType="next"
                      onSubmitEditing={() => referralRef.current?.focus()}
                    />

                    <View style={styles.divider} />

                    <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Indicação</Text>

                    <FieldLabel icon="gift-outline" label="Código de indicação" />
                    <InputRow
                      inputRef={referralRef}
                      value={referralToken}
                      onChangeText={(text) => setReferralToken(normalizeToken(text))}
                      onFocus={() => setFocused((s) => ({ ...s, referralToken: true }))}
                      onBlur={() => {
                        setFocused((s) => ({ ...s, referralToken: false }));
                        setTouched((s) => ({ ...s, referralToken: true }));
                      }}
                      placeholder="Opcional"
                      autoCapitalize="characters"
                      autoCorrect={false}
                      error={showTokenErr}
                      focused={focused.referralToken}
                      returnKeyType="done"
                      onSubmitEditing={submit}
                    />
                    <ErrorText
                      show={showTokenErr}
                      text="Código inválido. Use 8 caracteres válidos."
                    />
                  </>
                )}
              </View>
            </Container>
          </ScrollView>

          <View
            style={[
              styles.cta,
              { paddingBottom: Math.max(insets.bottom, 12) },
              keyboardOpen && styles.ctaKeyboardOpen,
            ]}
          >
            <Pressable
              disabled={ctaDisabled}
              onPress={step === 1 ? next : submit}
              style={({ pressed }) => [
                styles.btn,
                ctaDisabled && styles.btnDisabled,
                pressed && !ctaDisabled && styles.btnPressed,
              ]}
            >
              <LinearGradient
                colors={[COLORS.primaryA, COLORS.primaryB]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.btnText}>{ctaText}</Text>
            </Pressable>

            <View style={styles.bottomLine}>
              <Text style={styles.bottomText}>Já tem conta? </Text>
              <Pressable onPress={goLogin} hitSlop={10}>
                <Text style={styles.bottomLink}>Entrar</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>

      <IosAlert
        visible={!!alert}
        title={alert?.title || ""}
        message={alert?.message || ""}
        onClose={() => setAlert(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  navbar: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },

  navRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backBtn: {
    minWidth: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  backText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "700",
  },

  navTitle: {
    flex: 1,
    textAlign: "center",
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
    marginHorizontal: 12,
  },

  navRight: {
    minWidth: 64,
    alignItems: "flex-end",
  },

  stepBadge: {
    fontSize: 12,
    fontWeight: "900",
    color: COLORS.primaryA,
    backgroundColor: "#EEF4FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  hairline: {
    height: 1,
    backgroundColor: COLORS.border,
  },

  scrollContent: {
    paddingTop: 18,
  },

  header: {
    marginBottom: 18,
  },

  h1: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.8,
  },

  sub: {
    marginTop: 6,
    color: COLORS.sub,
    fontSize: 14,
    lineHeight: 20,
  },

  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 14,
    letterSpacing: -0.4,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginTop: 16,
    marginBottom: 2,
  },

  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },

  label: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },

  inputWrap: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },

  inputWrapFocused: {
    borderColor: COLORS.focus,
    backgroundColor: COLORS.inputBgFocus,
  },

  inputWrapError: {
    borderColor: COLORS.errorBorder,
    backgroundColor: COLORS.errorBg,
  },

  inputWrapReadonly: {
    opacity: 0.9,
  },

  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "600",
    paddingVertical: 14,
  },

  inputWithRightButton: {
    paddingRight: 42,
  },

  rightBtn: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    width: 32,
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

  infoCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.successBg,
    borderRadius: 16,
    padding: 14,
  },

  infoCardTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 10,
  },

  infoItem: {
    marginBottom: 8,
  },

  infoLabel: {
    color: COLORS.sub,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
  },

  infoValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
  },

  infoHelp: {
    marginTop: 8,
    color: COLORS.sub,
    fontSize: 12,
    lineHeight: 18,
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
    shadowOpacity: 0.1,
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

export default RegisterSalonScreen;