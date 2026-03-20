import React from "react";
import { View, Text, FlatList, Image, Pressable, StyleSheet } from "react-native";
import { useSalonActivePromos } from "../../../core/queries/salonHome.queries";
import { getProductImageUrl } from "../../../core/utils/productImage";
import { Card } from "../../../ui/components/Card";
import { t } from "../../../ui/tokens";

type Promo = { id: string; title?: string | null; type: string; value: string | number };
type Product = { id: string; name: string; price: string | number; stock?: number | null; active?: boolean | null };
type Item = { promo: Promo; product: Product };

function toNumberBR(v: any) {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function formatBRL(value: string | number) {
  const n = toNumberBR(value);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function clampMin(n: number, min = 0) {
  return n < min ? min : n;
}

function applyPromo(basePrice: number, promo: Promo) {
  const value = toNumberBR(promo?.value);

  switch (String(promo?.type || "").toUpperCase()) {
    case "PCT": {
      const pct = clampMin(value, 0);
      return clampMin(basePrice * (1 - pct / 100), 0);
    }
    case "VALUE": {
      return clampMin(basePrice - value, 0);
    }
    case "PRICE":
    case "FIXED_PRICE": {
      return clampMin(value, 0);
    }
    default:
      return basePrice;
  }
}

function badgeText(promo: Promo, base: number, final: number) {
  if (!(final < base)) return null;

  const type = String(promo?.type || "").toUpperCase();
  const value = toNumberBR(promo?.value);

  if (type === "PCT") return `-${Math.round(value)}%`;
  if (type === "VALUE") return `-${formatBRL(value)}`;
  return "OFERTA";
}

function isOutOfStock(p: Product) {
  if (p.active === false) return true;
  const sRaw = p.stock;
  if (sRaw === null || sRaw === undefined) return false;
  const s = Number(sRaw);
  if (!Number.isFinite(s)) return false;
  return s <= 0;
}

export function SalonPromosSection({ onPressItem }: { onPressItem?: (productId: string) => void }) {
  const q = useSalonActivePromos();
  const items: Item[] = (q.data?.items ?? []) as any;

  if (q.isLoading || q.isError || !items.length) return null;

  return (
    <View style={{ marginTop: 0 }}>
      <FlatList
        data={items}
        keyExtractor={(it) => `${it.promo.id}:${it.product.id}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        renderItem={({ item }) => {
          const product = item.product;
          const promo = item.promo;

          const img = getProductImageUrl(product as any);
          const out = isOutOfStock(product);

          const base = toNumberBR(product.price);
          const final = applyPromo(base, promo);
          const hasPromo = final < base;
          const badge = badgeText(promo, base, final);

          return (
            <Pressable onPress={out ? undefined : () => onPressItem?.(product.id)} style={{ width: 176 }}>
              <Card style={[s.card, out && { opacity: 0.55 }]}>
                <View style={s.imgWrap}>
                  {img ? (
                    <Image source={{ uri: img }} style={s.img} resizeMode="cover" />
                  ) : (
                    <View style={s.imgPh}>
                      <Text style={{ fontSize: 12, opacity: 0.7 }}>Sem imagem</Text>
                    </View>
                  )}

                  {!!badge && !out ? (
                    <View style={s.badge}>
                      <Text style={s.badgeTxt} numberOfLines={1}>
                        {badge}
                      </Text>
                    </View>
                  ) : null}

                  {out ? (
                    <View style={s.oosBadge}>
                      <Text style={s.oosTxt}>Sem estoque</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={s.name} numberOfLines={2}>
                  {product.name}
                </Text>

                <View style={s.priceRow}>
                  {hasPromo ? (
                    <>
                      <Text style={s.promoPrice} numberOfLines={1}>
                        {formatBRL(final)}
                      </Text>
                      <Text style={s.oldPrice} numberOfLines={1}>
                        {formatBRL(base)}
                      </Text>
                    </>
                  ) : (
                    <Text style={s.promoPrice} numberOfLines={1}>
                      {formatBRL(base)}
                    </Text>
                  )}
                </View>

                {!!promo?.title ? (
                  <Text style={s.promoTitle} numberOfLines={1}>
                    {promo.title}
                  </Text>
                ) : null}
              </Card>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  card: { padding: 10, borderRadius: 18, gap: 8 },

  imgWrap: {
    borderRadius: 16,
    overflow: "hidden",
    height: 112,
    backgroundColor: t.colors.surface2,
    position: "relative",
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  img: { width: "100%", height: "100%" },
  imgPh: { flex: 1, alignItems: "center", justifyContent: "center" },

  badge: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeTxt: { color: "#fff", fontSize: 12, fontWeight: "900" },

  oosBadge: {
    position: "absolute",
    bottom: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(225,29,72,0.14)",
    borderWidth: 1,
    borderColor: "rgba(225,29,72,0.25)",
  },
  oosTxt: { color: t.colors.danger, fontWeight: "900", fontSize: 11 },

  name: { color: t.colors.text, fontWeight: "900", fontSize: 13, lineHeight: 18, minHeight: 36 },
  priceRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  promoPrice: { color: t.colors.text, fontWeight: "900", fontSize: 14 },
  oldPrice: { color: t.colors.text2, fontWeight: "800", textDecorationLine: "line-through" },
  promoTitle: { color: t.colors.text2, fontWeight: "800", fontSize: 12 },
});
