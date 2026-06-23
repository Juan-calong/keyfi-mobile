import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { LegalDocumentModal } from "./LegalDocumentModal";
import { TERMS_OF_USE_V2 } from "./termsOfUse.v2";

type Props = {
  checked: boolean;
  error?: boolean;
  onChange: (checked: boolean) => void;
};

export function TermsAcceptanceField({
  checked,
  error = false,
  onChange,
}: Props) {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <View
        style={[
          styles.card,
          checked && styles.cardChecked,
          error && styles.cardError,
        ]}
      >
        <View style={styles.row}>
          <Pressable
            onPress={() => onChange(!checked)}
            hitSlop={10}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            style={({ pressed }) => [
              styles.checkbox,
              checked && styles.checkboxOn,
              pressed && styles.pressed,
            ]}
          >
            {checked ? (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            ) : null}
          </Pressable>

          <Pressable
            onPress={() => onChange(!checked)}
            style={({ pressed }) => [
              styles.textPressable,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.title}>Aceite obrigatório</Text>

            <Text style={styles.text}>
              Li e concordo com os Termos de Uso, Política de Privacidade,
              Compras, Devoluções e Regulamento de Comissões da KeyFi.
            </Text>

            <Text style={styles.ageText}>Declaro ser maior de 18 anos.</Text>
          </Pressable>
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => setModalVisible(true)}
            style={({ pressed }) => [
              styles.readButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="document-text-outline" size={16} color="#006175" />
            <Text style={styles.readButtonText}>Ler termos completos</Text>
          </Pressable>
        </View>
      </View>

      {error ? (
        <Text style={styles.errorText}>
          Você precisa aceitar os termos para continuar.
        </Text>
      ) : null}

      <LegalDocumentModal
        visible={modalVisible}
        title={TERMS_OF_USE_V2.title}
        subtitle={`Versão ${TERMS_OF_USE_V2.version} • vigência em ${TERMS_OF_USE_V2.publishedAt}`}
        content={TERMS_OF_USE_V2.content}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  cardChecked: {
    backgroundColor: "#F0FDFA",
    borderColor: "#99F6E4",
  },

  cardError: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
  },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  checkbox: {
    width: 24,
    height: 24,
    marginTop: 2,
    borderRadius: 8,
    borderWidth: 1.8,
    borderColor: "#94A3B8",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  checkboxOn: {
    borderColor: "#006175",
    backgroundColor: "#006175",
  },

  textPressable: {
    flex: 1,
  },

  title: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 4,
  },

  text: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
    color: "#475569",
  },

  ageText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
    color: "#334155",
  },

  actionsRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#CBD5E1",
  },

  readButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#EAF7F7",
  },

  readButtonText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
    color: "#006175",
  },

  errorText: {
    marginTop: 8,
    fontSize: 12.5,
    lineHeight: 18,
    color: "#DC2626",
    fontWeight: "700",
  },

  pressed: {
    opacity: 0.72,
  },
});