import { StyleSheet } from "react-native";
import { COLORS } from "./productDetails.utils";

export const s = StyleSheet.create({
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.bg,
    marginTop: 2,
  },

  headerCenter: {
    flex: 1,
  },

  back: {
    minWidth: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  chev: {
    fontSize: 22,
    lineHeight: 24,
    color: COLORS.text,
    fontWeight: "700",
  },

  backText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.2,
  },

  scrollContent: {
    paddingTop: 6,
    paddingBottom: 28,
  },

  mainCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 0,
    overflow: "hidden",
    width: "100%",
  },

  galleryWrap: {
    width: "100%",
    backgroundColor: "#F4ECE6",
    position: "relative",
    overflow: "hidden",
  },

  galleryItem: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4ECE6",
  },

  heroImg: {
    width: "100%",
    height: "100%",
  },

  heroPh: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFE6E0",
  },

  phText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "800",
  },

  heroFavoritePill: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  videoBadge: {
    position: "absolute",
    left: 14,
    bottom: 24,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.78)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  videoBadgeText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
  },

  stockBadge: {
    position: "absolute",
    left: 14,
    top: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(23,20,23,0.82)",
  },

  stockBadgeText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 11,
  },

  galleryDotsWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  galleryDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "#D8D1C8",
  },

  galleryDotActive: {
    width: 8,
    height: 8,
    backgroundColor: "#8A6A32",
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 18,
  },

  promoPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#5D5351",
    marginBottom: 10,
  },

  promoPillText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 10.5,
    letterSpacing: 0.2,
  },

  name: {
    color: COLORS.text,
    fontWeight: "900",
    fontSize: 26,
    lineHeight: 31,
    letterSpacing: -0.5,
    flexShrink: 1,
  },

  subtitle: {
    marginTop: 8,
    color: COLORS.textSoft,
    fontWeight: "600",
    fontSize: 14,
    lineHeight: 21,
  },

  ratingWrap: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },

  ratingText: {
    color: COLORS.text,
    fontWeight: "800",
    fontSize: 13,
  },

  ratingCount: {
    color: COLORS.textMuted,
    fontWeight: "700",
    fontSize: 13,
  },

    priceStack: {
    marginTop: 12,
    marginBottom: 10,
  },


  priceRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },

  oldPrice: {
    color: "#8A817A",
    fontWeight: "700",
    textDecorationLine: "line-through",
    fontSize: 13,
  },
    originalPricePromoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },

  pricePromo: {
    color: COLORS.black,
    fontWeight: "900",
    fontSize: 24,
    lineHeight: 28,
  },

quantityDiscountText: {
  marginTop: 6,
  color: COLORS.textSoft,
  fontWeight: "700",
  fontSize: 12,
  lineHeight: 17,
},

  offersSection: {
    marginTop: 10,
    gap: 8,
  },

offerBadgesWrap: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 8,
},

promoOfferChip: {
  alignSelf: "flex-start",
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: 999,
  backgroundColor: "#F3E7D0",
},

promoOfferText: {
  color: "#6B4B16",
  fontWeight: "900",
  fontSize: 11,
  letterSpacing: 0.2,
},

quantityOfferChip: {
  alignSelf: "flex-start",
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderRadius: 6,
  backgroundColor: "transparent",
  borderWidth: 2,
  borderColor: "#A06A2C",
},

