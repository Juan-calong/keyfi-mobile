import React, { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { IosAlert } from "../../ui/components/IosAlert";
import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";
import { AuthService } from "../../core/api/services/auth.service";
import type { AuthStackParamList } from "../../navigation/AuthStack";

type Props = NativeStackScreenProps<AuthStackParamList, "VerifyEmail">;

export function VerifyEmailScreen({ navigation, route }: Props) {
  const [code, setCode] = useState("");
  const [verificationEmail, setVerificationEmail] = useState(route.params.email);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [alert, setAlert] = useState<{ title: string; message: string } | null>(null);
  const [waitUntil, setWaitUntil] = useState<number>(0);
  const [now, setNow] = useState(Date.now());
  const [correctionModalVisible, setCorrectionModalVisible] = useState(false);
  const [correctionCurrentEmail, setCorrectionCurrentEmail] = useState(route.params.email);
  const [correctionPassword, setCorrectionPassword] = useState("");
  const [correctionNewEmail, setCorrectionNewEmail] = useState("");
  const [correctionLoading, setCorrectionLoading] = useState(false);
  const [correctionError, setCorrectionError] = useState<string | null>(null);

  useEffect(() => {
    if (waitUntil <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [waitUntil]);

  const secondsLeft = Math.max(0, Math.ceil((waitUntil - now) / 1000));
  const canConfirm = useMemo(
    () => code.length === 6 && !loading && !correctionLoading && secondsLeft === 0,
    [code, loading, correctionLoading, secondsLeft]
  );
  const resendDisabled = resendLoading || correctionLoading;

  function normalizeCode(value: string) {
    return value.replace(/\D+/g, "").slice(0, 6);
  }

  function normalizeEmail(value: string) {
    return value.trim().toLowerCase();
  }

  function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function openCorrectionModal() {
    setCorrectionCurrentEmail(verificationEmail);
    setCorrectionPassword("");
    setCorrectionNewEmail("");
    setCorrectionError(null);
    setCorrectionModalVisible(true);
  }

  function closeCorrectionModal() {
    if (correctionLoading) return;
    setCorrectionModalVisible(false);
    setCorrectionError(null);
  }

  function mapCorrectionError(e: any) {
    const status = Number(e?.response?.status);
    const errorCode = String(e?.response?.data?.code ?? "").toUpperCase();

    if (status === 422 && errorCode === "VALIDATION_ERROR") {
      return "Confira os e-mails e a senha informados.";
    }
    if (status === 401 && errorCode === "INVALID_CREDENTIALS") {
      return "E-mail atual ou senha incorretos.";
    }
    if (status === 409 && errorCode === "EMAIL_ALREADY_IN_USE") {
      return "Este novo e-mail já está em uso.";
    }
    if (status === 409 && errorCode === "INVALID_STATUS") {
      return "Este e-mail já foi verificado. Volte para o login para entrar.";
    }
    if (status === 429) {
      return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
    }

    return "Não foi possível corrigir o e-mail agora. Tente novamente.";
  }

  async function onConfirm() {
    if (code.length !== 6) {
      setAlert({ title: "Código inválido", message: "Digite um código de 6 dígitos." });
      return;
    }

    try {
      setLoading(true);
      await api.post(endpoints.auth.emailVerifyConfirm, { email: verificationEmail, code });
      setAlert({ title: "Sucesso", message: "Email verificado com sucesso. Faça login para continuar." });
      navigation.navigate("Login", {
        email: verificationEmail,
        message: "Email verificado com sucesso. Faça login para continuar.",
      });
    } catch (e: any) {
      const errCode = String(e?.response?.data?.code ?? "").toUpperCase();
      const retryAfter = Number(e?.response?.data?.retryAfterSeconds);

      if (errCode === "INVALID_EMAIL_VERIFICATION_CODE") {
        setAlert({ title: "Código inválido", message: "Código inválido ou expirado." });
      } else if (errCode === "EMAIL_VERIFICATION_WAIT" && Number.isFinite(retryAfter) && retryAfter > 0) {
        setWaitUntil(Date.now() + retryAfter * 1000);
        setAlert({ title: "Aguarde", message: `Aguarde ${retryAfter} segundos antes de tentar novamente.` });
      } else if (errCode === "EMAIL_VERIFICATION_LOCKED") {
        setAlert({ title: "Muitas tentativas", message: "Muitas tentativas. Solicite um novo código." });
      } else {
        setAlert({ title: "Erro", message: "Não foi possível verificar o email. Tente novamente." });
      }
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    try {
      setResendLoading(true);
      await api.post(endpoints.auth.emailVerifyRequest, { email: verificationEmail });
      setCode("");
      setAlert({ title: "Código reenviado", message: "Se o e-mail existir, enviaremos instruções de verificação." });
    } catch {
      setAlert({ title: "Erro", message: "Não foi possível reenviar o código. Tente novamente." });
    } finally {
      setResendLoading(false);
    }
  }

  async function onCorrectEmail() {
    const currentEmail = normalizeEmail(correctionCurrentEmail);
    const newEmail = normalizeEmail(correctionNewEmail);

    if (!currentEmail) {
      setCorrectionError("Informe o e-mail atual.");
      return;
    }
    if (!correctionPassword) {
      setCorrectionError("Informe sua senha.");
      return;
    }
    if (!newEmail) {
      setCorrectionError("Informe o novo e-mail.");
      return;
    }
    if (!isValidEmail(currentEmail) || !isValidEmail(newEmail)) {
      setCorrectionError("Informe um e-mail válido.");
      return;
    }
    if (currentEmail === newEmail) {
      setCorrectionError("O novo e-mail precisa ser diferente do atual.");
      return;
    }

    try {
      setCorrectionLoading(true);
      setCorrectionError(null);

      const response = await AuthService.correctVerificationEmail({
        currentEmail,
        password: correctionPassword,
        newEmail,
      });

      const normalizedEmail = response.email ?? newEmail;

      setVerificationEmail(normalizedEmail);
      setCode("");
      setCorrectionModalVisible(false);
      setCorrectionPassword("");
      setCorrectionNewEmail("");
      setCorrectionCurrentEmail(normalizedEmail);
      setAlert({
        title: "Código reenviado",
        message: "Enviamos um novo código para o e-mail corrigido.",
      });
    } catch (e: any) {
      setCorrectionError(mapCorrectionError(e));
    } finally {
      setCorrectionLoading(false);
    }
  }

  return (
    <Screen style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.flex}>
          <Container>
            <View style={styles.content}>
              <Text style={styles.title}>Verifique seu email</Text>

              <Text style={styles.subtitle}>Enviamos um código para:</Text>
              <Text style={styles.emailText}>{verificationEmail}</Text>
              <Text style={styles.subtitle}>Digite o código de 6 dígitos recebido no seu e-mail.</Text>

              <TextInput
                value={code}
                onChangeText={(value) => setCode(normalizeCode(value))}
                keyboardType="number-pad"
                placeholder="123456"
                style={styles.input}
                maxLength={6}
              />

              <Pressable
                style={[styles.button, !canConfirm && styles.buttonDisabled]}
                onPress={onConfirm}
                disabled={!canConfirm}
              >
                <Text style={styles.buttonText}>
                  {loading ? "Confirmando..." : "Confirmar"}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.linkButton, resendDisabled && styles.buttonDisabled]}
                onPress={onResend}
                disabled={resendDisabled}
              >
                <Text style={styles.linkText}>
                  {resendLoading ? "Reenviando..." : "Reenviar código"}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.linkButton, correctionLoading && styles.buttonDisabled]}
                onPress={openCorrectionModal}
                disabled={correctionLoading}
              >
                <Text style={styles.linkText}>Digitou o e-mail errado? Corrigir e-mail</Text>
              </Pressable>

              <Pressable
                style={styles.linkButton}
                onPress={() => navigation.navigate("Login", { email: verificationEmail })}
              >
                <Text style={styles.linkText}>Voltar para login</Text>
              </Pressable>
            </View>
          </Container>
        </View>
      </KeyboardAvoidingView>

      <IosAlert
        visible={!!alert}
        title={alert?.title}
        message={alert?.message}
        onClose={() => setAlert(null)}
      />

      <Modal
        visible={correctionModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeCorrectionModal}
      >
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalKeyboard}
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Corrigir e-mail</Text>
              <Text style={styles.modalSubtitle}>
                Informe o e-mail atual, sua senha e o novo e-mail para reenviar o código.
              </Text>

              <TextInput
                value={correctionCurrentEmail}
                onChangeText={setCorrectionCurrentEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                placeholder="E-mail atual"
                style={styles.modalInput}
                editable={!correctionLoading}
              />

              <TextInput
                value={correctionPassword}
                onChangeText={setCorrectionPassword}
                secureTextEntry
                textContentType="password"
                placeholder="Senha cadastrada"
                style={styles.modalInput}
                editable={!correctionLoading}
              />

              <TextInput
                value={correctionNewEmail}
                onChangeText={setCorrectionNewEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                placeholder="Novo e-mail"
                style={styles.modalInput}
                editable={!correctionLoading}
              />

              {!!correctionError && <Text style={styles.modalError}>{correctionError}</Text>}

              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.modalSecondaryButton, correctionLoading && styles.buttonDisabled]}
                  onPress={closeCorrectionModal}
                  disabled={correctionLoading}
                >
                  <Text style={styles.modalSecondaryButtonText}>Cancelar</Text>
                </Pressable>

                <Pressable
                  style={[styles.modalPrimaryButton, correctionLoading && styles.buttonDisabled]}
                  onPress={onCorrectEmail}
                  disabled={correctionLoading}
                >
                  <Text style={styles.modalPrimaryButtonText}>
                    {correctionLoading ? "Corrigindo..." : "Corrigir e reenviar código"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    minHeight: "100%",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#475569",
    textAlign: "center",
    lineHeight: 20,
  },
  emailText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    fontSize: 18,
    letterSpacing: 6,
    textAlign: "center",
    color: "#0F172A",
  },
  button: {
    backgroundColor: "#006175",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "700",
  },
  linkButton: {
    paddingVertical: 8,
    alignItems: "center",
  },
  linkText: {
    color: "#006175",
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "center",
    padding: 24,
  },
  modalKeyboard: {
    width: "100%",
  },
  modalCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#475569",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    fontSize: 16,
    color: "#0F172A",
  },
  modalError: {
    fontSize: 13,
    color: "#B91C1C",
    lineHeight: 18,
  },
  modalActions: {
    gap: 10,
    marginTop: 4,
  },
  modalSecondaryButton: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalSecondaryButtonText: {
    color: "#0F172A",
    fontWeight: "700",
  },
  modalPrimaryButton: {
    backgroundColor: "#006175",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalPrimaryButtonText: {
    color: "#FFF",
    fontWeight: "700",
  },
});
