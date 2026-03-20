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
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { cpf as cpfValidator } from "cpf-cnpj-validator";
import { fetchAddressByCep, formatCep } from "../../core/utils/cep";

import Ionicons from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";

import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";
import { useAuthStore } from "../../stores/auth.store";
import type { AuthStackParamList } from "../../navigation/AuthStack";

import { friendlyError } from "../../core/errors/friendlyError";
import { IosAlert } from "../../ui/components/IosAlert";

type Props = NativeStackScreenProps<AuthStackParamList, "RegisterCustomer">;
type Step = 1 | 2;


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

function normalizeCEP(v: string) {
  return onlyDigits(v).slice(0, 8);
}

function normalizeUF(v: string) {
  return String(v ?? "").trim().toUpperCase().slice(0, 2);
}

function maskCPF(digits: string) {
  const d = digits.slice(0, 11);
  const p1 = d.slice(0, 3);
  const p2 = d.slice(3, 6);
  const p3 = d.slice(6, 9);
  const p4 = d.slice(9, 11);

  let out = p1;
  if (p2) out += "." + p2;
  if (p3) out += "." + p3;
  if (p4) out += "-" + p4;
  return out;
}

function maskPhoneBR(digits: string) {
  const d = digits.slice(0, 11);
  const dd = d.slice(0, 2);
  const rest = d.slice(2);

  if (!dd) return d;

  if (rest.length <= 4) return `(${dd}) ${rest}`;
  if (rest.length <= 8) {
    const p1 = rest.slice(0, 4);
    const p2 = rest.slice(4);
    return `(${dd}) ${p1}${p2 ? "-" + p2 : ""}`;
  }

  const p1 = rest.slice(0, 5);
  const p2 = rest.slice(5);
  return `(${dd}) ${p1}${p2 ? "-" + p2 : ""}`;
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
}: InputRowProps) {
  return (
    <View
      style={[
        styles.inputWrap,
        focused && styles.inputWrapFocused,
        error && styles.inputWrapError,
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
      />
      {right}
    </View>
  );
}

export function RegisterCustomerScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const login = useAuthStore((s) => s.login);
  const setNeedsOnboarding = useAuthStore((s) => s.setNeedsOnboarding);

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const [alert, setAlert] = useState<{ title: string; message: string } | null>(null);
  function showModal(title: string, message: string) {
    setAlert({ title, message });
  }

  const submittingRef = useRef(false);

  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [now, setNow] = useState(Date.now());

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

  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const cepRef = useRef<TextInput>(null);
  const streetRef = useRef<TextInput>(null);
  const numberRef = useRef<TextInput>(null);
  const districtRef = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);
  const stateRef = useRef<TextInput>(null);
  const complementRef = useRef<TextInput>(null);
  const cpfRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  const [focused, setFocused] = useState({
    name: false,
    email: false,
    password: false,
    cep: false,
    street: false,
    number: false,
    district: false,
    city: false,
    state: false,
    complement: false,
    cpf: false,
    phone: false,
  });

  // Step 1
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);

  // Step 2
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [complement, setComplement] = useState("");

  const [cpfMasked, setCpfMasked] = useState("");
  const [phoneMasked, setPhoneMasked] = useState("");

  const lastCepFetchedRef = useRef("");

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

  useEffect(() => {
    const cleanCep = onlyDigits(cep);

    if (cleanCep.length === 8 && lastCepFetchedRef.current !== cleanCep) {
      void fillAddressFromCep(cleanCep);
    }
  }, [cep]);

  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    cep: false,
    street: false,
    number: false,
    district: false,
    city: false,
    state: false,
    cpf: false,
    phone: false,

  });

  const nameOk = name.trim().length >= 2;
  const emailOk = isEmail(email);
  const passOk = password.trim().length >= 8;
  const canStep1 = nameOk && emailOk && passOk;

  const cepDigits = useMemo(() => normalizeCEP(cep), [cep]);
  const uf = useMemo(() => normalizeUF(state), [state]);

  const cepOk = cepDigits.length === 8;
  const streetOk = street.trim().length >= 2;
  const numberOk = number.trim().length >= 1;
  const districtOk = district.trim().length >= 2;
  const cityOk = city.trim().length >= 2;
  const stateOk = uf.length === 2;

  const cpfDigits = useMemo(() => onlyDigits(cpfMasked).slice(0, 11), [cpfMasked]);
  const phoneDigits = useMemo(() => onlyDigits(phoneMasked).slice(0, 11), [phoneMasked]);

  const cpfOk = cpfDigits.length === 11 && cpfValidator.isValid(cpfDigits);
  const phoneOk = phoneDigits.length >= 10;

