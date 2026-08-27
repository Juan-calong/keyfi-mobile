import React from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { IosConfirm } from "../../ui/components/IosConfirm";
import { roleDeletionDescription } from "./accountDeletion.messages";
import type { AccountDeletionRole } from "./accountDeletion.types";
import { useAccountDeletionFlow } from "./useAccountDeletionFlow";

type Flow = ReturnType<typeof useAccountDeletionFlow>;

export function AccountDeletionModal({ flow }: { flow: Flow }) {
  const visible = flow.phase !== "IDLE" && flow.phase !== "CONFIRMING";
  const busy = ["REQUESTING_CODE", "CONFIRMING_CODE", "DELETING"].includes(flow.phase);
  const canConfirmCode = flow.code.length === 6 && !busy;
  const retryDelete = flow.phase === "ERROR" && flow.notice?.retryDelete;
  const actionRequired = flow.notice?.actionRequired === true;
  const isFinal =
    flow.phase === "READY_TO_DELETE" || flow.phase === "DELETING" || retryDelete;

  return (
    <>
      <IosConfirm
        visible={flow.phase === "CONFIRMING"}
        title="Excluir conta?"
        message={`A solicitação é permanente e seu acesso será encerrado. Alguns dados fiscais ou transacionais podem ser preservados quando necessário. Pode haver pendências financeiras antes da conclusão.\n\n${roleDeletionDescription(flow.role as AccountDeletionRole)}`}
        actions={[
          { text: "Cancelar", style: "cancel", onPress: flow.close },
          { text: "Continuar", style: "destructive", onPress: flow.requestCode },
        ]}
        onClose={flow.close}
      />

      <Modal visible={visible} transparent animationType="fade" onRequestClose={busy ? undefined : flow.close}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.backdrop}>
          <View style={styles.card}>
            {flow.phase === "SUCCESS" ? (
              <>
                <Text style={styles.title}>{flow.notice?.title}</Text>
                <Text style={styles.message}>{flow.notice?.message}</Text>
                <ActivityIndicator color="#DC2626" style={styles.spinner} />
              </>
            ) : isFinal ? (
              <>
                <Text style={styles.title}>Confirmar exclusão</Text>
                <Text style={styles.message}>Ao continuar, sua sessão será encerrada.</Text>
                {flow.notice ? <Text style={styles.warning}>{flow.notice.message}</Text> : null}
                <View style={styles.actions}>
                  <Pressable disabled={busy} onPress={flow.close} style={styles.secondary}><Text style={styles.secondaryText}>Voltar</Text></Pressable>
                  {!actionRequired ? <Pressable disabled={busy} onPress={flow.deleteAccount} style={[styles.danger, busy && styles.disabled]}><Text style={styles.dangerText}>{busy ? "Excluindo..." : retryDelete ? "Tentar novamente" : "Excluir minha conta"}</Text></Pressable> : null}
                </View>
              </>
            ) : (
              <>
                <Text style={styles.title}>Confirme o código</Text>
                <Text style={styles.message}>Enviamos um código para o e-mail da sua conta.</Text>
                <TextInput value={flow.code} onChangeText={flow.setCode} keyboardType="number-pad" maxLength={6} placeholder="123456" editable={!busy} style={styles.input} />
                {flow.notice ? <Text style={styles.warning}>{flow.notice.message}</Text> : null}
                <Pressable disabled={!canConfirmCode} onPress={flow.confirmCode} style={[styles.primary, !canConfirmCode && styles.disabled]}><Text style={styles.primaryText}>{flow.phase === "CONFIRMING_CODE" ? "Confirmando..." : "Confirmar código"}</Text></Pressable>
                <Pressable disabled={busy} onPress={flow.requestCode} style={styles.link}><Text style={styles.linkText}>{flow.phase === "REQUESTING_CODE" ? "Enviando..." : "Reenviar código"}</Text></Pressable>
                {retryDelete ? <Pressable onPress={flow.deleteAccount} style={styles.primary}><Text style={styles.primaryText}>Tentar novamente</Text></Pressable> : null}
                <Pressable disabled={busy} onPress={flow.close} style={styles.link}><Text style={styles.linkText}>Cancelar</Text></Pressable>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.38)", justifyContent: "center", padding: 20 },
  card: { backgroundColor: "#FFF", borderRadius: 20, padding: 20 },
  title: { color: "#0F172A", fontSize: 20, fontWeight: "800", textAlign: "center" },
  message: { color: "#475569", fontSize: 14, fontWeight: "600", lineHeight: 20, marginTop: 10, textAlign: "center" },
  warning: { color: "#92400E", backgroundColor: "#FFFBEB", borderRadius: 10, fontSize: 13, fontWeight: "600", lineHeight: 18, marginTop: 14, padding: 10 },
  input: { borderColor: "#CBD5E1", borderRadius: 12, borderWidth: 1, fontSize: 24, fontWeight: "800", letterSpacing: 8, marginTop: 18, padding: 12, textAlign: "center" },
  primary: { alignItems: "center", backgroundColor: "#0B63F6", borderRadius: 12, marginTop: 16, padding: 14 },
  primaryText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  link: { alignItems: "center", padding: 12 },
  linkText: { color: "#0B63F6", fontSize: 14, fontWeight: "800" },
  actions: { flexDirection: "row", gap: 10, marginTop: 20 },
  secondary: { alignItems: "center", borderColor: "#CBD5E1", borderRadius: 12, borderWidth: 1, flex: 1, padding: 14 },
  secondaryText: { color: "#334155", fontSize: 15, fontWeight: "800" },
  danger: { alignItems: "center", backgroundColor: "#DC2626", borderRadius: 12, flex: 1.4, padding: 14 },
  dangerText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
  disabled: { opacity: 0.5 },
  spinner: { marginTop: 18 },
});
