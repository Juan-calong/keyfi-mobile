// ui/components/IosAlert.tsx
import React from "react";
import { Modal, View, Text, Pressable, StyleSheet, Platform } from "react-native";

type Props = {
  visible: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  onClose: () => void;
};

export function IosAlert({
  visible,
  title = "Aviso",
  message = "",
  confirmText = "OK",
  onClose,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={s.backdrop}>
        <View style={s.card}>
          {!!title && <Text style={s.title}>{title}</Text>}
          {!!message && <Text style={s.msg}>{message}</Text>}

          <View style={s.sep} />

          <Pressable onPress={onClose} style={({ pressed }) => [s.btn, pressed && s.pressed]}>
            <Text style={s.btnText}>{confirmText}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 14,
    backgroundColor: Platform.OS === "ios" ? "rgba(255,255,255,0.92)" : "#FFF",
    overflow: "hidden",
    paddingTop: 16,
  },
  title: {
    textAlign: "center",
    fontSize: 17,
    fontWeight: "800",
    paddingHorizontal: 18,
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  msg: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 13.5,
    fontWeight: "600",
    paddingHorizontal: 18,
    paddingBottom: 14,
    color: "#334155",
    lineHeight: 18,
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(148,163,184,0.6)",
  },
  btn: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0B63F6",
    letterSpacing: -0.2,
  },
  pressed: { opacity: 0.6 },
});