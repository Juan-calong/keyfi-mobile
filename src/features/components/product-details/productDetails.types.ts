export type ProductMedia = {
  id: string;
  type: "image" | "video";
  url: string;
  thumbnailUrl?: string | null;
  sort?: number | null;
  isPrimary?: boolean | null;
  title?: string | null;
  description?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
};

export type Product = {
  id: string;
  sku?: string | null;
  name: string;
  description?: string | null;
  effect?: string | null;
  price: string;
  customerPrice?: string | null;
  effectivePrice?: string | number;
  isFavorite?: boolean;
  favoritesCount?: number;
  commentsCount?: number;
  activePromo?: {
  id?: string | null;
  type?: string | null;
  value?: string | number | null;
  promoPrice?: number | string | null;
  startsAt?: string | Date | null;
  endsAt?: string | Date | null;
} | null;
pricing?: {
  basePrice?: number | string | null;
  promoPrice?: number | string | null;
  effectivePrice?: number | string | null;
  hasActivePromo?: boolean | null;
} | null;

  stock?: number | null;
  active: boolean;
  highlights?: string[] | null;
  primaryImageUrl?: string | null;
  images?: {
    id?: string;
    url: string;
    isPrimary?: boolean | null;
    sort?: number | null;
  }[];

  media?: ProductMedia[];
  videos?: {
    id: string;
    title?: string | null;
    description?: string | null;
    videoUrl: string;
    thumbnailUrl?: string | null;
    sortOrder?: number | null;
  }[];

  brand?: string | null;
  line?: string | null;
  volume?: string | null;
  audience?: "ALL" | "STAFF_ONLY" | string | null;

  activeOffers?: Array<{
    type?: string | null;
    promoType?: string | null;
    id?: string | null;
    label?: string | null;
    shortLabel?: string | null;
    description?: string | null;
    startsAt?: string | Date | null;
    endsAt?: string | Date | null;
  }> | null;

  offerBadges?: string[] | null;

  quantityDiscount?: {
    enabled?: boolean | null;
    source?: {
      type?: string | null;
      id?: string | null;
      name?: string | null;
      appliesTo?: string | null;
      startsAt?: string | Date | null;
      endsAt?: string | Date | null;
    } | null;
    tiers?: Array<{
      id?: string | null;
      minQty?: number | null;
      discountType?: string | null;
      discountValue?: number | null;
      unitPriceAfterQuantity?: number | null;
      unitPriceFinal?: number | null;
      label?: string | null;
    }> | null;
    label?: string | null;
    description?: string | null;
  } | null;
    quantityDiscountHighlight?: {
    minQuantity?: number | null;
    discountType?: string | null;
    discountValue?: number | null;
    unitPriceAfterQuantity?: number | null;
    unitPriceFinal?: number | null;
    label?: string | null;
    shortLabel?: string | null;
  } | null;
};

export type RelatedProduct = {
  id: string;
  sku?: string | null;
  name: string;
  description?: string | null;
  price: string;
  customerPrice?: string | null;
  effectivePrice?: string | number;
  stock?: number | null;
  active: boolean;
  highlights?: string[] | null;
  primaryImageUrl?: string | null;
  images?: {
    url: string;
    isPrimary?: boolean | null;
    sort?: number | null;
  }[];

  brand?: string | null;
  line?: string | null;
  audience?: "ALL" | "STAFF_ONLY" | string | null;

  score?: number;
  matchedCategory?: boolean;
  matchedBrand?: boolean;
  matchedLine?: boolean;
  commonHighlights?: number;
  similarPrice?: boolean;
};

export type BasicQueryState = {
  isLoading: boolean;
  isError: boolean;
  refetch?: () => void | Promise<unknown>;
};


export type ProductCommentUser = {
  id?: string;
  name?: string;
};

export type ProductCommentAdminResponse = {
  id?: string;
  message?: string;
  createdAt?: string;
  adminName?: string;
  admin?: {
    id?: string;
    name?: string;
  } | null;
  active?: boolean;
};

export type ProductComment = {
  id: string;
  comment: string;
  createdAt: string;
  user?: ProductCommentUser;
  rating?: number | null;
  stars?: number | null;
  score?: number | null;
  adminResponse?: ProductCommentAdminResponse | null;
};

export type ProductCommentSummary = ProductComment;

export type EligibleReviewOrderItem = {
  id: string;
  orderId: string;
  productId: string;
  deliveredAt: string | null;
  deliveryType: "CORREIOS" | "LOCAL" | string;
};

export type MyProductCommentStatusResponse = {
  canReview?: boolean;
  hasPurchased?: boolean;
  hasComment?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  nextAllowedEditAt?: string | null;
    reason?:
    | "NO_PURCHASE"
    | "NOT_DELIVERED"
    | "ALREADY_REVIEWED"
    | "OK"
    | string
    | null;
  message?: string | null;
  item?: ProductCommentSummary | null;
  comment?: ProductCommentSummary | null;
  legacyComment?: ProductCommentSummary | null;
  eligibleOrderItem?: EligibleReviewOrderItem | null;
  eligibleOrderItems?: EligibleReviewOrderItem[];
};

export type ProductCommentsResponse = {
  items: ProductComment[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

export type ToggleFavoriteResponse = {
  favorited: boolean;
  favoritesCount: number;
  message?: string;
};