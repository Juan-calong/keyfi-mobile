import { Platform, StyleSheet } from "react-native";
const BG = "#fcfcfd";
const CARD = "#FFFFFF";
const TEXT = "#111111";
const MUTED = "#6E6E73";
const BORDER = "rgba(0,0,0,0.08)";
const GOLD = "#B6923E";
const GREEN = "#16A34A";

export const s = StyleSheet.create({

  nav: {
    minHeight: 64,
    paddingVertical: 8,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: BG,
  },

  backHit: {
    width: 68,
    height: 44,
    borderRadius: 22,
    alignItems: "flex-start",
    justifyContent: "center",
    paddingLeft: 8,
  },

  backText: {
    color: TEXT,
    fontSize: 28,
    lineHeight: 28,
    fontWeight: "500",
  },

  titleWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    color: TEXT,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.2,
  },

  subtitle: {
    marginTop: 2,
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
  },

  navRightSpacer: {
    width: 68,
    height: 44,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingRight: 8,
  },

    rightText: {
    color: GOLD,
    fontSize: 14,
    fontWeight: "800",
  },

  section: { marginTop: 16 },
  sectionCompact: { marginTop: 8 },

sectionLabel: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },

  productsScroll: { flex: 1 },

  productsContent: {
    paddingTop: 10,
    paddingHorizontal: 9,
  },

  productCard: {
    backgroundColor: CARD,
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 2 },
    }),
  },

  productTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  thumbWrap: {
    width: 74,
    height: 74,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: BG,
  },

  thumb: { width: "100%", height: "100%" },

    thumbPh: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BG,
  },

  thumbPhText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
  },

  rowMiddle: { flex: 1, minWidth: 0, paddingRight: 8 },

  itemName: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
  },

  itemVariant: {
    marginTop: 4,
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
  },

  itemQuantityDiscount: {
    marginTop: 5,
    color: GREEN,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },

  rowRight: {
    alignItems: "flex-end",
    minWidth: 94,
  },

  price: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "800",
  },

  oldPrice: {
    marginTop: 2,
    color: MUTED,
    fontSize: 12,
    textDecorationLine: "line-through",
    letterSpacing: -0.2,
    fontWeight: "600",
  },

  productActionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginTop: 12,
      },

  productBottomRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  removeBtn: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 0,
  },

  removeText: {
    color: GOLD,
    fontSize: 13,
    fontWeight: "800",
  },

  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BG,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.10)",
    overflow: "hidden",
    height: 44,
  },

  stepperBtn: {
    minWidth: 44,
    minHeight: 44,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  stepperMid: {
    minWidth: 40,
    minHeight: 44,
    backgroundColor: "#FFFFFF",
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  stepperSymbol: {
    color: TEXT,
    fontSize: 20,
    lineHeight: 20,
    fontWeight: "600",
  },

  stepperQty: {
   color: TEXT,
    fontSize: 14,
    fontWeight: "800",
  },

  promoRow: { flexDirection: "row", alignItems: "center", gap: 10 },

  promoInput: {
    flex: 1,
    height: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 14,
    color: TEXT,
    fontSize: 15,
    backgroundColor: CARD,
  },

  promoBtn: {
    height: 48,
    minWidth: 98,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111111",
  },

  promoBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  appliedRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  promoApplied: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },

  clearCouponHit: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CARD,
  },

  clearCouponText: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "sans-serif" },
    }),
  },

    summaryCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },

  summaryKey: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    paddingRight: 8,
  },

  summaryVal: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
    flexShrink: 1,
    maxWidth: "58%",
  },

  summaryPositive: {
    color: GREEN,
  },

  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
  },

  totalRow: { paddingVertical: 12 },

  totalKey: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "800",
  },

  totalVal: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "900",
  },

  fixedBottomWrap: {
    flexShrink: 0,
    paddingTop: 8,
    paddingHorizontal: 9,
    backgroundColor: "transparent",
  },

  checkoutCard: {
    backgroundColor: CARD,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    ...Platform.select({
        ios: {
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 4 },
    }),
  },

  checkoutTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  checkoutTotalWrap: {
    flex: 1,
    minWidth: 0,
  },

  checkoutTotalLabel: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
  },

  checkoutTotalValue: {
    marginTop: 2,
    color: TEXT,
    fontSize: 18,
    fontWeight: "900",
  },

  checkoutFreightHint: {
    marginTop: 2,
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
  },

  checkoutBtn: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  checkoutText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  openSummaryHit: {
    marginTop: 6,
    minHeight: 44,
    alignItems: "flex-start",
    justifyContent: "center",
  },

  openSummaryText: {
    color: GOLD,
    fontSize: 13,
    fontWeight: "800",
  },

  sheetKeyboard: {
    flex: 1,
    justifyContent: "flex-end",
  },

  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.32)",
  },

  sheetWrap: {
    backgroundColor: CARD,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    maxHeight: "82%",
  },

  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D1D1D6",
    marginBottom: 10,
  },

  sheetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  sheetTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "800",
  },

  sheetCloseHit: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  sheetCloseText: {
    color: MUTED,
    fontSize: 18,
    fontWeight: "700",
  },

  sheetSecurityText: {
    marginTop: 16,
    marginBottom: 6,
    textAlign: "center",
    color: MUTED,
    fontSize: 12,
    fontWeight: "600",
  },

  bannerWrap: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 },

  bannerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#FFF8EC",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(182,146,62,0.24)",
  },

  bannerTitle: {
    color: "#5B4A1E",
    fontSize: 13,
    fontWeight: "800",
  },

  bannerMsg: {
    marginTop: 2,
    color: "#6E6E73",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },

  bannerBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
  },

  bannerBtnText: {
    color: GOLD,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: -0.2,
  },

  emptyWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  emptyIconWrap: {
    width: 112,
    height: 112,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    backgroundColor: "#FFF8EC",
  },

  emptyIcon: {
    width: 80,
    height: 80,
    resizeMode: "contain",
    tintColor: GOLD,
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: TEXT,
    marginBottom: 8,
    textAlign: "center",
  },

  emptySubtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: MUTED,
    textAlign: "center",
    maxWidth: 300,
    marginBottom: 24,
  },

  emptyBtn: {
    minWidth: 190,
    minHeight: 52,
    paddingHorizontal: 22,
    borderRadius: 18,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});