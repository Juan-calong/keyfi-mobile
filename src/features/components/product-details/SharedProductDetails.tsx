import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  StatusBar,
  FlatList,
  ScrollView,
  useWindowDimensions,
  GestureResponderEvent,
  TextInput,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Screen } from "../../../ui/components/Screen";
import { Container } from "../../../ui/components/Container";
import { Loading, ErrorState } from "../../../ui/components/State";
import { IosAlert } from "../../../ui/components/IosAlert";
import { friendlyError } from "../../../core/errors/friendlyError";
import { api } from "../../../core/api/client";
import { endpoints } from "../../../core/api/endpoints";
import { ProductFavoriteButton } from "./ProductFavoriteButton";

import type {
  Product,
  RelatedProduct,
  ProductMedia,
  BasicQueryState,
} from "./productDetails.types";
import {
  COLORS,
  formatBRL,
  getPrimaryProductImage,
  isOutOfStock,
  normalizeGalleryMedia,
} from "./productDetails.utils";
import { s } from "./productDetails.styles";

type ViewerMode = "OWNER" | "CUSTOMER";

type Props = {
  product: Product | undefined;
  productQuery: BasicQueryState;
  relatedQuery: BasicQueryState;
  relatedItems: RelatedProduct[];
  onBack: () => void;
  onOpenRelatedProduct: (productId: string) => void;
  onAddToCart: (productId: string) => void;
  onRemoveFromCart: (productId: string) => void;
  onGoToCart: () => void;
  qtyInCart: number;
  allowVideos?: boolean;
  viewerMode?: ViewerMode;
};

type ReviewSort = "recent" | "oldest" | "highest" | "lowest";
type ReviewSubmitMode = "created" | "updated" | null;

type ReviewItem = {
  id: string;
  comment: string;
  createdAt: string;
  user?: {
    id?: string;
    name?: string;
  };
  rating?: number | null;
  stars?: number | null;
  score?: number | null;
};

const FAVORITE_CACHE_ROOTS = new Set([
  "customer-favorites",
  "owner-favorites",
  "customer-products",
  "owner-products",
  "customer-home-products",
  "owner-home-products",
  "customer-home-promos-preview",
  "owner-home-promos-preview",
  "customer-promos-active",
  "owner-promos-active",
  "product",
]);

function getQueryRootFromKey(queryKey: unknown) {
  return Array.isArray(queryKey) ? String(queryKey[0] ?? "") : "";
}

function findFavoriteFlagInData(
  data: any,
  productId: string
): boolean | undefined {
  if (data == null) return undefined;

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findFavoriteFlagInData(item, productId);
      if (typeof found === "boolean") return found;
    }
    return undefined;
  }

  if (Array.isArray(data?.items)) {
    return findFavoriteFlagInData(data.items, productId);
  }

  if (Array.isArray(data?.data?.items)) {
    return findFavoriteFlagInData(data.data.items, productId);
  }

  if (typeof data === "object") {
    const currentId = String(data.id ?? data.productId ?? "");
    if (currentId === productId) {
      if (typeof data.isFavorite === "boolean") return data.isFavorite;
      if (typeof data.favorited === "boolean") return data.favorited;
    }
  }

  return undefined;
}

function extractItemsFromData(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  return [];
}

function getEntityId(item: any) {
  return String(item?.id ?? item?.productId ?? "").trim();
}

function buildFavoriteIds(data: any) {
  const ids = new Set<string>();

  for (const item of extractItemsFromData(data)) {
    const id = getEntityId(item);
    if (id) ids.add(id);
  }

  return ids;
}

function resolveFavoriteFlag(item: any, favoriteIds: Set<string>) {
  const id = getEntityId(item);

  if (id && favoriteIds.has(id)) return true;
  if (typeof item?.isFavorite === "boolean") return item.isFavorite;
  if (typeof item?.favorited === "boolean") return item.favorited;

  return false;
}

function toNumber(value: unknown, fallback = 0) {
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

function toNullableNumber(value: unknown) {
  if (value == null || value === "") return null;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeTextList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n|;/g)
      .map((item) => item.replace(/^\s*[-•\d.)]+\s*/, "").trim())
      .filter(Boolean);
  }

  return [];
}

function stop(e?: GestureResponderEvent) {
  e?.stopPropagation?.();
}

function getBasePrice(item: any, viewerMode: ViewerMode) {
  const customerPrice = toNullableNumber(item?.customerPrice);
  const ownerPrice = toNullableNumber(item?.price);

  if (viewerMode === "CUSTOMER") {
    return customerPrice ?? ownerPrice ?? 0;
  }

  return ownerPrice ?? customerPrice ?? 0;
}

function getPromoPrice(item: any) {
  const promoPrice = toNullableNumber(item?.activePromo?.promoPrice);
  if (promoPrice == null || promoPrice <= 0) return null;
  return promoPrice;
}

function getPromoLabel(item: any, viewerMode: ViewerMode) {
  const base = getBasePrice(item, viewerMode);
  const promoPrice = getPromoPrice(item);
  const promo = item?.activePromo;

  if (!promo || promoPrice == null || !(promoPrice < base)) return null;

  const type = String(promo?.type || "").toUpperCase();
  const value = toNumber(promo?.value);

  if (type === "PCT" && value > 0) {
    return `${Math.round(value)} OFF`;
  }

  return "OFF";
}

function getPriceModel(item: any, viewerMode: ViewerMode = "OWNER") {
  const base = getBasePrice(item, viewerMode);
  const effective = toNullableNumber(item?.effectivePrice);
  const promoPrice = getPromoPrice(item);

  const hasPromo =
    promoPrice != null &&
    Number.isFinite(promoPrice) &&
    base > 0 &&
    promoPrice < base;

  const currentPrice = hasPromo ? promoPrice : effective ?? base;

  return {
    oldPrice: base,
    currentPrice,
    hasPromo,
    promoLabel: hasPromo ? getPromoLabel(item, viewerMode) : null,
  };
}

function getReviewRating(item: any) {
  const n = Number(item?.rating ?? item?.stars ?? item?.score ?? 0);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 5) return 5;
  return n;
}

