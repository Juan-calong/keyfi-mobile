export function toNumberBR(v: string | number | null | undefined) {
    const n = Number(String(v ?? "0").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
}

export function clampMin(n: number, min = 0) {
    return n < min ? min : n;
}

export function applyPromo(basePrice: number, promo: { type: string; value: string }) {
    const value = toNumberBR(promo.value);

    switch (promo.type) {
        case "PCT": {
            const pct = clampMin(value, 0);
            const final = basePrice * (1 - pct / 100);
            return clampMin(final, 0);
        }
        case "VALUE": {
            const final = basePrice - value;
            return clampMin(final, 0);
        }
        case "PRICE":
        case "FIXED_PRICE": {
            return clampMin(value, 0);
        }
        default:
            return basePrice;
    }
}
