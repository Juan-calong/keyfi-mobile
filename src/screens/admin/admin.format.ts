export function formatBRL(value: string) {
    const n = Number(String(value).replace(",", "."));
    if (!Number.isFinite(n)) return "R$ —";
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("pt-BR");
}
