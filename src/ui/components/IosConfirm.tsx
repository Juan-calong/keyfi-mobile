import React from "react";
import { Modal, View, Text, Pressable, StyleSheet, Platform } from "react-native";

type ActionStyle = "default" | "cancel" | "destructive";

export type IosConfirmAction = {
  text: string;
  style?: ActionStyle;
  onPress?: () => void;
  disabled?: boolean;
};

type Props = {
  visible: boolean;
  title?: string;
  message?: string;
  actions: IosConfirmAction[]; // 1..3 (recomendado)
  onClose: () => void;
};

function pickTextStyle(style?: ActionStyle) {
  if (style === "destructive") return s.btnTextDestructive;
  if (style === "cancel") return s.btnTextCancel;
  return s.btnText;
}

export function IosConfirm({
  visible,
  title = "Aviso",
  message = "",
  actions,
  onClose,
}: Props) {
  const safeActions = (actions || []).slice(0, 3);

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

          {safeActions.map((a, idx) => {
            const isLast = idx === safeActions.length - 1;
            const disabled = !!a.disabled;

            return (
              <React.Fragment key={`${a.text}-${idx}`}>
                <Pressable
                  disabled={disabled}
                  onPress={() => {
                    // fecha primeiro pra ficar com feeling iOS
                    onClose();
                    a.onPress?.();
                  }}
                  style={({ pressed }) => [
                    s.btn,
                    pressed && !disabled && s.pressed,
                    disabled && s.disabled,
                  ]}
                >
                  <Text style={[s.btnTextBase, pickTextStyle(a.style), disabled && s.btnTextDisabled]}>
                    {a.text}
                  </Text>
                </Pressable>

                {!isLast ? <View style={s.sep} /> : null}
              </React.Fragment>
            );
          })}
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
    paddingHorizontal: 12,
  },
  btnTextBase: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  btnText: {
    color: "#0B63F6",
  },
  btnTextCancel: {
    color: "#0B63F6",
  },
  btnTextDestructive: {
    color: "#DC2626",
  },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.5 },
  btnTextDisabled: { opacity: 0.7 },
});