import { Platform, StyleSheet } from "react-native";
import { t } from "../../../ui/tokens";

const HPAD_PIX = 20;

export const link = StyleSheet.create({
  input: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.25)",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    color: "#000000",
    fontWeight: "700",
    fontSize: 14,
  },

  primaryBtn: {
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
    flexGrow: 1,
    minWidth: 160,
  },

  primaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: -0.2,
  },

  outlineBtn: {
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.25)",
    minWidth: 92,
  },

  outlineText: {
    color: "#000000",
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: -0.2,
  },

  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0,0,0,0.18)",
    width: "100%",
    marginTop: 4,
    marginBottom: 2,
  },
});

export const s = StyleSheet.create({
  bigTitle: { color: t.colors.text, fontWeight: "900", fontSize: 28, textAlign: "center" },
  homeHeader: { alignItems: "center", paddingHorizontal: 4 },

  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },

  avatar: {
    width: 55,
    height: 55,
    borderRadius: 26,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarTxt: { color: t.colors.text2, fontSize: 18, fontWeight: "900" },

  accountTitle: { color: t.colors.text, fontWeight: "900", fontSize: 16 },
  accountSub: { marginTop: 2, color: t.colors.text2, fontWeight: "700", fontSize: 12 },
  smallChev: { color: t.colors.text2, fontSize: 18, fontWeight: "900" },

  group: {
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },

  rowTitle: { color: t.colors.text, fontWeight: "900", fontSize: 16, letterSpacing: 0.2 },
  rowSub: { marginTop: 2, color: t.colors.text2, fontWeight: "700", fontSize: 12 },
  rowRight: { color: t.colors.text2, fontWeight: "900", fontSize: 12 },
  chev: { color: t.colors.text2, fontSize: 30, fontWeight: "900" },

  cardTitle: { color: t.colors.text, fontWeight: "900", fontSize: 14 },

  tokenOuter: {
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: 14,
    padding: 10,
    backgroundColor: "#FFFFFF",
  },

  tokenInner: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  tokenText: { color: t.colors.text, fontWeight: "900", fontSize: 20, letterSpacing: 1 },

  hint: { color: t.colors.muted, fontWeight: "800", fontSize: 12, lineHeight: 18 },

  label: { color: t.colors.muted, fontWeight: "900", fontSize: 12 },

  input: {
    height: 46,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    paddingHorizontal: 12,
    color: t.colors.text,
    fontWeight: "800",
  },

  line: { color: t.colors.text2, fontWeight: "800" },
  bold: { color: t.colors.text, fontWeight: "900" },
});

export const iosTop = StyleSheet.create({
  nav: {
    height: 52,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backBtn: { minWidth: 64, height: 44, justifyContent: "center" },
  backText: { color: "#000000", fontSize: 22, fontWeight: "800", letterSpacing: -0.2 },

  navTitle: { color: "#000000", fontSize: 17, fontWeight: "900", letterSpacing: -0.2 },
  rightSlot: { minWidth: 64, height: 44, alignItems: "flex-end", justifyContent: "center" },

  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(0,0,0,0.18)", width: "100%" },
});

export const pix = StyleSheet.create({
  nav: {
    height: 52,
    paddingHorizontal: HPAD_PIX,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  backBtn: { minWidth: 64, height: 44, justifyContent: "center" },
  backText: { color: "#000000", fontSize: 22, fontWeight: "800", letterSpacing: -0.2 },
  navTitle: { color: "#000000", fontSize: 17, fontWeight: "900", letterSpacing: -0.2 },
  rightBtn: { minWidth: 64, height: 44, alignItems: "flex-end", justifyContent: "center" },
  rightText: { color: "#000000", fontSize: 16, fontWeight: "900" },

  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(0,0,0,0.18)", width: "100%" },

  scroll: { paddingTop: 16, paddingHorizontal: HPAD_PIX, paddingBottom: 18 },

  sectionTitle: { color: "#000000", fontSize: 18, fontWeight: "900", letterSpacing: -0.2 },
  sub: { marginTop: 6, color: "#000000", fontSize: 12, fontWeight: "700", opacity: 0.75, lineHeight: 16 },

  label: { color: "#000000", fontSize: 12, fontWeight: "900", opacity: 0.72, letterSpacing: 0.2 },

  chipsRow: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.25)",
    backgroundColor: "#FFFFFF",
  },

  chipActive: { borderColor: "#000000", backgroundColor: "#000000" },
  chipText: { color: "#000000", fontSize: 12, fontWeight: "900", letterSpacing: -0.1, opacity: 0.85 },
  chipTextActive: { color: "#FFFFFF", opacity: 1 },

  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.35)",
    borderRadius: 14,
    paddingHorizontal: 14,
    color: "#000000",
    backgroundColor: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    marginTop: 10,
  },

  ctaWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: HPAD_PIX,
    paddingBottom: Platform.OS === "ios" ? 18 : 14,
    paddingTop: 10,
  },

  btn: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
  },

  btnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900", letterSpacing: -0.2 },
});

export const beneficiaryStyles = StyleSheet.create({
  deleteBtn: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D11A2A",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  deleteBtnText: {
    color: "#D11A2A",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
});