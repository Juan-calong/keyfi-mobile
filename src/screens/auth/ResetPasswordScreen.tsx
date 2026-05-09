import React, { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { IosAlert } from "../../ui/components/IosAlert";
import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";
import type { AuthStackParamList } from "../../navigation/AuthStack";

type Props = NativeStackScreenProps<AuthStackParamList, "ResetPassword">;

const PLACEHOLDER_COLOR = "#8A94A6";
const SELECTION_COLOR = "#006175";

export function ResetPasswordScreen({ navigation, route }: Props) {
  const [email, setEmail] = useState(route.params?.email ?? "");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ title: string; message: string } | null>(null);

  const passOk = password.trim().length >= 6;
  const confirmOk = confirmPassword.trim() === password.trim();
  const tokenOk = token.trim().length > 0;
  const canSubmit = useMemo(() => tokenOk && passOk && confirmOk && !loading, [tokenOk, passOk, confirmOk, loading]);

  async function onSubmit() {
    if (!tokenOk) {
      setAlert({ title: "Token obrigatório", message: "Informe o token/código recebido por email." });
      return;
    }
    if (!passOk) {
      setAlert({ title: "Senha inválida", message: "A senha deve ter pelo menos 6 caracteres." });
      return;
    }
    if (!confirmOk) {
      setAlert({ title: "Senhas diferentes", message: "A confirmação de senha precisa ser igual à nova senha." });
      return;
    }

    try {
      setLoading(true);
      const normalizedEmail = email.trim().toLowerCase();
      await api.post(endpoints.auth.passwordReset, {
        token: token.trim(),
        newPassword: password,
      });

      navigation.navigate("Login", {
        email: normalizedEmail || undefined,
        message: "Senha alterada com sucesso. Faça login para continuar.",
      });
    } catch (e: any) {
      const status = e?.response?.status;
      const code = String(e?.response?.data?.code ?? "").toUpperCase();
      const retryAfterSec = Number(e?.response?.data?.retryAfterSec);

      if (status === 429 && Number.isFinite(retryAfterSec) && retryAfterSec > 0) {
        setAlert({ title: "Aguarde um pouco", message: `Muitas tentativas. Tente novamente em ${retryAfterSec}s.` });
        return;
      }

      if (
        status === 400 ||
        status === 401 ||
        code.includes("INVALID") ||
        code.includes("EXPIRED") ||
        code.includes("TOKEN")
      ) {
        setAlert({ title: "Token inválido", message: "Link ou código inválido/expirado. Solicite novamente." });
        return;
      }

      setAlert({ title: "Erro", message: "Não foi possível redefinir a senha. Tente novamente." });
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
              <Text style={styles.title}>Criar nova senha</Text>
              <Text style={styles.subtitle}>Digite o token/código recebido por email e sua nova senha.</Text>

<TextInput
  value={email}
  onChangeText={setEmail}
  keyboardType="email-address"
  autoCapitalize="none"
  placeholder="Email (opcional)"
  placeholderTextColor={PLACEHOLDER_COLOR}
  selectionColor={SELECTION_COLOR}
  style={styles.input}
/>

<TextInput
  value={token}
  onChangeText={setToken}
  autoCapitalize="none"
  placeholder="Token/código"
  placeholderTextColor={PLACEHOLDER_COLOR}
  selectionColor={SELECTION_COLOR}
  style={styles.input}
/>

<TextInput
  value={password}
  onChangeText={setPassword}
  secureTextEntry
  autoCapitalize="none"
  placeholder="Nova senha"
  placeholderTextColor={PLACEHOLDER_COLOR}
  selectionColor={SELECTION_COLOR}
  style={styles.input}
/>

<TextInput
  value={confirmPassword}
  onChangeText={setConfirmPassword}
  secureTextEntry
  autoCapitalize="none"
  placeholder="Confirmar nova senha"
  placeholderTextColor={PLACEHOLDER_COLOR}
  selectionColor={SELECTION_COLOR}
  style={styles.input}
/>
              <Pressable style={[styles.button, !canSubmit && styles.buttonDisabled]} onPress={onSubmit} disabled={!canSubmit}>
                <Text style={styles.buttonText}>{loading ? "Redefinindo..." : "Redefinir senha"}</Text>
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
  input: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#FFF", fontSize: 16, color: "#0F172A" },
  button: { backgroundColor: "#006175", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#FFF", fontWeight: "700" },
  linkButton: { paddingVertical: 8, alignItems: "center" },
  linkText: { color: "#006175", fontWeight: "700" },
});
