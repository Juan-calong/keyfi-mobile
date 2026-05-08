import React, { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { IosAlert } from "../../ui/components/IosAlert";
import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";
import type { AuthStackParamList } from "../../navigation/AuthStack";

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

function isEmail(v: string) {
  const s = v.trim().toLowerCase();
  return s.includes("@") && s.includes(".");
}

export function ForgotPasswordScreen({ navigation, route }: Props) {
  const [email, setEmail] = useState(route.params?.email ?? "");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ title: string; message: string } | null>(null);

  const emailOk = isEmail(email);
  const canSubmit = useMemo(() => emailOk && !loading, [emailOk, loading]);

  async function onSubmit() {
    if (!emailOk) {
      setAlert({ title: "Email inválido", message: "Informe um email válido." });
      return;
    }

    try {
      setLoading(true);
      const normalizedEmail = email.trim().toLowerCase();
      await api.post(endpoints.auth.passwordForgot, { email: normalizedEmail });
      setAlert({
        title: "Verifique seu email",
        message: "Se esse email estiver cadastrado, enviaremos as instruções.",
      });
      navigation.navigate("ResetPassword", { email: normalizedEmail });
    } catch (e: any) {
      const status = e?.response?.status;
      const retryAfterSec = Number(e?.response?.data?.retryAfterSec);

      if (status === 429 && Number.isFinite(retryAfterSec) && retryAfterSec > 0) {
        setAlert({
          title: "Aguarde um pouco",
          message: `Muitas tentativas. Tente novamente em ${retryAfterSec}s.`,
        });
        return;
      }

      setAlert({
        title: "Não foi possível enviar",
        message: "Tente novamente em instantes.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.flex}>
          <Container>
            <View style={styles.content}>
              <Text style={styles.title}>Recuperar senha</Text>
              <Text style={styles.subtitle}>Informe seu email para receber as instruções.</Text>

              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                placeholder="seuemail@exemplo.com"
                style={styles.input}
              />

              <Pressable style={[styles.button, !canSubmit && styles.buttonDisabled]} onPress={onSubmit} disabled={!canSubmit}>
                <Text style={styles.buttonText}>{loading ? "Enviando..." : "Enviar instruções"}</Text>
              </Pressable>

              <Pressable style={styles.linkButton} onPress={() => navigation.navigate("ResetPassword", { email: email.trim().toLowerCase() || undefined })}>
                <Text style={styles.linkText}>Já tenho o código/link</Text>
              </Pressable>

              <Pressable style={styles.linkButton} onPress={() => navigation.navigate("Login", { email: email.trim().toLowerCase() || undefined })}>
                <Text style={styles.linkText}>Voltar para login</Text>
              </Pressable>
            </View>
          </Container>
        </View>
      </KeyboardAvoidingView>

      <IosAlert visible={!!alert} title={alert?.title} message={alert?.message} onClose={() => setAlert(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FAFAFA" },
  flex: { flex: 1 },
  content: { flexGrow: 1, minHeight: "100%", justifyContent: "center", paddingVertical: 32, gap: 12 },
  title: { fontSize: 28, fontWeight: "800", color: "#0F172A", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#475569", textAlign: "center", lineHeight: 20, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    fontSize: 16,
    color: "#0F172A",
  },
  button: { backgroundColor: "#006175", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#FFF", fontWeight: "700" },
  linkButton: { paddingVertical: 8, alignItems: "center" },
  linkText: { color: "#006175", fontWeight: "700" },
});
