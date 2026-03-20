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

export function getPrimaryProductImage(product?: Product | null) {
  if (!product) return null;

  return (
    product.primaryImageUrl ||
    product.images?.find((item) => item?.isPrimary)?.url ||
    product.images?.[0]?.url ||
    getProductImageUrl(product as any) ||
    null
  );
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

  const apiMedia = Array.isArray(product.media) ? product.media : [];
  if (apiMedia.length > 0) {
    const images = apiMedia
      .filter((item) => item?.type === "image")
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

    const videos = allowVideos
      ? apiMedia
          .filter((item) => item?.type === "video")
          .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
      : [];

    const grouped = [...images, ...videos];

    if (grouped.length > 0) return grouped;
  }

  const fallbackImages = Array.isArray(product.images) ? product.images : [];
  const normalizedImages: ProductMedia[] = fallbackImages
    .filter((img) => !!img?.url)
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
    .map((img, index) => ({
      id: String(img.id ?? `img-${index}`),
      type: "image",
      url: img.url,
      thumbnailUrl: img.url,
      sort: img.sort ?? index,
      isPrimary: Boolean(img.isPrimary),
    }));

  const normalizedVideos: ProductMedia[] =
    allowVideos && Array.isArray(product.videos)
      ? [...product.videos]
          .filter((v) => !!v?.videoUrl)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map((video, index) => ({
            id: String(video.id ?? `video-${index}`),
            type: "video",
            url: video.videoUrl,
            thumbnailUrl: video.thumbnailUrl ?? null,
            sort: video.sortOrder ?? index,
            title: video.title ?? null,
            description: video.description ?? null,
          }))
      : [];

  if (normalizedImages.length > 0 || normalizedVideos.length > 0) {
    return [...normalizedImages, ...normalizedVideos];
  }

  const fallbackSingle = getPrimaryProductImage(product);
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