function toNumber(value: unknown) {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function resolvePromoPriceData(item: any, fallbackPromo?: any) {
  const badge =
    item?.promoBadge ??
    item?.pricing?.promoBadge ??
    item?.promo?.promoBadge ??
    fallbackPromo?.promoBadge ??
    null;

  const basePrice = toNumber(badge?.basePrice);
  const promoPrice = toNumber(badge?.promoPrice);

  if (basePrice > 0 && promoPrice >= 0 && promoPrice < basePrice) {
    return {
      price: promoPrice,
      originalPrice: basePrice,
      hasDiscount: true,
    };
  }

  return null;
}