const canStep2 =
  cepOk &&
  streetOk &&
  numberOk &&
  districtOk &&
  cityOk &&
  stateOk &&
  cpfOk &&
  phoneOk;

  function goLogin() {
    Keyboard.dismiss();
    navigation.popToTop();
  }

  function back() {
    Keyboard.dismiss();
    if (step === 1) {
      navigation.popToTop();
      return;
    }
    setStep(1);
  }

  function next() {
    setTouched((s) => ({ ...s, name: true, email: true, password: true }));
    if (!canStep1) return;
    Keyboard.dismiss();
    setStep(2);
  }

  function handleCepChange(text: string) {
    const masked = formatCep(text);
    const cleanCep = onlyDigits(masked);

    setCep(masked);

    if (cleanCep.length < 8) {
      lastCepFetchedRef.current = "";
    }
  }

  async function submit() {
    setTouched((s) => ({
      ...s,
      cep: true,
      street: true,
      number: true,
      district: true,
      city: true,
      state: true,
      cpf: true,
      phone: true,
    }));

    if (!canStep2 || loading || inCooldown) return;

    if (submittingRef.current) return;
    submittingRef.current = true;

    try {
      Keyboard.dismiss();
      setLoading(true);

      await api.post(endpoints.auth.registerCustomer, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,

        cep: cepDigits,
        street: street.trim(),
        number: number.trim(),
        district: district.trim(),
        city: city.trim(),
        state: uf,
        complement: complement.trim() || "",

        cpf: cpfDigits,
        phone: phoneDigits,
      });

      await login(email.trim(), password);
      setNeedsOnboarding(false);

      showModal("Sucesso", "Conta criada e login efetuado!");
    } catch (e: any) {
      handleCooldownFromError(e);

      const fe = friendlyError(e);
      const retry = Number(e?.response?.data?.retryAfterSec);

      if (e?.response?.status === 429 && Number.isFinite(retry) && retry > 0) {
        showModal("Aguarde um pouco", `Muitas tentativas. Tente novamente em ${formatLeft(Math.ceil(retry))}.`);
      } else {
        showModal(fe.title, fe.message);
      }

      console.log("[REGISTER_CUSTOMER][ERR]", e?.response?.data || e);
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }

  const topPad = Math.max(insets.top, 10);

  const showNameErr = touched.name && !nameOk;
  const showEmailErr = touched.email && !emailOk;
  const showPassErr = touched.password && !passOk;

  const showCepErr = touched.cep && !cepOk;
  const showStreetErr = touched.street && !streetOk;
  const showNumberErr = touched.number && !numberOk;
  const showDistrictErr = touched.district && !districtOk;
  const showCityErr = touched.city && !cityOk;
  const showStateErr = touched.state && !stateOk;

  const showCpfErr = touched.cpf && !cpfOk;
  const showPhoneErr = touched.phone && !phoneOk;

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
                <Text style={styles.h1}>Cliente</Text>
                <Text style={styles.sub}>
                  {step === 1 ? "Dados da conta" : "Endereço de entrega"}
                </Text>
              </View>

              {step === 1 ? (
                <View style={styles.formCard}>
                  <FieldLabel icon="person-outline" label="Nome" />
                  <InputRow
                    inputRef={nameRef}
                    value={name}
                    onChangeText={setName}
                    onFocus={() => setFocused((s) => ({ ...s, name: true }))}
                    onBlur={() => {
                      setFocused((s) => ({ ...s, name: false }));
                      setTouched((s) => ({ ...s, name: true }));
                    }}
                    placeholder="Nome completo"
                    error={showNameErr}
                    focused={focused.name}
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                    autoCorrect={false}
                  />
                  <ErrorText show={showNameErr} text="Nome muito curto." />

                  <View style={styles.gap} />

                  <FieldLabel icon="mail-outline" label="Email" />
                  <InputRow
                    inputRef={emailRef}
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocused((s) => ({ ...s, email: true }))}
                    onBlur={() => {
                      setFocused((s) => ({ ...s, email: false }));
                      setTouched((s) => ({ ...s, email: true }));
                    }}
                    placeholder="email@exemplo.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    error={showEmailErr}
                    focused={focused.email}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />
                  <ErrorText show={showEmailErr} text="Email inválido." />

                  <View style={styles.gap} />

                  <FieldLabel icon="lock-closed-outline" label="Senha" />
                  <InputRow
                    inputRef={passwordRef}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocused((s) => ({ ...s, password: true }))}
                    onBlur={() => {
                      setFocused((s) => ({ ...s, password: false }));
                      setTouched((s) => ({ ...s, password: true }));
                    }}
                    placeholder="Crie uma senha"
                    secureTextEntry={secure}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="password"
                    textContentType="newPassword"
                    error={showPassErr}
                    focused={focused.password}
                    returnKeyType="done"
                    onSubmitEditing={next}
                    right={
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
                    }
                  />
                  <ErrorText show={showPassErr} text="Mínimo de 8 caracteres." />
                </View>
              ) : (
                <View style={styles.formCard}>
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
                  <ErrorText show={showCepErr} text="CEP deve ter 8 dígitos." />

                  <View style={styles.gap} />

                  <FieldLabel icon="map-outline" label="Rua" />
                  <InputRow
                    inputRef={streetRef}
                    value={street}
                    onChangeText={setStreet}
                    onFocus={() => setFocused((s) => ({ ...s, street: true }))}
                    onBlur={() => {
                      setFocused((s) => ({ ...s, street: false }));
                      setTouched((s) => ({ ...s, street: true }));
                    }}
                    placeholder="Ex: Av. Brasil"
                    error={showStreetErr}
                    focused={focused.street}
                    returnKeyType="next"
                    onSubmitEditing={() => numberRef.current?.focus()}
                  />
                  <ErrorText show={showStreetErr} text="Informe a rua." />

                  <View style={styles.gap} />

                  <FieldLabel icon="home-outline" label="Número" />
                  <InputRow
                    inputRef={numberRef}
                    value={number}
                    onChangeText={setNumber}
                    onFocus={() => setFocused((s) => ({ ...s, number: true }))}
                    onBlur={() => {
                      setFocused((s) => ({ ...s, number: false }));
                      setTouched((s) => ({ ...s, number: true }));
                    }}
                    placeholder="Ex: 123"
                    keyboardType="numeric"
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
                    onChangeText={setDistrict}
                    onFocus={() => setFocused((s) => ({ ...s, district: true }))}
                    onBlur={() => {
                      setFocused((s) => ({ ...s, district: false }));
                      setTouched((s) => ({ ...s, district: true }));
                    }}
                    placeholder="Ex: Centro"
                    error={showDistrictErr}
                    focused={focused.district}
                    returnKeyType="next"
                    onSubmitEditing={() => cityRef.current?.focus()}
                  />
                  <ErrorText show={showDistrictErr} text="Informe o bairro." />

                  <View style={styles.gap} />

                  <FieldLabel icon="navigate-outline" label="Cidade" />
                  <InputRow
                    inputRef={cityRef}
                    value={city}
                    onChangeText={setCity}
                    onFocus={() => setFocused((s) => ({ ...s, city: true }))}
                    onBlur={() => {
                      setFocused((s) => ({ ...s, city: false }));
                      setTouched((s) => ({ ...s, city: true }));
                    }}
                    placeholder="Ex: Campinas"
                    error={showCityErr}
                    focused={focused.city}
                    returnKeyType="next"
                    onSubmitEditing={() => stateRef.current?.focus()}
                  />
                  <ErrorText show={showCityErr} text="Informe a cidade." />

                  <View style={styles.gap} />

                  <FieldLabel icon="flag-outline" label="UF" />
                  <InputRow
                    inputRef={stateRef}
                    value={state}
                    onChangeText={setState}
                    onFocus={() => setFocused((s) => ({ ...s, state: true }))}
                    onBlur={() => {
                      setFocused((s) => ({ ...s, state: false }));
                      setTouched((s) => ({ ...s, state: true }));
                    }}
                    placeholder="SP"
                    autoCapitalize="characters"
                    error={showStateErr}
                    focused={focused.state}
                    returnKeyType="next"
                    onSubmitEditing={() => complementRef.current?.focus()}
                  />
                  <ErrorText show={showStateErr} text="UF deve ter 2 letras." />

                  <View style={styles.gap} />

                  <FieldLabel icon="albums-outline" label="Complemento (opcional)" />
                  <InputRow
                    inputRef={complementRef}
                    value={complement}
                    onChangeText={setComplement}
                    onFocus={() => setFocused((s) => ({ ...s, complement: true }))}
                    onBlur={() => setFocused((s) => ({ ...s, complement: false }))}
                    placeholder="Ex: Sala 12"
                    focused={focused.complement}
                    returnKeyType="next"
                    onSubmitEditing={() => cpfRef.current?.focus()}
                  />

                  <View style={styles.gap} />

                  <FieldLabel icon="id-card-outline" label="CPF" />
                  <InputRow
                    inputRef={cpfRef}
                    value={cpfMasked}
                    onChangeText={(txt) => setCpfMasked(maskCPF(onlyDigits(txt)))}
                    onFocus={() => setFocused((s) => ({ ...s, cpf: true }))}
                    onBlur={() => {
                      setFocused((s) => ({ ...s, cpf: false }));
                      setTouched((s) => ({ ...s, cpf: true }));
                    }}
                    placeholder="000.000.000-00"
                    keyboardType="numeric"
                    error={showCpfErr}
                    focused={focused.cpf}
                    returnKeyType="next"
                    onSubmitEditing={() => phoneRef.current?.focus()}
                  />
                  <ErrorText show={showCpfErr} text="CPF inválido." />

                  <View style={styles.gap} />

                  <FieldLabel icon="call-outline" label="Telefone" />
                  <InputRow
                    inputRef={phoneRef}
                    value={phoneMasked}
                    onChangeText={(txt) => setPhoneMasked(maskPhoneBR(onlyDigits(txt)))}
                    onFocus={() => setFocused((s) => ({ ...s, phone: true }))}
                    onBlur={() => {
                      setFocused((s) => ({ ...s, phone: false }));
                      setTouched((s) => ({ ...s, phone: true }));
                    }}
                    placeholder="(11) 99999-9999"
                    keyboardType="phone-pad"
                    error={showPhoneErr}
                    focused={focused.phone}
                    returnKeyType="next"
                    onSubmitEditing={submit}
                  />
                  <ErrorText show={showPhoneErr} text="Informe um telefone válido." />
                </View>
              )}
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
              disabled={ctaDisabled}
              onPress={step === 1 ? next : submit}
              style={({ pressed }) => [
                styles.btn,
                ctaDisabled && styles.btnDisabled,
                pressed && !ctaDisabled ? styles.btnPressed : null,
              ]}
            >
              <LinearGradient
                colors={[COLORS.primaryA, COLORS.primaryB]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
              <Text style={styles.btnText}>{ctaText}</Text>
            </Pressable>

            {!keyboardOpen ? (
              <View style={styles.bottomLine}>
                <Text style={styles.bottomText}>Já tem conta? </Text>
                <Pressable
                  onPress={goLogin}
                  hitSlop={10}
                  style={({ pressed }) => pressed && styles.pressed}
                >
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

  navRight: {
    width: 78,
    minHeight: 40,
    alignItems: "flex-end",
    justifyContent: "center",
  },

  stepBadge: {
    minWidth: 38,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "#EFF6FF",
    color: COLORS.primaryA,
    textAlign: "center",
    lineHeight: 24,
    fontSize: 12,
    fontWeight: "900",
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

export default RegisterCustomerScreen;