quantityOfferText: {
  color: "#A06A2C",
  fontWeight: "800",
  fontSize: 12,
},

  offerBadgeChip: {
    maxWidth: "100%",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#F4EEE8",
    borderWidth: 1,
    borderColor: "#E5D8CC",
  },

  offerBadgeText: {
    color: COLORS.black,
    fontWeight: "700",
    fontSize: 11.5,
  },

  offerDescriptionText: {
    color: COLORS.textSoft,
    fontWeight: "600",
    fontSize: 12.5,
    lineHeight: 18,
  },

  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },

  sectionStack: {
    gap: 0,
  },

  sectionSpacing: {

  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },

  benefitsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  benefitChip: {
    maxWidth: "100%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F4EEE8",
    borderWidth: 1,
    borderColor: "#E5D8CC",
  },

  benefitChipText: {
    color: COLORS.black,
    fontWeight: "700",
    fontSize: 13,
  },

    floatingCartBar: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingTop: 11,
    borderWidth: 1,
    borderColor: "#ECE2D8",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },

  cartActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },

  qtyGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

    qtyPill: {
    width: 120,
    height: 54,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EFE8E1",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  qtyPillBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  qtyBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  qtyValueWrap: {
    minWidth: 38,
    height: 42,
    borderRadius: 999,
    paddingHorizontal: 10,
    backgroundColor: "#F6F2EE",
    alignItems: "center",
    justifyContent: "center",
  },

  qtyValue: {
    color: "#000000",
    fontWeight: "900",
    fontSize: 16,
    includeFontPadding: false,
  },

    qtyPillSymbol: {
    color: "#000000",
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "700",
    includeFontPadding: false,
    textAlign: "center",
  },

  primaryCta: {
    minWidth: 0,
    height: 54,
    borderRadius: 20,
    backgroundColor: "#050505",
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 10,
  },

  primaryCtaDisabled: {
    opacity: 0.4,
  },

  primaryCtaText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: -0.2,
  },

  
  reviewsPremiumCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#ECE2D8",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  reviewsPremiumTitle: {
    color: "#111111",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },
  reviewsSummaryRow: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
  reviewsAverageBlock: { width: 82 },
  reviewsAverageScoreRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  reviewsAverageScore: { color: "#111111", fontSize: 32, fontWeight: "900" },
  reviewsAverageStar: { color: "#C28A20", fontSize: 22, fontWeight: "900", marginTop: 2 },
  reviewsAverageCount: { marginTop: 2, color: "#6F6F6F", fontSize: 12.5, fontWeight: "700" },
  reviewsEmptyContent: { flex: 1 },
  reviewsEmptyTitle: { color: "#111111", fontSize: 15, fontWeight: "800" },
  reviewsEmptySub: { marginTop: 4, color: "#6F6F6F", fontSize: 12.5, lineHeight: 18, fontWeight: "600" },
  reviewBlockedInline: { marginTop: 10, color: "#6F6F6F", fontSize: 12.5, lineHeight: 18, fontWeight: "600" },
  reviewsSimpleState: { paddingVertical: 6 },
  reviewsSimpleStateTitle: { color: "#111111", fontSize: 15, fontWeight: "800" },
  reviewsSimpleStateSub: { marginTop: 4, color: "#6F6F6F", fontSize: 12.5, lineHeight: 18, fontWeight: "600" },
  reviewsInlineMuted: { marginTop: 10, color: "#6F6F6F", fontSize: 12.5, fontWeight: "600" },
    ratingBreakdown: { flex: 1, gap: 6 },
  ratingBreakdownRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  ratingBreakdownLabel: { width: 28, color: "#6F6F6F", fontSize: 11, fontWeight: "800" },
  ratingBreakdownTrack: { flex: 1, height: 6, borderRadius: 999, backgroundColor: "#EFE8DF", overflow: "hidden" },
  ratingBreakdownFill: { height: "100%", borderRadius: 999, backgroundColor: "#C28A20" },
  ratingBreakdownCount: { width: 16, textAlign: "right", color: "#6F6F6F", fontSize: 11, fontWeight: "800" },
  reviewCurrentCard: {
    marginTop: 10, borderRadius: 16, borderWidth: 1, borderColor: "#E8DED5", backgroundColor: "#FCFAF8", padding: 12, gap: 8,
  },
  reviewCurrentTitle: { color: COLORS.text, fontWeight: "800", fontSize: 13 },
  reviewCurrentBody: { color: COLORS.textSoft, fontSize: 13, lineHeight: 20, fontWeight: "500" },

  reviewWriteIntro: { marginTop: 10, marginBottom: 2 },
  reviewWriteTitle: { color: "#111111", fontSize: 15, fontWeight: "800" },
  reviewWriteSubtitle: { marginTop: 2, color: "#6F6F6F", fontSize: 12.5, fontWeight: "600" },
  reviewSuccessInline: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: "#F4EEE8",
    borderWidth: 1,
    borderColor: "#E8DDD2",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  reviewSuccessInlineTitle: { color: COLORS.text, fontSize: 13, fontWeight: "800" },
  reviewSuccessInlineText: { marginTop: 2, color: COLORS.textMuted, fontSize: 12, lineHeight: 18, fontWeight: "600" },
  reviewFormScoreBox: {
    marginTop: 10, marginBottom: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: "#E8DED5", backgroundColor: "#FCFAF8",
  },
  reviewFormLabel: { color: COLORS.text, fontWeight: "800", fontSize: 13, marginBottom: 8 },
  reviewFormTextArea: {
    minHeight: 120, borderRadius: 16, borderWidth: 1, borderColor: "#E8DED5", backgroundColor: "#FCFAF8", paddingHorizontal: 14, paddingVertical: 14, color: COLORS.text, fontSize: 14, lineHeight: 22, fontWeight: "500",
  },
  reviewFormFooter: { marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  reviewSubmitButton: {
    minWidth: 170, height: 46, borderRadius: 14, backgroundColor: "#111111", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, paddingHorizontal: 16,
  },
  reviewSubmitButtonDisabled: { backgroundColor: "#D8D1CB" },
  reviewSubmitButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900", letterSpacing: -0.2 },
  reviewAdminResponseCard: { marginTop: 12, borderWidth: 1, borderColor: "#E8DED5", backgroundColor: "#FCFAF8", padding: 12, gap: 6 },
  reviewAdminResponseTitle: { color: COLORS.text, fontSize: 12, fontWeight: "900" },
  reviewAdminResponseBody: { color: COLORS.textSoft, fontSize: 13, lineHeight: 20, fontWeight: "500" },
  reviewAdminResponseMeta: { color: COLORS.textMuted, fontSize: 11, fontWeight: "700" },
  emptyReviewCard: {
    marginTop: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#ECE2D8",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  emptyReviewTitle: {
    color: "#111111",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },
  emptyReviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  emptyReviewScore: {
    color: "#111111",
    fontSize: 28,
    fontWeight: "900",
    minWidth: 78,
  },
  emptyReviewStar: {
    color: "#C28A20",
  },
  emptyReviewMain: {
    color: "#111111",
    fontSize: 15,
    fontWeight: "800",
  },
  emptyReviewSub: {
    marginTop: 4,
    color: "#6F6F6F",
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "600",
  },


  reviewsSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },

  reviewsHeader: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  reviewsTitle: {
    color: COLORS.text,
    fontWeight: "900",
    fontSize: 22,
    letterSpacing: -0.3,
  },

  reviewsSubtitle: {
    marginTop: 4,
    color: COLORS.textMuted,
    fontWeight: "600",
    fontSize: 13,
  },

  reviewsSummaryBadge: {
    minWidth: 62,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },

  reviewsSummaryBadgeText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 14,
    letterSpacing: -0.2,
  },

  reviewSortRow: {
    gap: 8,
    paddingBottom: 12,
  },

  reviewSortChip: {
    borderWidth: 1,
    borderColor: "#E5DDD6",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },

  reviewSortChipActive: {
    backgroundColor: "#5D5351",
    borderColor: "#5D5351",
  },

  reviewSortChipText: {
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 12,
  },

  reviewSortChipTextActive: {
    color: "#FFFFFF",
  },

  reviewsList: {
    gap: 12,
  },

