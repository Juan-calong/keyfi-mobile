import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Props = {
  title: string;
  text?: string | null;
  previewLines?: number;
  minCharsToShowButton?: number;
  alwaysShowButton?: boolean;
  buttonLabel?: string;
};

export function ExpandableInfoText({
  title,
  text,
  previewLines = 4,
  minCharsToShowButton = 140,
  alwaysShowButton = false,
  buttonLabel = "Ver mais",
}: Props) {
  const [visible, setVisible] = useState(false);

  const content = useMemo(() => (text ?? "").trim(), [text]);

  if (!content) return null;

  const shouldShowButton =
    alwaysShowButton || content.length > minCharsToShowButton;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>

      <Text
        style={styles.content}
        numberOfLines={shouldShowButton ? previewLines : undefined}
      >
        {content}
      </Text>

      {shouldShowButton ? (
        <Pressable
          onPress={() => setVisible(true)}
          style={({ pressed }) => [
            styles.linkButton,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.linkText}>{buttonLabel}</Text>
        </Pressable>
      ) : null}

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>

              <Pressable
                onPress={() => setVisible(false)}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.closeText}>Fechar</Text>
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              <Text style={styles.modalContent}>{content}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  content: {
    fontSize: 14,
    lineHeight: 22,
    color: "#4B5563",
  },
  linkButton: {
    marginTop: 8,
    alignSelf: "flex-start",
  },
  linkText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    maxHeight: "72%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ECECEC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginRight: 12,
  },
  closeButton: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  closeText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  modalScrollContent: {
    padding: 16,
  },
  modalContent: {
    fontSize: 15,
    lineHeight: 24,
    color: "#374151",
  },
});