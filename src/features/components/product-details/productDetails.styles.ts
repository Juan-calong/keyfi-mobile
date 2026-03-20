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
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },

  galleryWrap: {
    width: "100%",
    backgroundColor: "#F4ECE6",
    position: "relative",
    overflow: "hidden",
  },

  galleryItem: {
    justifyContent: "center",
  },

  galleryPressable: {
    flex: 1,
  },

  heroImg: {
    width: "100%",
    height: "100%",
    borderRadius: 5,
  },

  galleryEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 320,
  },

  heroPh: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFE6E0",
    borderRadius: 18,
  },

  phText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "800",
  },

  videoBadge: {
    position: "absolute",
    left: 28,
    bottom: 28,
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
    right: 28,
    bottom: 28,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(23,20,23,0.86)",
  },

  stockBadgeText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
  },

  cardContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
  },

  name: {
    color: COLORS.text,
    fontWeight: "900",
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },

  priceArea: {
    marginTop: 10,
  },

  priceInline: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },

  price: {
    color: COLORS.black,
    fontWeight: "900",
    fontSize: 22,
    lineHeight: 28,
  },

  pricePromo: {
    color: COLORS.black,
    fontWeight: "900",
    fontSize: 24,
    lineHeight: 30,
  },

  oldPrice: {
    color: COLORS.textMuted,
    fontWeight: "800",
    textDecorationLine: "line-through",
    fontSize: 13,
    marginBottom: 3,
  },

  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },

  description: {
    color: COLORS.textSoft,
    fontWeight: "500",
    fontSize: 15.5,
    lineHeight: 24,
  },

  moreBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
  },

  moreBtnText: {
    color: COLORS.blue,
    fontWeight: "800",
    fontSize: 14,
  },

  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
  },

  infoSection: {
    marginTop: 2,
    marginHorizontal: -14,
    paddingHorizontal: 8,
  },

  infoItem: {
    width: "49.2%",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  infoIconWrap: {
    width: 22,
    alignItems: "center",
    paddingTop: 2,
  },

  infoLabel: {
    color: COLORS.textMuted,
    fontWeight: "700",
    fontSize: 12,
    marginBottom: 2,
  },

  infoValue: {
    color: COLORS.text,
    fontWeight: "800",
    fontSize: 15,
    lineHeight: 20,
  },

  highlightsSection: {
    marginTop: 18,
  },

  highlightsTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },

  hlWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  hlChip: {
    maxWidth: 140,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 500,
    backgroundColor: COLORS.chipBg,
    borderWidth: 1,
    borderColor: COLORS.chipBorder,
  },

  hlChipText: {
    color: COLORS.black,
    fontWeight: "700",
    fontSize: 13.5,
  },

  buyBtnBlack: {
    marginTop: 20,
    height: 56,
    borderRadius: 18,
    backgroundColor: COLORS.black,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },

  buyBtnBlackText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.2,
  },

  subHint: {
    marginTop: 10,
    textAlign: "center",
    color: COLORS.textMuted,
    fontWeight: "700",
    fontSize: 12,
  },

  bannerWrap: {
    paddingHorizontal: 16,
    padding: 0,
  },

  bannerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: COLORS.bannerBg,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.07)",
  },

  bannerTitle: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: -0.2,
  },

  bannerMsg: {
    marginTop: 2,
    color: COLORS.bannerText,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },

  bannerBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },

  bannerBtnText: {
    color: COLORS.blue,
    fontSize: 12,
    fontWeight: "900",
  },

  relatedSection: {
    marginTop: 24,
  },

  relatedHeader: {
    marginBottom: 14,
    paddingHorizontal: 2,
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
    paddingRight: 10,
  },

  relatedCard: {
    width: 172,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: 10,
  },

  relatedImageWrap: {
    width: "100%",
    height: 156,
    borderRadius: 14,
    backgroundColor: COLORS.surface2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
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

  relatedName: {
    marginTop: 10,
    color: COLORS.text,
    fontWeight: "800",
    fontSize: 14,
    lineHeight: 19,
    minHeight: 38,
  },

  relatedPrice: {
    marginTop: 8,
    color: COLORS.black,
    fontWeight: "900",
    fontSize: 15,
    marginBottom: 10,
  },

  relatedBtn: {
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.black,
  },

  relatedBtnDisabled: {
    opacity: 0.5,
  },

  relatedBtnText: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: 13,
  },

  viewerRoot: {
    flex: 1,
    backgroundColor: "transparent",
  },

  viewerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.38)",
  },

  viewerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
  },

  viewerHeader: {
    width: "100%",
    maxWidth: 420,
    height: 56,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },

  viewerClose: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  viewerCounter: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  viewerPage: {
    justifyContent: "center",
    alignItems: "center",
  },

  viewerBody: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },

  viewerImageScrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
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
    height: 34,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },

  viewerDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.22)",
  },

  viewerDotActive: {
    width: 18,
    backgroundColor: "#FFFFFF",
  },

  viewerDotVideo: {
    backgroundColor: "rgba(11,99,246,0.4)",
  },

  viewerDotVideoActive: {
    backgroundColor: COLORS.blue,
  },

  favoriteButton: {
    marginTop: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  favoriteButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  favoriteButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },

  favoriteCountText: {
    fontSize: 13,
    fontWeight: "700",
  },

  commentsSection: {
    marginTop: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },

  commentForm: {
    marginBottom: 16,
  },

  commentInput: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
  },

  commentSubmitButton: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#111827",
  },

  commentSubmitButtonDisabled: {
    opacity: 0.5,
  },

  commentSubmitButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },

  commentsLoading: {
    paddingVertical: 16,
    alignItems: "center",
  },

  commentsFeedback: {
    fontSize: 14,
    opacity: 0.7,
  },

  commentsList: {
    gap: 10,
  },

  commentCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 12,
  },

  commentAuthor: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },

  commentBody: {
    fontSize: 14,
    lineHeight: 20,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
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
});