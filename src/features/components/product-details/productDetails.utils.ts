import { getProductImageUrl } from "../../../core/utils/productImage";
import type { Product, ProductMedia } from "./productDetails.types";

export const COLORS = {
  bg: "#F6F1F3",
  surface: "#FFFFFF",
  surface2: "#FBF7F5",
  text: "#171417",
  textSoft: "#6D6670",
  textMuted: "#958E98",
  border: "#ECE4E8",
  green: "#2F6C52",
  black: "#000000",
  white: "#FFFFFF",
  chipBg: "#F3EEE9",
  chipBorder: "#E6D9CA",
  chipText: "#6A5236",
  bannerBg: "#F5F7FA",
  bannerText: "#475569",
  blue: "#0B63F6",
};

export function formatBRL(value: string | number) {
  const n = Number(String(value ?? 0).replace(",", "."));
  if (!Number.isFinite(n)) return "R$ —";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function isOutOfStock(p: { stock?: number | null; active?: boolean | null }) {
  if (p.active === false) return true;

  const sRaw = p.stock;
  if (sRaw === null || sRaw === undefined) return false;

  const s = Number(sRaw);
  if (!Number.isFinite(s)) return false;

  return s <= 0;
}

export function getEffectivePrice(p: any) {
  return p?.effectivePrice ?? p?.customerPrice ?? p?.price;
}

function getNumericOrder(value: unknown, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function sortByDisplayOrder<T extends { isPrimary?: boolean | null; sort?: number | null; sortOrder?: number | null }>(
  items: T[]
): T[] {
  return [...items]
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aPrimary = a.item?.isPrimary === true ? 1 : 0;
      const bPrimary = b.item?.isPrimary === true ? 1 : 0;

      if (aPrimary !== bPrimary) {
        return bPrimary - aPrimary;
      }

      const aSort = getNumericOrder(a.item?.sort ?? a.item?.sortOrder, Number.MAX_SAFE_INTEGER);
      const bSort = getNumericOrder(b.item?.sort ?? b.item?.sortOrder, Number.MAX_SAFE_INTEGER);

      if (aSort !== bSort) {
        return aSort - bSort;
      }

      return a.index - b.index;
    })
    .map(({ item }) => item);
}

function normalizeImageMediaFromProduct(product?: Product | null): ProductMedia[] {
  if (!product) return [];

  const apiMedia = Array.isArray(product.media) ? product.media : [];
  if (apiMedia.length > 0) {
    return sortByDisplayOrder(
      apiMedia.filter((item) => item?.type === "image" && !!item?.url)
    ).map((item, index) => ({
      id: String(item.id ?? `media-image-${index}`),
      type: "image",
      url: item.url,
      thumbnailUrl: item.thumbnailUrl ?? item.url,
      sort: getNumericOrder(item.sort, index),
      isPrimary: Boolean(item.isPrimary),
      title: item.title ?? null,
      description: item.description ?? null,
    }));
  }

  const fallbackImages = Array.isArray(product.images) ? product.images : [];
  return sortByDisplayOrder(
    fallbackImages.filter((img) => !!img?.url)
  ).map((img, index) => ({
    id: String(img.id ?? `img-${index}`),
    type: "image",
    url: img.url,
    thumbnailUrl: img.url,
    sort: getNumericOrder(img.sort, index),
    isPrimary: Boolean(img.isPrimary),
  }));
}

export function getPrimaryProductImage(product?: Product | null) {
  if (!product) return null;

  const orderedImages = normalizeImageMediaFromProduct(product);
  if (orderedImages.length > 0) {
    return orderedImages[0]?.thumbnailUrl || orderedImages[0]?.url || null;
  }

  return product.primaryImageUrl || getProductImageUrl(product as any) || null;
}

export function getProductDescription(product?: Product | null) {
  if (!product) return "";

  if (product.description?.trim()) return product.description.trim();

  if (Array.isArray(product.highlights) && product.highlights.length > 0) {
    return product.highlights.slice(0, 2).join(" • ");
  }

  return "Produto profissional desenvolvido para uso em salão, com performance confiável e acabamento premium.";
}

export function getSafeHighlights(product?: Product | null) {
  return Array.isArray(product?.highlights)
    ? product!.highlights!
        .map((x) => String(x || "").trim())
        .filter(Boolean)
        .slice(0, 3)
    : [];
}

export function normalizeGalleryMedia(
  product?: Product | null,
  options?: { allowVideos?: boolean }
): ProductMedia[] {
  if (!product) return [];

  const allowVideos = options?.allowVideos ?? true;

  const normalizedImages = normalizeImageMediaFromProduct(product);

  const apiMedia = Array.isArray(product.media) ? product.media : [];
  const normalizedApiVideos: ProductMedia[] = allowVideos
    ? sortByDisplayOrder(
        apiMedia.filter((item) => item?.type === "video" && !!item?.url)
      ).map((item, index) => ({
        id: String(item.id ?? `media-video-${index}`),
        type: "video",
        url: item.url,
        thumbnailUrl: item.thumbnailUrl ?? null,
        sort: getNumericOrder(item.sort, index),
        isPrimary: Boolean(item.isPrimary),
        title: item.title ?? null,
        description: item.description ?? null,
      }))
    : [];

  const normalizedFallbackVideos: ProductMedia[] =
    allowVideos && normalizedApiVideos.length === 0 && Array.isArray(product.videos)
      ? sortByDisplayOrder(
          product.videos.filter((v) => !!v?.videoUrl)
        ).map((video, index) => ({
          id: String(video.id ?? `video-${index}`),
          type: "video",
          url: video.videoUrl,
          thumbnailUrl: video.thumbnailUrl ?? null,
          sort: getNumericOrder(video.sortOrder, index),
          title: video.title ?? null,
          description: video.description ?? null,
        }))
      : [];

  const normalizedVideos =
    normalizedApiVideos.length > 0 ? normalizedApiVideos : normalizedFallbackVideos;

  if (normalizedImages.length > 0 || normalizedVideos.length > 0) {
    return [...normalizedImages, ...normalizedVideos];
  }

  const fallbackSingle = product.primaryImageUrl || getProductImageUrl(product as any);
  if (!fallbackSingle) return [];

  return [
    {
      id: "fallback-primary-image",
      type: "image",
      url: fallbackSingle,
      thumbnailUrl: fallbackSingle,
      sort: 0,
      isPrimary: true,
    },
  ];
}

export function buildVideoHtml(url: string) {
  const safeUrl = String(url || "").replace(/"/g, "&quot;");

  return `
    <!doctype html>
    <html>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=yes"
        />
        <style>
          html, body {
            margin: 0;
            padding: 0;
            background: #000;
            width: 100%;
            height: 100%;
            overflow: hidden;
          }
          .wrap {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #000;
          }
          video {
            width: 100%;
            height: 100%;
            background: #000;
          }
        </style>
      </head>
      <body>
        <div class="wrap">
          <video
            src="${safeUrl}"
            controls
            autoplay
            playsinline
            webkit-playsinline
            preload="metadata"
          ></video>
        </div>
      </body>
    </html>
  `;
}