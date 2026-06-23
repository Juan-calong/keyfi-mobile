import React, { useMemo } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  content: string;
  onClose: () => void;
};

type LegalLine = {
  id: string;
  text: string;
  type: "title" | "section" | "subsection" | "bullet" | "paragraph" | "spacer";
};

function normalizeLegalContent(content: string): LegalLine[] {
  const rawLines = String(content || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim());

  const lines: LegalLine[] = [];

  rawLines.forEach((line, index) => {
    if (!line) {
      lines.push({
        id: `spacer-${index}`,
        text: "",
        type: "spacer",
      });
      return;
    }

    const isMainTitle =
      index <= 4 &&
      line.length > 12 &&
      line === line.toUpperCase() &&
      !/^\d/.test(line);

    const isSection = /^\d+\.\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9 ,/()–-]+$/.test(line);
    const isSubsection = /^\d+\.\d+\.\s+/.test(line);
    const isBullet = /^(\*|-|•)\s*/.test(line);

    lines.push({
      id: `line-${index}`,
      text: isBullet ? line.replace(/^(\*|-|•)\s*/, "") : line,
      type: isMainTitle
        ? "title"
        : isSection
          ? "section"
          : isSubsection
            ? "subsection"
            : isBullet
              ? "bullet"
              : "paragraph",
    });
  });

  return lines;
}

export function LegalDocumentModal({
  visible,
  title,
  subtitle,
  content,
  onClose,
}: Props) {
  const lines = useMemo(() => normalizeLegalContent(content), [content]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerEyebrow}>Documento legal</Text>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.closeText}>Fechar</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
          >
            {lines.map((line) => {
              if (line.type === "spacer") {
                return <View key={line.id} style={styles.spacer} />;
              }

              if (line.type === "title") {
                return (
                  <Text key={line.id} style={styles.documentTitle}>
                    {line.text}
                  </Text>
                );
              }

              if (line.type === "section") {
                return (
                  <View key={line.id} style={styles.sectionBlock}>
                    <Text style={styles.sectionText}>{line.text}</Text>
                  </View>
                );
              }

              if (line.type === "subsection") {
                return (
                  <Text key={line.id} style={styles.subsectionText}>
                    {line.text}
                  </Text>
                );
              }

              if (line.type === "bullet") {
                return (
                  <View key={line.id} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{line.text}</Text>
                  </View>
                );
              }

              return (
                <Text key={line.id} style={styles.paragraph}>
                  {line.text}
                </Text>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>Entendi</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.56)",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 28,
  },

  card: {
    width: "100%",
    maxHeight: "90%",
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000000",
        shadowOpacity: 0.18,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
      },
      android: {
        elevation: 12,
      },
    }),
  },

  handle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#CBD5E1",
    marginTop: 10,
    marginBottom: 4,
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },

  headerTextWrap: {
    flex: 1,
    paddingRight: 4,
  },

  headerEyebrow: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: "#006175",
    marginBottom: 6,
  },

  title: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "900",
    color: "#0F172A",
  },

  subtitle: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    color: "#64748B",
  },

  closeButton: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },

  closeText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#006175",
  },

  scroll: {
    flexGrow: 0,
    backgroundColor: "#F8FAFC",
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
  },

  documentTitle: {
    fontSize: 18,
    lineHeight: 25,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 14,
  },

  sectionBlock: {
    marginTop: 20,
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#EAF7F7",
    borderLeftWidth: 4,
    borderLeftColor: "#006175",
  },

  sectionText: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "900",
    color: "#0F172A",
  },

  subsectionText: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 14.5,
    lineHeight: 21,
    fontWeight: "800",
    color: "#0F172A",
  },

  paragraph: {
    marginBottom: 10,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "500",
    color: "#334155",
  },

  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    paddingLeft: 4,
  },

  bulletDot: {
    width: 18,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "900",
    color: "#006175",
  },

  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "500",
    color: "#334155",
  },

  spacer: {
    height: 4,
  },

  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },

  primaryButton: {
    height: 46,
    borderRadius: 14,
    backgroundColor: "#006175",
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonText: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  pressed: {
    opacity: 0.72,
  },
});