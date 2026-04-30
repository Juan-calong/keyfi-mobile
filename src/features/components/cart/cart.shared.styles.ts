import { Platform, StyleSheet } from "react-native";
import { HAIRLINE } from "./cart.shared.utils";

export const s = StyleSheet.create({
  content: {
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 24,
  },

  nav: {
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: HAIRLINE,
    borderBottomColor: "#00000022",
    backgroundColor: "#FFFFFF",
  },

  backHit: { minWidth: 60 },

  backText: {
    color: "#000000",
    fontSize: 21,
    letterSpacing: -0.2,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "sans-serif" },
    }),
  },

  title: {
    color: "#000000",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.3,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "sans-serif-medium" },
    }),
  },

  navRightSpacer: { minWidth: 60 },

  section: { marginTop: 18 },

  sectionLabel: {
    color: "#000000",
    fontSize: 13,
    letterSpacing: 0.2,
    marginBottom: 10,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "sans-serif" },
    }),
  },

  divider: { height: HAIRLINE, backgroundColor: "#00000022" },
  dividerAfterLast: { backgroundColor: "#00000022" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },

  thumbWrap: {
    width: 52,
    height: 52,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: HAIRLINE,
    borderColor: "#00000022",
    backgroundColor: "#FFFFFF",
  },

  thumb: { width: "100%", height: "100%" },

  thumbPh: { flex: 1, alignItems: "center", justifyContent: "center" },

  thumbPhText: {
    color: "#00000066",
    fontSize: 10,
    fontWeight: "700",
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "sans-serif" },
    }),
  },

  rowMiddle: { flex: 1, paddingRight: 10, minWidth: 0 },

  itemName: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "sans-serif-medium" },
    }),
  },

  itemVariant: {
    marginTop: 3,
    color: "#000000AA",
    fontSize: 13,
    letterSpacing: -0.1,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "sans-serif" },
    }),
  },

    itemQuantityDiscount: {
    marginTop: 4,
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: -0.1,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "sans-serif-medium" },
    }),
  },

  rowRight: { alignItems: "flex-end", gap: 10 },

  priceStack: { alignItems: "flex-end", gap: 2 },

  price: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "sans-serif-medium" },
    }),
  },

  oldPrice: {
    color: "#00000066",
    fontSize: 12,
    fontWeight: "600",
    textDecorationLine: "line-through",
    letterSpacing: -0.2,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "sans-serif" },
    }),
  },

  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: HAIRLINE,
    borderColor: "#00000055",
    borderRadius: 10,
    overflow: "hidden",
    height: 30,
  },

  stepperBtn: {
    width: 34,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  stepperMid: {
    width: 32,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: HAIRLINE,
    borderRightWidth: HAIRLINE,
    borderColor: "#00000022",
  },

  stepperSymbol: {
    color: "#000000",
    fontSize: 16,
    lineHeight: 16,
    fontWeight: "500",
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "sans-serif-medium" },
    }),
  },

  stepperQty: {
    color: "#000000",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.2,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "sans-serif-medium" },
    }),
  },

  removeHit: {
    marginLeft: 6,
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },

  removeX: {
    color: "#00000066",
    fontSize: 22,
    lineHeight: 22,
    fontWeight: "600",
  },

  promoRow: { flexDirection: "row", alignItems: "center", gap: 10 },

  promoInput: {
    flex: 1,
    height: 44,
    borderWidth: HAIRLINE,
    borderColor: "#00000055",
    borderRadius: 12,
    paddingHorizontal: 14,
    color: "#000000",
    fontSize: 15,
    letterSpacing: -0.2,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "sans-serif" },
    }),
  },

  promoBtn: {
    height: 44,
    paddingHorizontal: 16,
    borderWidth: HAIRLINE,
    borderColor: "#00000055",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  promoBtnText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "sans-serif-medium" },
    }),
  },

  appliedRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  promoApplied: {
    color: "#000000AA",
    fontSize: 12,
    fontWeight: "700",
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "sans-serif" },
    }),
  },

  clearCouponHit: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: HAIRLINE,
    borderColor: "#00000022",
    backgroundColor: "#FFFFFF",
  },

  clearCouponText: {
    color: "#000000",
    fontSize: 12,
    fontWeight: "700",
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "sans-serif" },
    }),
  },

  summary: { borderRadius: 12, overflow: "hidden" },

  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },

  summaryKey: {
    color: "#000000",
    fontSize: 14,
    letterSpacing: -0.2,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "sans-serif" },
    }),
  },

  summaryVal: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: -0.2,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "sans-serif-medium" },
    }),
  },

  totalRow: { paddingVertical: 14 },

  totalKey: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "sans-serif-medium" },
    }),
  },

  totalVal: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.2,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "sans-serif-medium" },
    }),
  },

  footer: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopWidth: HAIRLINE,
    borderTopColor: "#00000022",
    backgroundColor: "#FFFFFF",
  },

  checkoutBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },

  checkoutText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
    ...Platform.select({
      ios: { fontFamily: "System" },
      android: { fontFamily: "sans-serif-medium" },
    }),
  },

  bannerWrap: { paddingHorizontal: 18, paddingTop: 10 },

  bannerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    borderWidth: HAIRLINE,
    borderColor: "#00000022",
  },

  bannerTitle: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.2,
  },

  bannerMsg: {
    marginTop: 2,
    color: "#334155",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },

  bannerBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: HAIRLINE,
    borderColor: "#00000022",
  },

  bannerBtnText: {
    color: "#0B63F6",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: -0.2,
  },

  sectionCompact: {
  marginTop: 0,
},

productsScroll: {
  flex: 1,
},

productsContent: {
  paddingTop: 18,
  paddingHorizontal: 18,
  paddingBottom: 20,
},

fixedBottomWrap: {
  flexShrink: 0,
  paddingHorizontal: 18,
  paddingTop: 12,
  borderTopWidth: HAIRLINE,
  borderTopColor: "#00000022",
  backgroundColor: "#FFFFFF",

  shadowColor: "#000",
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: -3 },
  elevation: 6,
},

checkoutOnlyWrap: {
  marginTop: 13,
},

});