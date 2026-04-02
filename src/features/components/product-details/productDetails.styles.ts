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

  galleryProgressTrack: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 10,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.85)",
    overflow: "hidden",
  },

  galleryProgressThumb: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
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

  priceRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },

  oldPrice: {
    color: COLORS.textMuted,
    fontWeight: "800",
    textDecorationLine: "line-through",
    fontSize: 14,
    marginBottom: 2,
  },

  pricePromo: {
    color: COLORS.black,
    fontWeight: "900",
    fontSize: 24,
    lineHeight: 28,
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
    marginTop: 18,
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

  cartActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  qtyGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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

  qtyBtnDisabled: {
    opacity: 0.4,
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
    color: COLORS.text,
    fontWeight: "900",
    fontSize: 14,
  },

  primaryCta: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    backgroundColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },

  primaryCtaDisabled: {
    opacity: 0.4,
  },

  primaryCtaText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.2,
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
    backgroundColor: "#FFFFFF",
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
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
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "500",
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
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
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
});

