import React, { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { IosAlert } from "../../ui/components/IosAlert";
import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";
import type { AuthStackParamList } from "../../navigation/AuthStack";

type Props = NativeStackScreenProps<AuthStackParamList, "VerifyEmail">;

export function VerifyEmailScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [alert, setAlert] = useState<{ title: string; message: string } | null>(null);
  const [waitUntil, setWaitUntil] = useState<number>(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (waitUntil <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [waitUntil]);

  const secondsLeft = Math.max(0, Math.ceil((waitUntil - now) / 1000));
  const canConfirm = useMemo(() => code.length === 6 && !loading && secondsLeft === 0, [code, loading, secondsLeft]);

  function normalizeCode(value: string) {
    return value.replace(/\D+/g, "").slice(0, 6);
  }

  async function onConfirm() {
    if (code.length !== 6) {
      setAlert({ title: "Código inválido", message: "Digite um código de 6 dígitos." });
      return;
    }

    try {
      setLoading(true);
      await api.post(endpoints.auth.emailVerifyConfirm, { email, code });
      setAlert({ title: "Sucesso", message: "Email verificado com sucesso. Faça login para continuar." });
      navigation.navigate("Login", {
        email,
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
      await api.post(endpoints.auth.emailVerifyRequest, { email });
      setCode("");
      setAlert({ title: "Código reenviado", message: "Se o e-mail existir, enviaremos instruções de verificação." });
    } catch {
      setAlert({ title: "Erro", message: "Não foi possível reenviar o código. Tente novamente." });
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <Screen style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Container>
          <View style={styles.content}>
            <Text style={styles.title}>Verifique seu email</Text>
            <Text style={styles.subtitle}>Digite o código de 6 dígitos enviado para {email}</Text>
            <TextInput
              value={code}
              onChangeText={(value) => setCode(normalizeCode(value))}
              keyboardType="number-pad"
              placeholder="123456"
              style={styles.input}
              maxLength={6}
            />

            <Pressable style={[styles.button, !canConfirm && styles.buttonDisabled]} onPress={onConfirm} disabled={!canConfirm}>
              <Text style={styles.buttonText}>{loading ? "Confirmando..." : "Confirmar"}</Text>
            </Pressable>

            <Pressable style={[styles.linkButton, resendLoading && styles.buttonDisabled]} onPress={onResend} disabled={resendLoading}>
              <Text style={styles.linkText}>{resendLoading ? "Reenviando..." : "Reenviar código"}</Text>
            </Pressable>

            <Pressable style={styles.linkButton} onPress={() => navigation.navigate("Login", { email })}>
              <Text style={styles.linkText}>Voltar para login</Text>
            </Pressable>
          </View>
        </Container>
      </KeyboardAvoidingView>
      <IosAlert visible={!!alert} title={alert?.title} message={alert?.message} onClose={() => setAlert(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#FAFAFA" },
  content: { flex: 1, justifyContent: "center", gap: 12 },
  title: { fontSize: 28, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 14, color: "#475569" },
  input: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#FFF", fontSize: 18, letterSpacing: 6 },
  button: { backgroundColor: "#006175", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#FFF", fontWeight: "700" },
  linkButton: { paddingVertical: 8, alignItems: "center" },
  linkText: { color: "#006175", fontWeight: "700" },
});
