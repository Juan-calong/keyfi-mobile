export function resolvePromoBadgeLabel(item: any, mode: "short" | "full" = "short") {
  const candidates =
    mode === "full"
      ? [
          item?.quantityDiscountHighlight?.label,
          item?.quantityDiscountHighlight?.shortLabel,
          item?.promoBadge?.label,
          item?.promoBadge?.shortLabel,
          item?.pricing?.promoBadge?.label,
          item?.pricing?.promoBadge?.shortLabel,
          item?.promo?.promoBadge?.label,
          item?.promo?.promoBadge?.shortLabel,
        ]
      : [
          item?.quantityDiscountHighlight?.shortLabel,
          item?.quantityDiscountHighlight?.label,
          item?.promoBadge?.shortLabel,
          item?.promoBadge?.label,
          item?.pricing?.promoBadge?.shortLabel,
          item?.pricing?.promoBadge?.label,
          item?.promo?.promoBadge?.shortLabel,
          item?.promo?.promoBadge?.label,
        ];

  const label = candidates
    .map((value) => String(value ?? "").trim())
    .find(Boolean);

  return label ?? null;
}
