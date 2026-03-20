export function isOutOfStock(p: { stock?: number | null; active?: boolean | null }) {
    const s = Number(p.stock ?? 0);
    if (!Number.isFinite(s)) return true;
    if (p.active === false) return true;
    return s <= 0;
}
