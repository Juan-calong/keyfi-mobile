import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { UnavailableCartItem } from "../../../core/api/services/cart.service";

const messages: Record<UnavailableCartItem["reason"], string> = {
  PRODUCT_INACTIVE: "Este produto não está mais disponível.",
  PRODUCT_MISSING: "Este produto não está mais disponível no catálogo.",
  FORBIDDEN_FOR_ROLE: "Este produto não está disponível para este perfil.",
};

type Props = {
  items: UnavailableCartItem[];
  pendingProductId: string | null;
  onRemove: (productId: string) => void;
};

export function UnavailableCartItems({ items, pendingProductId, onRemove }: Props) {
  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Produtos indisponíveis</Text>
      <Text style={styles.explanation}>Remova estes produtos para continuar a compra.</Text>
      {items.map((item) => {
        const pending = pendingProductId === item.productId;
        return (
          <View key={item.productId} style={styles.item}>
            <View style={styles.description}>
              <Text style={styles.title}>Produto indisponível</Text>
              <Text style={styles.reason}>{messages[item.reason] ?? "Este produto não está disponível."}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={pendingProductId !== null}
              onPress={() => onRemove(item.productId)}
              style={[styles.remove, pending && styles.disabled]}
            >
              {pending ? <ActivityIndicator size="small" color="#8A1F1F" /> : <Text style={styles.removeText}>Remover</Text>}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginHorizontal: 16, marginTop: 16, marginBottom: 12, padding: 16, borderRadius: 16, backgroundColor: "#FFF5F3", borderWidth: 1, borderColor: "#F1C6C0" },
  heading: { color: "#8A1F1F", fontWeight: "800", fontSize: 16 },
  explanation: { color: "#65413E", fontSize: 13, marginTop: 4, marginBottom: 12 },
  item: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#F1C6C0" },
  description: { flex: 1, paddingRight: 12 },
  title: { color: "#2E2A29", fontSize: 14, fontWeight: "700" },
  reason: { color: "#65413E", fontSize: 12, marginTop: 4 },
  remove: { paddingVertical: 9, paddingHorizontal: 12, minWidth: 72, alignItems: "center", borderRadius: 9, backgroundColor: "#FFFFFF" },
  disabled: { opacity: 0.6 },
  removeText: { color: "#8A1F1F", fontSize: 13, fontWeight: "700" },
});
