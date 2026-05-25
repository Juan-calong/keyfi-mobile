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
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { cnpj as cnpjValidator } from "cpf-cnpj-validator";
import { fetchAddressByCep, formatCep } from "../../core/utils/cep";
import { fetchCompanyByCnpj } from "../../core/utils/cnpj";

import Ionicons from "react-native-vector-icons/Ionicons";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";

import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";
import { useAuthStore } from "../../stores/auth.store";
import { friendlyError } from "../../core/errors/friendlyError";
import { IosAlert } from "../../ui/components/IosAlert";
import {
  clearPendingInvite,
  getPendingInvite,
} from "../../core/airbridge/invite-link.service";

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
  primary: "#006175",
  primaryText: "#FFFFFF",
  successBg: "#F1F5F9",
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

function normalizeUF(v: string) {
  return String(v ?? "").trim().toUpperCase().slice(0, 2);
}

function normalizeCEP(v: string) {
  return onlyDigits(v).slice(0, 8);
}

function normalizeStateRegistration(v: string) {
  return String(v ?? "").trim().toUpperCase().replace(/\s+/g, "");
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
  const pendingInvitePrefilledRef = useRef(false);

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

  useEffect(() => {
    if (pendingInvitePrefilledRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        const invite = await getPendingInvite();
        if (cancelled || !invite) return;

        if (invite.inviteType === "SELLER" || invite.inviteType === "SALON") {
          const normalized = normalizeToken(invite.token);
          if (normalized) {
            setReferralToken((prev) => prev || normalized);
          }
        }
      } catch (e) {
        // Falha ao carregar convite pendente não deve bloquear o cadastro.
      } finally {
        pendingInvitePrefilledRef.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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
  const legalNameRef = useRef<TextInput>(null);
  const tradeNameRef = useRef<TextInput>(null);
  const salonEmailRef = useRef<TextInput>(null);
  const cnpjRef = useRef<TextInput>(null);
  const stateRegistrationRef = useRef<TextInput>(null);
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
    legalName: false,
    tradeName: false,
    salonEmail: false,
    cnpj: false,
    stateRegistration: false,
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
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [salonEmail, setSalonEmail] = useState("");
  const [cnpjMasked, setCnpjMasked] = useState("");
  const [hasStateRegistration, setHasStateRegistration] = useState(false);
  const [stateRegistration, setStateRegistration] = useState("");

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
  const legalNameManuallyEditedRef = useRef(false);
  const tradeNameManuallyEditedRef = useRef(false);

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

      const tradeNameValue = String(data.tradeName ?? "").trim();
      const companyName = String(data.companyName ?? "").trim();
      const mainCnae = String(data.cnae ?? "").trim();
      const secondary = Array.isArray(data.secondaryCnaes)
        ? data.secondaryCnaes.map((item) => String(item).trim()).filter(Boolean)
        : [];

      setCnpjMasked(maskCNPJ(data.cnpj || cleanCnpj));
      setCompanyInfo({
        companyName,
        tradeName: tradeNameValue,
        status: String(data.status ?? "").trim(),
        cnae: mainCnae,
        secondaryCnaes: secondary,
      });

      if (!legalNameManuallyEditedRef.current && companyName.length >= 2) {
        setLegalName(companyName);
      }

      if (!tradeNameManuallyEditedRef.current && tradeNameValue.length >= 2) {
        setTradeName(tradeNameValue);
      }

      if (!salonNameManuallyEditedRef.current && !salonName.trim()) {
        const preferredName = tradeNameValue || companyName;
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
    legalName: false,
    tradeName: false,
    salonEmail: false,
    cnpj: false,
    stateRegistration: false,

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
  const legalNameOk = legalName.trim().length >= 2;
  const tradeNameOk = true;
  const salonEmailOk = isEmail(salonEmail);
  const stateRegistrationOk = !hasStateRegistration || stateRegistration.trim().length >= 1;

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
    legalNameOk &&
    tradeNameOk &&
    salonEmailOk &&
    cnpjOk &&
    stateRegistrationOk &&
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
      legalName: true,
      tradeName: true,
      salonEmail: true,
      cnpj: true,
      stateRegistration: true,
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

      const response = await api.post(endpoints.auth.registerSalon, {
        owner: {
          name: ownerName.trim(),
          email: ownerEmail.trim().toLowerCase(),
          password: ownerPassword,
        },
        salon: {
          name: salonName.trim(),
          legalName: legalName.trim(),
          tradeName: tradeName.trim(),
          cnpj: cnpjDigits,
          hasStateRegistration,
          stateRegistration: hasStateRegistration
            ? normalizeStateRegistration(stateRegistration)
            : undefined,
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

      await clearPendingInvite();

      const normalizedEmail = ownerEmail.trim().toLowerCase();

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
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }

  const showOwnerNameErr = touched.ownerName && !ownerNameOk;
  const showOwnerEmailErr = touched.ownerEmail && !ownerEmailOk;
  const showOwnerPassErr = touched.ownerPassword && !ownerPassOk;

  const showSalonNameErr = touched.salonName && !salonNameOk;
  const showLegalNameErr = touched.legalName && !legalNameOk;
  const showTradeNameErr = touched.tradeName && !tradeNameOk;
  const showSalonEmailErr = touched.salonEmail && !salonEmailOk;
  const showCnpjErr = touched.cnpj && !cnpjOk;
  const showStateRegistrationErr = touched.stateRegistration && hasStateRegistration && !stateRegistrationOk;
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
                onPress={back}
                hitSlop={12}
                style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
              >
                <Ionicons name="chevron-back" size={18} color={COLORS.text} />
                <Text style={styles.backText}>Voltar</Text>
              </Pressable>

              <View style={styles.navRight}>
                <Text style={styles.stepBadge}>{step}/2</Text>
              </View>
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
                    <Text style={styles.logoSubText}>Salão</Text>
                  </View>
                </View>
                <Text style={styles.h1}>
                  {step === 1 ? "Dados do Responsável" : "Dados do Salão"}
                </Text>
                <Text style={styles.sub}>
                  {step === 1 
                    ? "Comece preenchendo as informações de quem gerenciará a conta." 
                    : "Agora, informe os dados oficiais do seu estabelecimento."}
                </Text>
              </View>

              <View style={styles.formCard}>
                {step === 1 ? (
                  <>
                    <FieldLabel icon="person-outline" label="Nome completo" />
                    <InputRow
                      inputRef={ownerNameRef}
                      value={ownerName}
                      onChangeText={setOwnerName}
                      onFocus={() => setFocused((s) => ({ ...s, ownerName: true }))}
                      onBlur={() => {
                        setFocused((s) => ({ ...s, ownerName: false }));
                        setTouched((s) => ({ ...s, ownerName: true }));
                      }}
                      placeholder="Ex: Maria Oliveira"
                      error={showOwnerNameErr}
                      focused={focused.ownerName}
                      returnKeyType="next"
                      onSubmitEditing={() => ownerEmailRef.current?.focus()}
                      autoCorrect={false}
                    />
                    <ErrorText show={showOwnerNameErr} text="Nome muito curto." />

                    <View style={styles.gap} />

                    <FieldLabel icon="mail-outline" label="Email de acesso" />
                    <InputRow
                      inputRef={ownerEmailRef}
                      value={ownerEmail}
                      onChangeText={setOwnerEmail}
                      onFocus={() => setFocused((s) => ({ ...s, ownerEmail: true }))}
                      onBlur={() => {
                        setFocused((s) => ({ ...s, ownerEmail: false }));
                        setTouched((s) => ({ ...s, ownerEmail: true }));
                      }}
                      placeholder="seuemail@exemplo.com"
                      error={showOwnerEmailErr}
                      focused={focused.ownerEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      textContentType="emailAddress"
                      returnKeyType="next"
                      onSubmitEditing={() => ownerPasswordRef.current?.focus()}
                    />
                    <ErrorText show={showOwnerEmailErr} text="Email inválido." />

                    <View style={styles.gap} />

                    <FieldLabel icon="lock-closed-outline" label="Crie sua senha" />
                    <InputRow
                      inputRef={ownerPasswordRef}
                      value={ownerPassword}
                      onChangeText={setOwnerPassword}
                      onFocus={() => setFocused((s) => ({ ...s, ownerPassword: true }))}
                      onBlur={() => {
                        setFocused((s) => ({ ...s, ownerPassword: false }));
                        setTouched((s) => ({ ...s, ownerPassword: true }));
                      }}
                      placeholder="Mínimo 8 caracteres"
                      error={showOwnerPassErr}
                      focused={focused.ownerPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      secureTextEntry={ownerSecure}
                      autoComplete="password"
                      textContentType="newPassword"
                      returnKeyType="done"
                      onSubmitEditing={next}
                      right={
                        <Pressable
                          onPress={() => setOwnerSecure((v) => !v)}
                          hitSlop={10}
                          style={({ pressed }) => [styles.rightBtn, pressed && styles.pressed]}
                        >
                          <Ionicons
                            name={ownerSecure ? "eye-outline" : "eye-off-outline"}
                            size={20}
                            color={COLORS.sub}
                          />
                        </Pressable>
                      }
                    />
                    <ErrorText show={showOwnerPassErr} text="Mínimo de 8 caracteres." />
                  </>
                ) : (
                  <>
                    <Text style={styles.sectionTitle}>Identificação</Text>

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
                      error={showCnpjErr}
                      focused={focused.cnpj}
                      keyboardType="numeric"
                      returnKeyType="next"
                      onSubmitEditing={() => salonNameRef.current?.focus()}
                    />
                    <ErrorText show={showCnpjErr} text="CNPJ inválido." />

                    {companyInfo ? (
                      <View style={styles.infoCard}>
                        <View style={styles.infoTitleRow}>
                           <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                           <Text style={styles.infoCardTitle}>Empresa identificada</Text>
                        </View>
                        <InfoItem label="Razão social" value={companyInfo.companyName} />
                        <InfoItem label="Nome fantasia" value={companyInfo.tradeName} />
                        <InfoItem label="Status" value={companyInfo.status} />
                        <Text style={styles.infoHelp}>
                          Razão social e nome fantasia abaixo podem ser preenchidos automaticamente. Ajuste se necessário.
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.gap} />

                    <FieldLabel icon="document-text-outline" label="Razão social" />
                    <InputRow
                      inputRef={legalNameRef}
                      value={legalName}
                      onChangeText={(text) => {
                        legalNameManuallyEditedRef.current = true;
                        setLegalName(text);
                      }}
                      onFocus={() => setFocused((s) => ({ ...s, legalName: true }))}
                      onBlur={() => {
                        setFocused((s) => ({ ...s, legalName: false }));
                        setTouched((s) => ({ ...s, legalName: true }));
                      }}
                      placeholder="Razão social do CNPJ"
                      error={showLegalNameErr}
                      focused={focused.legalName}
                      returnKeyType="next"
                      onSubmitEditing={() => tradeNameRef.current?.focus()}
                    />
                    <ErrorText show={showLegalNameErr} text="Razão social muito curta." />

                    <View style={styles.gap} />

                    <FieldLabel icon="pricetags-outline" label="Nome fantasia" />
                    <InputRow
                      inputRef={tradeNameRef}
                      value={tradeName}
                      onChangeText={(text) => {
                        tradeNameManuallyEditedRef.current = true;
                        setTradeName(text);
                      }}
                      onFocus={() => setFocused((s) => ({ ...s, tradeName: true }))}
                      onBlur={() => {
                        setFocused((s) => ({ ...s, tradeName: false }));
                        setTouched((s) => ({ ...s, tradeName: true }));
                      }}
                      placeholder="Nome fantasia do CNPJ"
                      error={showTradeNameErr}
                      focused={focused.tradeName}
                      returnKeyType="next"
                      onSubmitEditing={() => salonNameRef.current?.focus()}
                    />
                    <ErrorText show={showTradeNameErr} text="Nome fantasia muito curto." />

                    <View style={styles.switchBlock}>
                      <View style={styles.switchTextGroup}>
                        <Text style={styles.switchTitle}>Possui inscrição estadual</Text>
                        <Text style={styles.switchSubtitle}>
                          Quando ativo, a inscrição estadual passa a ser obrigatória.
                        </Text>
                      </View>
                      <Switch
                        value={hasStateRegistration}
                        onValueChange={(next) => {
                          setHasStateRegistration(next);
                          if (!next) setStateRegistration("");
                        }}
                        trackColor={{ false: "#CBD5E1", true: COLORS.primary }}
                        thumbColor="#FFFFFF"
                      />
                    </View>

                    {hasStateRegistration ? (
                      <>
                        <FieldLabel icon="card-outline" label="Inscrição estadual" />
                        <InputRow
                          inputRef={stateRegistrationRef}
                          value={stateRegistration}
                          onChangeText={(text) => setStateRegistration(normalizeStateRegistration(text))}
                          onFocus={() => setFocused((s) => ({ ...s, stateRegistration: true }))}
                          onBlur={() => {
                            setFocused((s) => ({ ...s, stateRegistration: false }));
                            setTouched((s) => ({ ...s, stateRegistration: true }));
                          }}
                          placeholder="Digite a inscrição estadual"
                          error={showStateRegistrationErr}
                          focused={focused.stateRegistration}
                          autoCapitalize="characters"
                          autoCorrect={false}
                          returnKeyType="next"
                          onSubmitEditing={() => salonNameRef.current?.focus()}
                        />
                        <ErrorText show={showStateRegistrationErr} text="Inscrição estadual obrigatória." />
                      </>
                    ) : null}

                    <FieldLabel icon="business-outline" label="Nome do salão" />
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
                      placeholder="Nome fantasia ou Comercial"
                      error={showSalonNameErr}
                      focused={focused.salonName}
                      returnKeyType="next"
                      onSubmitEditing={() => salonEmailRef.current?.focus()}
                    />
                    <ErrorText show={showSalonNameErr} text="Nome muito curto." />

                    <View style={styles.gap} />

                    <FieldLabel icon="mail-outline" label="Email de contato (Salão)" />
                    <InputRow
                      inputRef={salonEmailRef}
                      value={salonEmail}
                      onChangeText={setSalonEmail}
                      onFocus={() => setFocused((s) => ({ ...s, salonEmail: true }))}
                      onBlur={() => {
                        setFocused((s) => ({ ...s, salonEmail: false }));
                        setTouched((s) => ({ ...s, salonEmail: true }));
                      }}
                      placeholder="contato@salao.com"
                      error={showSalonEmailErr}
                      focused={focused.salonEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                      onSubmitEditing={() => cepRef.current?.focus()}
                    />
                    <ErrorText show={showSalonEmailErr} text="Email inválido." />

                    <View style={styles.divider} />

                    <Text style={styles.sectionTitle}>Endereço</Text>

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
                      error={showCepErr}
                      focused={focused.cep}
                      keyboardType="numeric"
                      returnKeyType="next"
                      onSubmitEditing={() => streetRef.current?.focus()}
                    />
                    <ErrorText show={showCepErr} text="CEP inválido." />

                    <View style={styles.gap} />

                    <FieldLabel icon="map-outline" label="Logradouro" />
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
                      placeholder="Rua, Avenida, Travessa..."
                      error={showStreetErr}
                      focused={focused.street}
                      returnKeyType="next"
                      onSubmitEditing={() => numberRef.current?.focus()}
                    />
                    <ErrorText show={showStreetErr} text="Rua muito curta." />

                    <View style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <FieldLabel icon="pin-outline" label="Número" />
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
                          placeholder="Ex: 123"
                          error={showNumberErr}
                          focused={focused.number}
                          returnKeyType="next"
                          onSubmitEditing={() => districtRef.current?.focus()}
                        />
                      </View>
                      <View style={{ width: 12 }} />
                      <View style={{ flex: 1 }}>
                         <FieldLabel icon="home-outline" label="Bairro" />
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
                      </View>
                    </View>

                    <View style={styles.gap} />

                    <View style={styles.row}>
                       <View style={{ flex: 2 }}>
                          <FieldLabel icon="business-outline" label="Cidade" />
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
                       </View>
                       <View style={{ width: 12 }} />
                       <View style={{ flex: 1 }}>
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
                            placeholder="UF"
                            error={showStateErr}
                            focused={focused.state}
                            autoCapitalize="characters"
                            returnKeyType="next"
                            onSubmitEditing={() => complementRef.current?.focus()}
                            />
                       </View>
                    </View>

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
                      placeholder="Bloco, apto, sala... (opcional)"
                      focused={focused.complement}
                      returnKeyType="next"
                      onSubmitEditing={() => referralRef.current?.focus()}
                    />

                    <View style={styles.divider} />

                    <FieldLabel icon="gift-outline" label="Código de Indicação" />
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
                      error={showTokenErr}
                      focused={focused.referralToken}
                      returnKeyType="done"
                      onSubmitEditing={submit}
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
              <Text style={styles.btnText}>{ctaText}</Text>
              {!loading && !inCooldown && (
                 <Ionicons name="arrow-forward" size={20} color={COLORS.primaryText} style={styles.btnIcon} />
              )}
            </Pressable>

            <View style={styles.bottomLine}>
              <Text style={styles.bottomText}>Já tem conta? </Text>
              <Pressable onPress={goLogin} hitSlop={10} style={({ pressed }) => pressed && styles.pressed}>
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
    paddingBottom: 8,
  },

  navRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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

  navRight: {
    justifyContent: "center",
  },

  stepBadge: {
    paddingHorizontal: 12,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 28,
    overflow: "hidden",
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },

  header: {
    alignItems: "center",
    paddingTop: 18,
    paddingBottom: 20,
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
    paddingHorizontal: 20,
    lineHeight: 20,
  },

  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 8,
    marginBottom: 12,
    letterSpacing: -0.2,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 24,
  },

  row: {
    flexDirection: "row",
    marginTop: 16,
  },

  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    marginBottom: 7,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
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

  inputWrapReadonly: {
    opacity: 0.6,
  },

  input: {
    flex: 1,
    height: 52,
    fontSize: 15,
    color: COLORS.text,
    paddingVertical: 0,
    backgroundColor: "transparent",
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
    height: 4,
  },

  switchBlock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 16,
  },

  switchTextGroup: {
    flex: 1,
  },

  switchTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },

  switchSubtitle: {
    marginTop: 4,
    color: COLORS.sub,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
  },

  infoCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.successBg,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },

  infoTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },

  infoCardTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },

  infoItem: {
    marginBottom: 10,
  },

  infoLabel: {
    color: COLORS.sub,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 2,
  },

  infoValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
  },

  infoHelp: {
    marginTop: 4,
    color: COLORS.sub,
    fontSize: 11,
    fontStyle: "italic",
    lineHeight: 16,
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

export default RegisterSalonScreen;
