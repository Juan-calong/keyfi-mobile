import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { t } from "../tokens";

export function SectionHeader({ title, onPress }: { title: string; onPress?: () => void }) {
  return (
    <View style={s.row}>
      <Text style={[t.text.section, { color: t.colors.text }]}>{title}</Text>

      {onPress ? (
        <Pressable onPress={onPress} hitSlop={10}>
          <Text style={s.chev}>›</Text>
        </Pressable>
      ) : (
        <Text style={s.chev} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  // ✅ chevron mantém só o visual
  chev: {
    fontSize: 22,
    fontWeight: "700",
    color: t.colors.text2,
  },
});
