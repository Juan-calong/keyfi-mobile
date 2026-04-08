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

  activePromo?: {
    id: string;
    type: string;
    value: string;
    promoPrice?: number | null;
    startsAt?: string | Date;
    endsAt?: string | Date | null;
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

export type MyProductCommentStatusResponse = {
  canReview?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  hasComment?: boolean;
  nextAllowedEditAt?: string | null;
  message?: string;
  item?: ProductComment | null;
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