function getAverageRating(
  product: any,
  reviews: ReviewItem[],
  commentsData: any
) {
  const direct = Number(
    commentsData?.averageRating ??
      product?.averageRating ??
      product?.ratingAverage ??
      product?.avgRating
  );

  if (Number.isFinite(direct) && direct >= 0) return direct;

  const rated = reviews.filter((item) => getReviewRating(item) > 0);
  if (!rated.length) return 0;

  const sum = rated.reduce((acc, item) => acc + getReviewRating(item), 0);
  return sum / rated.length;
}

function getProductCardRating(item: any) {
  const n = Number(
    item?.averageRating ??
      item?.ratingAverage ??
      item?.avgRating ??
      0
  );

  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 5) return 5;
  return n;
}

function getProductCardReviewsCount(item: any) {
  const n = Number(
    item?.reviewsCount ??
      item?.ratingsCount ??
      item?.commentsCount ??
      0
  );

  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function formatReviewDate(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR");
}

function formatReviewDateTime(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function extractCommentsItems(data: any): ReviewItem[] {
  if (Array.isArray(data)) return data as ReviewItem[];
  if (Array.isArray(data?.items)) return data.items as ReviewItem[];
  if (Array.isArray(data?.data?.items)) return data.data.items as ReviewItem[];
  return [];
}

function sortReviews(items: ReviewItem[], sort: ReviewSort) {
  const cloned = [...items];

  if (sort === "oldest") {
    return cloned.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  if (sort === "highest") {
    return cloned.sort((a, b) => getReviewRating(b) - getReviewRating(a));
  }

  if (sort === "lowest") {
    return cloned.sort((a, b) => getReviewRating(a) - getReviewRating(b));
  }

  return cloned.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function RatingStars({
  value,
  size = 14,
}: {
  value: number;
  size?: number;
}) {
  return (
    <View style={s.ratingRow}>
      {Array.from({ length: 5 }).map((_, index) => {
        const filled = index < Math.round(value);
        return (
          <Icon
            key={`star-${index}`}
            name={filled ? "star" : "star-outline"}
            size={size}
            color="#C69214"
          />
        );
      })}
    </View>
  );
}

function RatingInput({
  value,
  onChange,
  size = 24,
}: {
  value: number;
  onChange: (value: number) => void;
  size?: number;
}) {
  return (
    <View style={s.ratingRow}>
      {Array.from({ length: 5 }).map((_, index) => {
        const starValue = index + 1;
        const filled = starValue <= value;

        return (
          <Pressable
            key={`rate-${starValue}`}
            onPress={() => onChange(starValue)}
            hitSlop={8}
            style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
          >
            <Icon
              name={filled ? "star" : "star-outline"}
              size={size}
              color="#C69214"
            />
          </Pressable>
        );
      })}
    </View>
  );
}

function DetailAccordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View
      style={{
        borderBottomWidth: 1,
        borderBottomColor: "#EAE2DA",
      }}
    >
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => [
          {
            minHeight: 54,
            paddingVertical: 14,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          },
          pressed && { opacity: 0.82 },
        ]}
      >
        <Text
          style={{
            flex: 1,
            color: "#7E746D",
            fontSize: 13,
            fontWeight: "800",
            letterSpacing: 0.35,
          }}
        >
          {title}
        </Text>

        <Text
          style={{
            width: 22,
            textAlign: "center",
            color: COLORS.text,
            fontSize: 24,
            lineHeight: 24,
            fontWeight: "400",
          }}
        >
          {open ? "−" : "+"}
        </Text>
      </Pressable>

      {open ? (
        <View style={{ paddingBottom: 16, paddingRight: 4 }}>{children}</View>
      ) : null}
    </View>
  );
}

export function SharedProductDetails({
  product,
  productQuery,
  relatedQuery,
  relatedItems,
  onBack,
  onOpenRelatedProduct,
  onAddToCart,
  onRemoveFromCart,
  onGoToCart,
  qtyInCart,
  allowVideos = false,
  viewerMode = "OWNER",
}: Props) {
  const { width: screenWidth } = useWindowDimensions();

  const [modal, setModal] = useState<null | { title: string; message: string }>(
    null
  );
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [reviewSort, setReviewSort] = useState<ReviewSort>("recent");
  const [reviewsVisibleCount, setReviewsVisibleCount] = useState(6);
  const [draftComment, setDraftComment] = useState("");
  const [draftRating, setDraftRating] = useState(0);
  const [commentSuccessMessage, setCommentSuccessMessage] = useState<
    string | null
  >(null);
  const [commentSuccessMode, setCommentSuccessMode] =
    useState<ReviewSubmitMode>(null);

  const galleryListRef = useRef<FlatList<ProductMedia> | null>(null);
  const addLock = useRef(false);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    setGalleryIndex(0);
    setReviewsVisibleCount(6);
    setCommentSuccessMessage(null);
    setCommentSuccessMode(null);
    setDraftComment("");
    setDraftRating(0);
    galleryListRef.current?.scrollToOffset?.({ offset: 0, animated: false });
  }, [product?.id]);

  const galleryCardWidth = screenWidth;
  const galleryHeight = Math.min(Math.max(screenWidth * 1.02, 340), 470);

  const out = product ? isOutOfStock(product) : false;
  const alreadyInCart = !!product && qtyInCart > 0;

  const galleryMedia = useMemo(
    () => normalizeGalleryMedia(product, { allowVideos }),
    [product, allowVideos]
  );

  const shortDescriptionText = normalizeText(
    (product as any)?.description ??
      (product as any)?.shortDescription ??
      (product as any)?.subtitle ??
      (product as any)?.subDescription ??
      (product as any)?.summary
  );

  const subtitleText = normalizeText(
    (product as any)?.subtitle ?? (product as any)?.subDescription
  );

  const effectsList = normalizeTextList((product as any)?.effects);

  const howToUseList = normalizeTextList(
    (product as any)?.howToUse ??
      (product as any)?.usageMode ??
      (product as any)?.modeOfUse ??
      (product as any)?.modoDeUso
  );

  const benefitsList = normalizeTextList(
    (product as any)?.benefits ?? (product as any)?.benefitHighlights
  );

  const priceModel = useMemo(
    () => getPriceModel(product, viewerMode),
    [product, viewerMode]
  );

  const safeRelatedItems = useMemo(() => relatedItems, [relatedItems]);

  const favoritesQ = useQuery({
    queryKey:
      viewerMode === "CUSTOMER"
        ? ["customer-favorites"]
        : ["owner-favorites"],
    queryFn: async () => {
      const res = await api.get<any>(endpoints.products.favorites, {
        params: { take: 500 },
      });
      return res.data;
    },
    retry: false,
  });

  const favoriteIds = useMemo(
    () => buildFavoriteIds(favoritesQ.data),
    [favoritesQ.data]
  );

  const commentsQ = useQuery({
    queryKey: ["product-comments", product?.id],
    enabled: !!product?.id,
    queryFn: async () => {
      const res = await api.get<any>(endpoints.products.comments(product!.id), {
        params: { page: 1, limit: 20 },
      });
      return res.data;
    },
    retry: false,
  });

  const myCommentStatusQ = useQuery({
    queryKey: ["product-comments-me", product?.id],
    enabled: !!product?.id,
    queryFn: async () => {
      const res = await api.get<any>(endpoints.products.commentsMe(product!.id));
      return res.data;
    },
    retry: false,
  });

  const createCommentM = useMutation({
    mutationFn: async () => {
      if (!product?.id) throw new Error("Produto inválido.");

      const payload = {
        comment: draftComment.trim(),
        rating: draftRating,
      };

      return api.post(endpoints.products.comments(product.id), payload);
    },
    onSuccess: async (res: any) => {
      const msg = res?.data?.message || "Avaliação enviada para moderação.";
      const mode = res?.data?.mode === "updated" ? "updated" : "created";

      setCommentSuccessMessage(String(msg));
      setCommentSuccessMode(mode);

      await Promise.all([commentsQ.refetch(), myCommentStatusQ.refetch()]);
    },
    onError: (error: any) => {
      const fe: any = friendlyError(error);
      setModal({
        title: String(fe?.title || "Erro"),
        message: String(
          fe?.message || "Não foi possível enviar sua avaliação."
        ),
      });
    },
  });

  React.useEffect(() => {
    const data = myCommentStatusQ.data;

    if (!product?.id || !data) return;

    if (data.hasComment && data.canEdit && data.item) {
      setDraftComment(String(data.item.comment ?? ""));
      setDraftRating(Number(data.item.rating ?? 0));
      return;
    }

    if (data.canCreate) {
      setDraftComment("");
      setDraftRating(0);
    }
  }, [
    product?.id,
    myCommentStatusQ.data?.hasComment,
    myCommentStatusQ.data?.canEdit,
    myCommentStatusQ.data?.canCreate,
    myCommentStatusQ.data?.item?.id,
  ]);

  const reviewStatus = myCommentStatusQ.data;
  const canCreateReview = !!reviewStatus?.canCreate;
  const canEditReview = !!reviewStatus?.canEdit;
  const canWriteReview = canCreateReview || canEditReview;

  const reviewCardTitle = canEditReview
    ? "Edite sua avaliação"
    : "Escreva sua avaliação";

  const reviewCardSubtitle = canEditReview
    ? "Sua atualização será enviada novamente para moderação."
    : "Sua avaliação será enviada para moderação.";

  const reviewSubmitLabel = canEditReview
    ? "Atualizar avaliação"
    : "Enviar avaliação";

  const reviewsRaw = useMemo(
    () => extractCommentsItems(commentsQ.data),
    [commentsQ.data]
  );

  const sortedReviews = useMemo(
    () => sortReviews(reviewsRaw, reviewSort),
    [reviewsRaw, reviewSort]
  );

  const visibleReviews = useMemo(
    () => sortedReviews.slice(0, reviewsVisibleCount),
    [sortedReviews, reviewsVisibleCount]
  );

  const hasMoreReviews = sortedReviews.length > reviewsVisibleCount;

  const averageRating = useMemo(
    () => getAverageRating(product, reviewsRaw, commentsQ.data),
    [product, reviewsRaw, commentsQ.data]
  );

  const reviewsCount = Number(
    (commentsQ.data as any)?.total ??
      (commentsQ.data as any)?.ratingsCount ??
      (product as any)?.ratingsCount ??
      (product as any)?.reviewsCount ??
      (product as any)?.commentsCount ??
      reviewsRaw.length
  );

  const trimmedComment = draftComment.trim();
  const canSubmitComment =
    !!product?.id &&
    !myCommentStatusQ.isLoading &&
    canWriteReview &&
    draftRating >= 1 &&
    draftRating <= 5 &&
    trimmedComment.length >= 3 &&
    trimmedComment.length <= 1000 &&
    !createCommentM.isPending;

  function handleAddToCart() {
    if (!product) return;
    if (out) return;
    if (addLock.current) return;

    addLock.current = true;

    try {
      onAddToCart(product.id);
    } catch (e: any) {
      const fe: any = friendlyError(e);
      setModal({
        title: String(fe?.title || "Erro"),
        message: String(fe?.message || "Não foi possível adicionar ao carrinho."),
      });
    } finally {
      setTimeout(() => {
        addLock.current = false;
      }, 300);
    }
  }

  function handleRemoveFromCart() {
    if (!product) return;
    if (qtyInCart <= 0) return;

    try {
      onRemoveFromCart(product.id);
    } catch (e: any) {
      const fe: any = friendlyError(e);
      setModal({
        title: String(fe?.title || "Erro"),
        message: String(fe?.message || "Não foi possível retirar do carrinho."),
      });
    }
  }

  function handleAddRelated(item: RelatedProduct, e?: GestureResponderEvent) {
    stop(e);

    const relatedOut = isOutOfStock(item as any);
    if (relatedOut) return;

    try {
      onAddToCart(item.id);
    } catch (err: any) {
      const fe: any = friendlyError(err);
      setModal({
        title: String(fe?.title || "Erro"),
        message: String(fe?.message || "Não foi possível adicionar ao carrinho."),
      });
    }
  }

  function handleSubmitComment() {
    if (!canSubmitComment) return;
    createCommentM.mutate();
  }

  const resolvedInitialFavorited = useMemo(() => {
    if (!product?.id) return false;

    if (favoriteIds.has(product.id)) return true;

    if (typeof product?.isFavorite === "boolean") {
      return product.isFavorite;
    }

    if (typeof (product as any)?.favorited === "boolean") {
      return Boolean((product as any).favorited);
    }

    const entries = queryClient.getQueriesData({
      predicate: (query) => {
        const root = getQueryRootFromKey(query.queryKey);
        if (!FAVORITE_CACHE_ROOTS.has(root)) return false;

        if (root === "product") {
          return (
            Array.isArray(query.queryKey) &&
            String(query.queryKey[1] ?? "") === product.id
          );
        }

        return true;
      },
    });

    for (const [, cachedData] of entries) {
      const found = findFavoriteFlagInData(cachedData, product.id);
      if (typeof found === "boolean") return found;
    }

    return false;
  }, [favoriteIds, queryClient, product]);

  return (
    <Screen style={{ backgroundColor: COLORS.bg as any }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <Container
        style={{
          flex: 1,
          backgroundColor: COLORS.bg,
          paddingHorizontal: 0,
        }}
      >
        <View style={s.header}>
          <Pressable
            onPress={onBack}
            hitSlop={10}
            style={({ pressed }) => [s.back, pressed && { opacity: 0.7 }]}
          >
            <Text style={s.chev}>{"<"}</Text>
            <Text style={s.backText}>Voltar</Text>
          </Pressable>

          <View style={{ flex: 1 }} />
          <View style={{ width: 52 }} />
        </View>

        {productQuery.isLoading ? (
          <Loading />
        ) : productQuery.isError ? (
          <ErrorState onRetry={() => productQuery.refetch?.()} />
        ) : !product ? (
          <View style={{ marginTop: 20, paddingHorizontal: 16 }}>
            <Text style={{ color: COLORS.text, fontWeight: "800" }}>
              Produto não encontrado.
            </Text>
          </View>
          ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scrollContent}
          >
            <View style={s.mainCard}>
              <View style={[s.galleryWrap, { height: galleryHeight }]}>
                {galleryMedia.length > 0 ? (
                  <FlatList
                    ref={galleryListRef}
                    data={galleryMedia}
                    horizontal
                    pagingEnabled
                    nestedScrollEnabled
                    decelerationRate="fast"
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => `${item.type}-${item.id}`}
                    onMomentumScrollEnd={(e) => {
                      const nextIndex = Math.round(
                        e.nativeEvent.contentOffset.x / galleryCardWidth
                      );
                      setGalleryIndex(nextIndex);
                    }}
                    renderItem={({ item }) => {
                      const isVideo = item.type === "video";
                      const imageSource = item.thumbnailUrl || item.url;

                      return (
                        <View
                          style={[
                            s.galleryItem,
                            { width: galleryCardWidth, height: galleryHeight },
                          ]}
                        >
                          {imageSource ? (
                            <Image
                              source={{ uri: imageSource }}
                              style={s.heroImg}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={s.heroPh}>
                              <Text style={s.phText}>
                                {isVideo ? "Sem capa" : "Sem imagem"}
                              </Text>
                            </View>
                          )}

                          {isVideo ? (
                            <View style={s.videoBadge}>
                              <Icon name="play-circle" size={18} color="#FFFFFF" />
                              <Text style={s.videoBadgeText}>Vídeo</Text>
                            </View>
                          ) : null}
                        </View>
                      );
                    }}
                  />
                ) : (
                  <View style={s.galleryItem}>
                    <View style={s.heroPh}>
                      <Text style={s.phText}>Sem mídia</Text>
                    </View>
                  </View>
                )}

                <View style={s.heroFavoritePill}>
                  <ProductFavoriteButton
                    productId={product.id}
                    initialFavorited={resolvedInitialFavorited}
                  />
                </View>

                {out ? (
                  <View style={s.stockBadge}>
                    <Text style={s.stockBadgeText}>Sem estoque</Text>
                  </View>
                ) : null}

                {galleryMedia.length > 1 ? (
                  <View style={s.galleryProgressTrack}>
                    <View
                      style={[
                        s.galleryProgressThumb,
                        {
                          width: `${100 / galleryMedia.length}%`,
                          left: `${(100 / galleryMedia.length) * galleryIndex}%`,
                        },
                      ]}
                    />
                  </View>
                ) : null}
              </View>

              <View style={s.content}>
                {priceModel.promoLabel ? (
                  <View style={s.promoPill}>
                    <Text style={s.promoPillText}>{priceModel.promoLabel}</Text>
                  </View>
                ) : null}

                <Text style={s.name} numberOfLines={2} ellipsizeMode="tail">
                  {product.name}
                </Text>

                {subtitleText ? <Text style={s.subtitle}>{subtitleText}</Text> : null}

                <View style={s.ratingWrap}>
                  <RatingStars value={averageRating} size={15} />
                  <Text style={s.ratingText}>
                    {averageRating > 0 ? averageRating.toFixed(1) : "0.0"}
                  </Text>
                  <Text style={s.ratingCount}>({reviewsCount || 0})</Text>
                </View>

                <View style={s.priceRow}>
                  {priceModel.hasPromo ? (
                    <>
                      <Text style={s.oldPrice}>
                        {formatBRL(priceModel.oldPrice)}
                      </Text>
                      <Text style={s.pricePromo}>
                        {formatBRL(priceModel.currentPrice)}
                      </Text>
                    </>
                  ) : (
                    <Text style={s.pricePromo}>
                      {formatBRL(priceModel.currentPrice)}
                    </Text>
                  )}
                </View>

                <View style={s.separator} />

                <View style={s.cartActionRow}>
                  <View style={s.qtyGroup}>
                    <Pressable
                      onPress={handleRemoveFromCart}
                      disabled={qtyInCart <= 0}
                      style={({ pressed }) => [
                        s.qtyBtn,
                        qtyInCart <= 0 && s.qtyBtnDisabled,
                        pressed && qtyInCart > 0 && { opacity: 0.7 },
                      ]}
                    >
                      <Icon
                        name="remove"
                        size={18}
                        color={qtyInCart > 0 ? COLORS.text : COLORS.textMuted}
                      />
                    </Pressable>

                    <View style={s.qtyValueWrap}>
                      <Text style={s.qtyValue}>{qtyInCart}</Text>
                    </View>

                    <Pressable
                      onPress={handleAddToCart}
                      disabled={out}
                      style={({ pressed }) => [
                        s.qtyBtn,
                        out && s.qtyBtnDisabled,
                        pressed && !out && { opacity: 0.7 },
                      ]}
                    >
                      <Icon
                        name="add"
                        size={18}
                        color={!out ? COLORS.text : COLORS.textMuted}
                      />
                    </Pressable>
                  </View>

                  <Pressable
                    onPress={alreadyInCart ? onGoToCart : handleAddToCart}
                    disabled={out}
                    style={({ pressed }) => [
                      s.primaryCta,
                      pressed && !out && { opacity: 0.92 },
                      out && s.primaryCtaDisabled,
                    ]}
                  >
                    <Icon name="bag-handle-outline" size={18} color="#FFFFFF" />
                    <Text style={s.primaryCtaText}>
                      {out
                        ? "Sem estoque"
                        : alreadyInCart
                        ? "Ir para o carrinho"
                        : "Adicionar ao carrinho"}
                    </Text>
                  </Pressable>
                </View>

                <View style={{ height: 22 }} />

                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: "#EAE2DA",
                  }}
                >
                  <DetailAccordion title="DESCRIÇÃO DO PRODUTO">
                    <Text
                      style={{
                        color: COLORS.textSoft,
                        fontSize: 14,
                        lineHeight: 24,
                        fontWeight: "500",
                      }}
                    >
                      {shortDescriptionText ||
                        "Sem descrição informada para este produto."}
                    </Text>
                  </DetailAccordion>

                  {effectsList.length > 0 ? (
                    <DetailAccordion title="BENEFÍCIO">
                      <View style={{ gap: 8 }}>
                        {effectsList.map((item, index) => (
                          <Text
                            key={`${index}-${item}`}
                            style={{
                              color: COLORS.textSoft,
                              fontSize: 14,
                              lineHeight: 24,
                              fontWeight: "500",
                            }}
                          >
                            • {item}
                          </Text>
                        ))}
                      </View>
                    </DetailAccordion>
                  ) : null}

                  {benefitsList.length > 0 ? (
                    <DetailAccordion title="ATIVOS E FUNÇÕES">
                      <View style={{ gap: 8 }}>
                        {benefitsList.map((item, index) => (
                          <Text
                            key={`${index}-${item}`}
                            style={{
                              color: COLORS.textSoft,
                              fontSize: 14,
                              lineHeight: 24,
                              fontWeight: "500",
                            }}
                          >
                            • {item}
                          </Text>
                        ))}
                      </View>
                    </DetailAccordion>
                  ) : null}

                  {howToUseList.length > 0 ? (
                    <DetailAccordion title="MODO DE USO">
                      <View style={{ gap: 8 }}>
                        {howToUseList.map((item, index) => (
                          <Text
                            key={`${index}-${item}`}
                            style={{
                              color: COLORS.textSoft,
                              fontSize: 14,
                              lineHeight: 24,
                              fontWeight: "500",
                            }}
                          >
                            {index + 1}. {item}
                          </Text>
                        ))}
                      </View>
                    </DetailAccordion>
                  ) : null}
                </View>
              </View>
            </View>

            <View style={{ marginTop: 24, paddingHorizontal: 16 }}>
              <View
                style={{
                  marginBottom: 14,
                  borderWidth: 1,
                  borderColor: "#E9DED4",
                  backgroundColor: "#FFFFFF",
                  borderRadius: 22,
                  padding: 16,
                  shadowColor: "#000",
                  shadowOpacity: 0.03,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 3 },
                  elevation: 1,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: COLORS.text,
                        fontWeight: "900",
                        fontSize: 22,
                        letterSpacing: -0.3,
                      }}
                    >
                      Avaliações e comentários
                    </Text>
                    <Text
                      style={{
                        marginTop: 4,
                        color: COLORS.textMuted,
                        fontWeight: "600",
                        fontSize: 13,
                      }}
                    >
                      Comentários e notas de quem já comprou
                    </Text>
                  </View>

                  <View
                    style={{
                      minWidth: 74,
                      height: 40,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      backgroundColor: "#111111",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontWeight: "900",
                        fontSize: 14,
                        letterSpacing: -0.2,
                      }}
                    >
                      {averageRating > 0 ? averageRating.toFixed(1) : "0.0"} ★
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    marginTop: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <RatingStars value={averageRating} size={15} />
                  <Text
                    style={{
                      color: COLORS.textMuted,
                      fontWeight: "700",
                      fontSize: 13,
                    }}
                  >
                    {reviewsCount || 0} avaliação(ões)
                  </Text>
                </View>
              </View>

              {myCommentStatusQ.isLoading ? (
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: "#E9DED4",
                    backgroundColor: "#FFFFFF",
                    borderRadius: 20,
                    padding: 18,
                    marginBottom: 14,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ActivityIndicator size="small" color="#111111" />
                  <Text
                    style={{
                      marginTop: 10,
                      color: COLORS.textMuted,
                      fontWeight: "700",
                      fontSize: 13,
                    }}
                  >
                    Verificando sua avaliação...
                  </Text>
                </View>
              ) : myCommentStatusQ.isError ? (
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: "#E9DED4",
                    backgroundColor: "#FFFFFF",
                    borderRadius: 20,
                    padding: 16,
                    marginBottom: 14,
                  }}
                >
                  <Text
                    style={{
                      color: COLORS.text,
                      fontWeight: "800",
                      fontSize: 15,
                    }}
                  >
                    Não foi possível verificar sua avaliação
                  </Text>
                  <Text
                    style={{
                      marginTop: 4,
                      color: COLORS.textMuted,
                      fontWeight: "600",
                      fontSize: 12,
                      lineHeight: 18,
                    }}
                  >
                    Tente novamente em instantes.
                  </Text>
                </View>
              ) : !reviewStatus?.canReview ? (
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: "#E9DED4",
                    backgroundColor: "#FFFFFF",
                    borderRadius: 20,
                    padding: 16,
                    marginBottom: 14,
                    shadowColor: "#000",
                    shadowOpacity: 0.03,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 3 },
                    elevation: 1,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 999,
                        backgroundColor: "#F4EEE8",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon
                        name="chatbubble-ellipses-outline"
                        size={16}
                        color={COLORS.text}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: COLORS.text,
                          fontWeight: "800",
                          fontSize: 15,
                        }}
                      >
                        Avaliação indisponível
                      </Text>
                      <Text
                        style={{
                          marginTop: 2,
                          color: COLORS.textMuted,
                          fontWeight: "600",
                          fontSize: 12,
                          lineHeight: 18,
                        }}
                      >
                        {reviewStatus?.message ||
                          "Este item não está disponível para avaliação."}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: "#E9DED4",
                    backgroundColor: "#FFFFFF",
                    borderRadius: 20,
                    padding: 14,
                    marginBottom: 14,
                    shadowColor: "#000",
                    shadowOpacity: 0.03,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 3 },
                    elevation: 1,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 999,
                        backgroundColor: "#F4EEE8",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon
                        name="chatbubble-ellipses-outline"
                        size={16}
                        color={COLORS.text}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: COLORS.text,
                          fontWeight: "800",
                          fontSize: 15,
                        }}
                      >
                        {reviewCardTitle}
                      </Text>
                      <Text
                        style={{
                          marginTop: 2,
                          color: COLORS.textMuted,
                          fontWeight: "600",
                          fontSize: 12,
                        }}
                      >
                        {reviewCardSubtitle}
                      </Text>
                    </View>
                  </View>

                  {reviewStatus?.hasComment && !reviewStatus?.canEdit ? (
                    <View
                      style={{
                        marginTop: 6,
                        marginBottom: 10,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: "#E8DED5",
                        backgroundColor: "#FCFAF8",
                        padding: 12,
                        gap: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: COLORS.text,
                          fontWeight: "800",
                          fontSize: 13,
                        }}
                      >
                        Sua avaliação atual
                      </Text>

                      <RatingStars
                        value={Number(reviewStatus?.item?.rating ?? 0)}
                        size={14}
                      />

                      <Text
                        style={{
                          color: COLORS.textSoft,
                          fontSize: 13,
                          lineHeight: 20,
                          fontWeight: "500",
                        }}
                      >
                        {String(reviewStatus?.item?.comment ?? "")}
                      </Text>

                      <Text
                        style={{
                          color: COLORS.textMuted,
                          fontSize: 12,
                          fontWeight: "700",
                        }}
                      >
                        Você poderá editar novamente em{" "}
                        {formatReviewDateTime(reviewStatus?.nextAllowedEditAt)}
                      </Text>
                    </View>
                  ) : null}

                  {canWriteReview ? (
                    <>
                      <View
                        style={{
                          marginTop: 10,
                          marginBottom: 12,
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          borderRadius: 16,
                          borderWidth: 1,
                          borderColor: "#E8DED5",
                          backgroundColor: "#FCFAF8",
                        }}
                      >
                        <Text
                          style={{
                            color: COLORS.text,
                            fontWeight: "800",
                            fontSize: 13,
                            marginBottom: 8,
                          }}
                        >
                          Sua nota
                        </Text>
                        <RatingInput value={draftRating} onChange={setDraftRating} />
                      </View>

                      <TextInput
                        value={draftComment}
                        onChangeText={(text) => {
                          setDraftComment(text);
                          if (commentSuccessMessage) {
                            setCommentSuccessMessage(null);
                            setCommentSuccessMode(null);
                          }
                        }}
                        placeholder="Conte o que achou do produto..."
                        placeholderTextColor="#9A9088"
                        multiline
                        textAlignVertical="top"
                        maxLength={1000}
                        style={{
                          minHeight: 120,
                          borderRadius: 16,
                          borderWidth: 1,
                          borderColor: "#E8DED5",
                          backgroundColor: "#FCFAF8",
                          paddingHorizontal: 14,
                          paddingVertical: 14,
                          color: COLORS.text,
                          fontSize: 14,
                          lineHeight: 22,
                          fontWeight: "500",
                        }}
                      />

                      <View
                        style={{
                          marginTop: 10,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <Text
                          style={{
                            color:
                              trimmedComment.length > 1000
                                ? "#B42318"
                                : COLORS.textMuted,
                            fontSize: 12,
                            fontWeight: "700",
                          }}
                        >
                          {trimmedComment.length}/1000
                        </Text>

                        <Pressable
                          onPress={handleSubmitComment}
                          disabled={!canSubmitComment}
                          style={({ pressed }) => [
                            {
                              minWidth: 170,
                              height: 46,
                              borderRadius: 14,
                              backgroundColor: canSubmitComment ? "#111111" : "#D8D1CB",
                              alignItems: "center",
                              justifyContent: "center",
                              flexDirection: "row",
                              gap: 8,
                              paddingHorizontal: 16,
                            },
                            pressed && canSubmitComment && { opacity: 0.88 },
                          ]}
                        >
                          {createCommentM.isPending ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <>
                              <Icon
                                name="paper-plane-outline"
                                size={16}
                                color="#FFFFFF"
                              />
                              <Text
                                style={{
                                  color: "#FFFFFF",
                                  fontSize: 14,
                                  fontWeight: "900",
                                  letterSpacing: -0.2,
                                }}
                              >
                                {reviewSubmitLabel}
                              </Text>
                            </>
                          )}
                        </Pressable>
                      </View>
                    </>
                  ) : null}

                  {commentSuccessMessage ? (
                    <View
                      style={{
                        marginTop: 12,
                        borderRadius: 16,
                        backgroundColor: "#F4EEE8",
                        borderWidth: 1,
                        borderColor: "#E8DDD2",
                        paddingHorizontal: 12,
                        paddingVertical: 12,
                        flexDirection: "row",
                        alignItems: "flex-start",
                        gap: 10,
                      }}
                    >
                      <View
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 999,
                          backgroundColor: "#111111",
                          alignItems: "center",
                          justifyContent: "center",
                          marginTop: 1,
                        }}
                      >
                        <Icon name="checkmark" size={16} color="#FFFFFF" />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: COLORS.text,
                            fontSize: 13,
                            fontWeight: "800",
                          }}
                        >
                          {commentSuccessMode === "updated"
                            ? "Avaliação atualizada"
                            : "Avaliação enviada"}
                        </Text>
                        <Text
                          style={{
                            marginTop: 2,
                            color: COLORS.textMuted,
                            fontSize: 12,
                            lineHeight: 18,
                            fontWeight: "600",
                          }}
                        >
                          {commentSuccessMessage}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              )}

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
              >
                {[
                  { key: "recent", label: "Mais recentes" },
                  { key: "oldest", label: "Mais antigos" },
                  { key: "highest", label: "Maior nota" },
                  { key: "lowest", label: "Menor nota" },
                ].map((item) => {
                  const active = reviewSort === item.key;
                  return (
                    <Pressable
                      key={item.key}
                      onPress={() => setReviewSort(item.key as ReviewSort)}
                      style={({ pressed }) => [
                        s.reviewSortChip,
                        active && s.reviewSortChipActive,
                        pressed && { opacity: 0.75 },
                      ]}
                    >
                      <Text
                        style={[
                          s.reviewSortChipText,
                          active && s.reviewSortChipTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {commentsQ.isLoading ? (
                <Text style={s.relatedLoading}>Carregando avaliações...</Text>
              ) : commentsQ.isError ? (
                <View
                  style={{
                    marginTop: 4,
                    borderWidth: 1,
                    borderColor: "#ECE2D8",
                    borderRadius: 0,
                    backgroundColor: "#FFFFFF",
                    paddingVertical: 18,
                    paddingHorizontal: 16,
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 999,
                      backgroundColor: "#F4EEE8",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 10,
                    }}
                  >
                    <Icon
                      name="alert-circle-outline"
                      size={18}
                      color={COLORS.text}
                    />
                  </View>

                  <Text
                    style={{
                      color: COLORS.text,
                      fontSize: 15,
                      fontWeight: "800",
                      textAlign: "center",
                    }}
                  >
                    Não foi possível carregar as avaliações
                  </Text>

                  <Text
                    style={{
                      marginTop: 6,
                      color: COLORS.textMuted,
                      fontSize: 13,
                      lineHeight: 20,
                      fontWeight: "600",
                      textAlign: "center",
                    }}
                  >
                    Tente novamente mais tarde. Quando houver avaliações e comentários,
                    elas aparecerão aqui.
                  </Text>
                </View>
              ) : sortedReviews.length > 0 ? (
                <View style={{ gap: 12 }}>
                  {visibleReviews.map((item) => {
                    const rating = getReviewRating(item);

                    return (
                      <View
                        key={item.id}
                        style={{
                          borderWidth: 1,
                          borderColor: "#ECE2D8",
                          borderRadius: 0,
                          backgroundColor: "#FFFFFF",
                          padding: 14,
                          shadowColor: "#000",
                          shadowOpacity: 0.04,
                          shadowRadius: 8,
                          shadowOffset: { width: 0, height: 3 },
                          elevation: 2,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                            marginBottom: 10,
                          }}
                        >
                          <View
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: 999,
                              backgroundColor: "#F4EEE8",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Text
                              style={{
                                color: COLORS.text,
                                fontWeight: "900",
                                fontSize: 15,
                              }}
                            >
                              {(item.user?.name || "C")
                                .trim()
                                .charAt(0)
                                .toUpperCase()}
                            </Text>
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text style={s.reviewAuthor}>
                              {item.user?.name || "Cliente"}
                            </Text>
                            <Text style={s.reviewDate}>
                              {formatReviewDate(item.createdAt)}
                            </Text>
                          </View>
                        </View>

                        <Text style={s.reviewBody}>{item.comment}</Text>

                        <View style={{ marginTop: 10 }}>
                          <RatingStars value={rating} size={14} />
                        </View>
                      </View>
                    );
                  })}

                  {hasMoreReviews ? (
                    <Pressable
                      onPress={() => setReviewsVisibleCount((prev) => prev + 6)}
                      style={({ pressed }) => [
                        {
                          marginTop: 4,
                          height: 46,
                          borderRadius: 14,
                          backgroundColor: "#111111",
                          alignItems: "center",
                          justifyContent: "center",
                        },
                        pressed && { opacity: 0.8 },
                      ]}
                    >
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontSize: 14,
                          fontWeight: "900",
                          letterSpacing: -0.2,
                        }}
                      >
                        Ver mais avaliações
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : (
                <View
                  style={{
                    marginTop: 4,
                    borderWidth: 1,
                    borderColor: "#ECE2D8",
                    borderRadius: 0,
                    backgroundColor: "#FFFFFF",
                    paddingVertical: 18,
                    paddingHorizontal: 16,
                    alignItems: "center",
                  }}
                >
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 999,
                      backgroundColor: "#F4EEE8",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 10,
                    }}
                  >
                    <Icon
                      name="chatbubble-ellipses-outline"
                      size={18}
                      color={COLORS.text}
                    />
                  </View>

                  <Text
                    style={{
                      color: COLORS.text,
                      fontSize: 15,
                      fontWeight: "800",
                      textAlign: "center",
                    }}
                  >
                    Ainda não há avaliações
                  </Text>

                  <Text
                    style={{
                      marginTop: 6,
                      color: COLORS.textMuted,
                      fontSize: 13,
                      lineHeight: 20,
                      fontWeight: "600",
                      textAlign: "center",
                    }}
                  >
                    Quando os clientes enviarem avaliações e comentários deste produto,
                    eles aparecerão aqui.
                  </Text>
                </View>
              )}
            </View>

            {relatedQuery.isLoading ? (
              <View style={{ marginTop: 22, paddingHorizontal: 16, paddingBottom: 18 }}>
                <Text
                  style={{
                    color: COLORS.text,
                    fontSize: 22,
                    fontWeight: "900",
                    marginBottom: 10,
                    letterSpacing: -0.3,
                  }}
                >
                  Produtos relacionados
                </Text>
                <Text style={s.relatedLoading}>Carregando...</Text>
              </View>
            ) : relatedQuery.isError ? (
              <View style={{ marginTop: 22, paddingHorizontal: 16, paddingBottom: 18 }}>
                <Text
                  style={{
                    color: COLORS.text,
                    fontSize: 22,
                    fontWeight: "900",
                    marginBottom: 10,
                    letterSpacing: -0.3,
                  }}
                >
                  Produtos relacionados
                </Text>
                <Text style={s.relatedLoading}>
                  Não foi possível carregar os relacionados.
                </Text>
              </View>
            ) : safeRelatedItems.length > 0 ? (
              <View style={{ marginTop: 22, paddingBottom: 26 }}>
                <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
                  <Text
                    style={{
                      color: COLORS.text,
                      fontSize: 22,
                      fontWeight: "900",
                      letterSpacing: -0.3,
                    }}
                  >
                    Produtos relacionados
                  </Text>
                </View>

                <FlatList
                  data={safeRelatedItems}
                  horizontal
                  keyExtractor={(item) => item.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16, paddingRight: 20 }}
                  ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
                  renderItem={({ item }) => {
                    const relatedImg = getPrimaryProductImage(item as any);
                    const relatedOut = isOutOfStock(item as any);
                    const relatedPrice = getPriceModel(item as any, viewerMode);
                    const ratingValue = getProductCardRating(item);
                    const reviewsCount = getProductCardReviewsCount(item);

                    return (
                      <Pressable
                        onPress={() => onOpenRelatedProduct(item.id)}
                        style={{
                          width: 168,
                          backgroundColor: "#FFFFFF",
                        }}
                      >
                        <View
                          style={{
                            overflow: "hidden",
                            backgroundColor: "#FFFFFF",
                          }}
                        >
                          <View
                            style={{
                              width: "100%",
                              aspectRatio: 1,
                              backgroundColor: "#F7F4F3",
                              overflow: "hidden",
                              position: "relative",
                              borderRadius: 0,
                            }}
                          >
                            {relatedImg ? (
                              <Image
                                source={{ uri: relatedImg }}
                                style={{ width: "100%", height: "100%" }}
                                resizeMode="cover"
                              />
                            ) : (
                              <View
                                style={{
                                  flex: 1,
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Text
                                  style={{
                                    color: "#7B6F6C",
                                    fontSize: 12,
                                    fontWeight: "700",
                                  }}
                                >
                                  Sem imagem
                                </Text>
                              </View>
                            )}

                            {relatedPrice.promoLabel && !relatedOut ? (
                              <View
                                style={{
                                  position: "absolute",
                                  top: 8,
                                  left: 8,
                                  backgroundColor: "#5D5351",
                                  paddingHorizontal: 8,
                                  paddingVertical: 4,
                                  borderRadius: 999,
                                }}
                              >
                                <Text
                                  style={{
                                    color: "#FFFFFF",
                                    fontSize: 10,
                                    fontWeight: "800",
                                    letterSpacing: 0.2,
                                  }}
                                >
                                  {relatedPrice.promoLabel}
                                </Text>
                              </View>
                            ) : null}

                            <ProductFavoriteButton
                              productId={item.id}
                              initialFavorited={resolveFavoriteFlag(item as any, favoriteIds)}
                              containerStyle={{
                                position: "absolute",
                                top: 8,
                                right: 8,
                              }}
                              size={18}
                              activeColor="#E11D48"
                              inactiveColor="#2E2A29"
                            />

                            <Pressable
                              onPress={(e) => handleAddRelated(item, e)}
                              hitSlop={10}
                              disabled={relatedOut}
                              style={({ pressed }) => [
                                {
                                  position: "absolute",
                                  right: 8,
                                  bottom: 8,
                                  width: 34,
                                  height: 34,
                                  borderRadius: 999,
                                  backgroundColor: "#FFFFFF",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  borderWidth: 1,
                                  borderColor: "rgba(0,0,0,0.10)",
                                },
                                pressed && !relatedOut && { opacity: 0.7 },
                                relatedOut && { opacity: 0.45 },
                              ]}
                            >
                              <Icon
                                name="bag-outline"
                                size={18}
                                color="#000000"
                              />
                            </Pressable>
                          </View>

                          <View
                            style={{
                              paddingHorizontal: 6,
                              paddingTop: 8,
                              paddingBottom: 10,
                              minHeight: 88,
                            }}
                          >
                            <Text
                              numberOfLines={2}
                              style={{
                                fontSize: 13,
                                lineHeight: 17,
                                color: "#1F1A19",
                                fontWeight: "600",
                                minHeight: 34,
                              }}
                            >
                              {item.name}
                            </Text>

                            <View
                              style={{
                                marginTop: 6,
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 4,
                                flexWrap: "wrap",
                              }}
                            >
                              <RatingStars value={ratingValue} size={12} />
                              <Text
                                style={{
                                  fontSize: 11,
                                  color: "#1F1A19",
                                  fontWeight: "700",
                                }}
                              >
                                {ratingValue > 0 ? ratingValue.toFixed(1) : "0.0"}
                              </Text>
                              <Text
                                style={{
                                  fontSize: 10,
                                  color: "rgba(0,0,0,0.45)",
                                  fontWeight: "600",
                                }}
                              >
                                ({reviewsCount})
                              </Text>
                            </View>

                            <View
                              style={{
                                marginTop: 6,
                                flexDirection: "row",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: 6,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 14,
                                  color: "#1F1A19",
                                  fontWeight: "800",
                                }}
                              >
                                {formatBRL(relatedPrice.currentPrice)}
                              </Text>

                              {relatedPrice.hasPromo ? (
                                <Text
                                  style={{
                                    fontSize: 11,
                                    color: "rgba(0,0,0,0.42)",
                                    textDecorationLine: "line-through",
                                    fontWeight: "600",
                                  }}
                                >
                                  {formatBRL(relatedPrice.oldPrice)}
                                </Text>
                              ) : null}
                            </View>

                            {relatedOut ? (
                              <Text
                                style={{
                                  marginTop: 4,
                                  fontSize: 11,
                                  color: "#7B6F6C",
                                  fontWeight: "700",
                                }}
                              >
                                Sem estoque
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      </Pressable>
                    );
                  }}
                />
              </View>
            ) : null}
          </ScrollView>
        )}

        <IosAlert
          visible={!!modal}
          title={modal?.title}
          message={modal?.message}
          onClose={() => setModal(null)}
        />
      </Container>
    </Screen>
  );
}