reviewCard: {
  borderWidth: 1,
  borderColor: "#ECE2D8",
  borderRadius: 18,
  backgroundColor: "#FFFEFC",
  padding: 14,
  shadowColor: "#000",
  shadowOpacity: 0.035,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
},

  reviewCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },

  reviewAuthorWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  reviewAvatar: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: "#F4EEE8",
    alignItems: "center",
    justifyContent: "center",
  },

  reviewAvatarText: {
    color: COLORS.text,
    fontWeight: "900",
    fontSize: 15,
  },

  reviewAuthor: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },

  reviewDate: {
    marginTop: 2,
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },

  reviewRatingBox: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FAF7F4",
    borderWidth: 1,
    borderColor: "#EEE4DA",
  },

  reviewBody: {
    color: COLORS.textSoft,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
  },

  reviewsMoreBtn: {
    marginTop: 4,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },

  reviewsMoreBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: -0.2,
  },

  emptyReviewsCard: {
  marginTop: 4,
  borderWidth: 1,
  borderColor: "#ECE2D8",
  borderRadius: 18,
  backgroundColor: "#FFFFFF",
  paddingVertical: 18,
  paddingHorizontal: 16,
  alignItems: "center",
  },

  emptyReviewsTitle: {
  color: COLORS.text,
  fontSize: 15,
  fontWeight: "800",
  textAlign: "center",
  },

  emptyReviewsText: {
  marginTop: 6,
  color: COLORS.textMuted,
  fontSize: 13,
  lineHeight: 20,
  fontWeight: "600",
  textAlign: "center",
  },

  relatedSection: {
    marginTop: 24,
    paddingLeft: 16,
  },

  relatedHeader: {
    marginBottom: 14,
    paddingRight: 16,
  },

  relatedTitle: {
    color: COLORS.text,
    fontWeight: "900",
    fontSize: 20,
    letterSpacing: -0.3,
  },

  relatedLoading: {
    color: COLORS.textSoft,
    fontWeight: "700",
    fontSize: 13,
    paddingHorizontal: 2,
  },

  relatedListContent: {
    paddingRight: 16,
  },

  relatedCard: {
    width: 176,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },

  relatedImageWrap: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#F7F4F3",
    overflow: "hidden",
    position: "relative",
  },

  relatedImage: {
    width: "100%",
    height: "100%",
  },

  relatedImageFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  relatedImageFallbackText: {
    color: COLORS.textMuted,
    fontWeight: "700",
    fontSize: 11,
  },

  relatedPromoBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#5D5351",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },

  relatedPromoBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  relatedFavoritePill: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },

  relatedAddBtn: {
    position: "absolute",
    right: 8,
    bottom: 8,
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },

  relatedAddBtnDisabled: {
    opacity: 0.45,
  },

  relatedAddBtnText: {
    color: COLORS.black,
    fontSize: 22,
    lineHeight: 22,
    fontWeight: "600",
    marginTop: -2,
  },

  relatedBody: {
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 4,
  },

  relatedName: {
    color: COLORS.text,
    fontWeight: "800",
    fontSize: 13,
    lineHeight: 18,
    minHeight: 36,
  },

  relatedPriceRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },

  relatedOldPrice: {
    color: COLORS.textMuted,
    fontWeight: "700",
    textDecorationLine: "line-through",
    fontSize: 11,
  },

  relatedCurrentPrice: {
    color: COLORS.black,
    fontWeight: "900",
    fontSize: 14,
  },

  relatedStockText: {
    marginTop: 4,
    color: "#7B6F6C",
    fontWeight: "700",
    fontSize: 11,
  },

  favoriteIconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 0,
  },

  favoriteIconButtonPressed: {
    opacity: 0.75,
  },

  favoriteLoaderWrap: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  afterCartSpacing: {
  height: 22,
},

accordionList: {
  borderTopWidth: 1,
  borderTopColor: "#EAE2DA",
},

accordionItem: {
  borderBottomWidth: 1,
  borderBottomColor: "#EAE2DA",
},

accordionHeader: {
  minHeight: 52,
  paddingVertical: 14,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
},

accordionTitle: {
  flex: 1,
  color: "#7E746D",
  fontSize: 13,
  fontWeight: "800",
  letterSpacing: 0.4,
},

accordionIcon: {
  width: 22,
  textAlign: "center",
  color: COLORS.text,
  fontSize: 24,
  lineHeight: 24,
  fontWeight: "400",
},

accordionBody: {
  paddingBottom: 16,
  paddingRight: 6,
},

accordionText: {
  color: COLORS.textSoft,
  fontSize: 14,
  lineHeight: 24,
  fontWeight: "500",
},

accordionBulletList: {
  gap: 8,
},

accordionBulletText: {
  color: COLORS.textSoft,
  fontSize: 14,
  lineHeight: 24,
  fontWeight: "500",
},


emptyReviewsIconWrap: {
  width: 42,
  height: 42,
  borderRadius: 999,
  backgroundColor: "#F4EEE8",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 10,
},
viewerRoot: {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
},

viewerBackdrop: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: "rgba(0,0,0,0.82)",
},

viewerContent: {
  width: "100%",
  alignItems: "center",
  justifyContent: "center",
},

viewerHeader: {
  width: "100%",
  alignItems: "center",
  marginBottom: 10,
},

viewerCounter: {
  color: "#FFFFFF",
  fontSize: 13,
  fontWeight: "700",
},

viewerBody: {
  borderRadius: 18,
  overflow: "hidden",
  backgroundColor: "#F4ECE6",
},

viewerPage: {
  justifyContent: "center",
  alignItems: "center",
  overflow: "hidden",
},

viewerImageWrap: {
  position: "relative",
  justifyContent: "center",
  alignItems: "center",
  overflow: "hidden",
  backgroundColor: "#F4ECE6",
},

viewerImage: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  borderRadius: 18,
},

viewerImagePlaceholder: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#F4EFE3",
},

viewerImageSkeletonCard: {
  width: "56%",
  maxWidth: 150,
  minWidth: 84,
  aspectRatio: 1,
  borderRadius: 22,
  backgroundColor: "rgba(255,255,255,0.32)",
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: "rgba(0,0,0,0.04)",
},

viewerImageSkeletonLine: {
  marginTop: 12,
  width: "36%",
  maxWidth: 110,
  height: 10,
  borderRadius: 999,
  backgroundColor: "rgba(255,255,255,0.34)",
},

viewerImageFallback: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#F4EFE3",
  paddingHorizontal: 14,
},

viewerImageFallbackText: {
  color: "#7A7165",
  fontSize: 13,
  fontWeight: "700",
},

viewerVideoCard: {
  overflow: "hidden",
  backgroundColor: "#000000",
},

videoWebview: {
  flex: 1,
  backgroundColor: "#000000",
},

viewerDotsWrap: {
  marginTop: 12,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
},

viewerDot: {
  width: 7,
  height: 7,
  borderRadius: 999,
  backgroundColor: "rgba(255,255,255,0.45)",
},

viewerDotActive: {
  width: 18,
  backgroundColor: "#FFFFFF",
},

viewerDotVideo: {
  backgroundColor: "rgba(140,190,255,0.6)",
},

viewerDotVideoActive: {
  backgroundColor: "#66A9FF",
},
});

