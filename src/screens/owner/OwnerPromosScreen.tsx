import React, { useMemo } from "react";
import { View, Text, FlatList, Pressable, Image, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSalonActivePromos } from "../../core/queries/salonHome.queries";
import { getProductImageUrl } from "../../core/utils/productImage";
import { resolvePromoBadgeLabel } from "../../core/utils/promoBadge";
import { resolvePromoPriceData } from "../../core/utils/promoPricing";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { Card } from "../../ui/components/Card";
import { Button } from "../../ui/components/Button";
import { Loading, ErrorState, Empty } from "../../ui/components/State";
import { t } from "../../ui/tokens";

import { OWNER_SCREENS } from "../../navigation/owner.routes";

function toNumberBR(v: string | number | null | undefined) {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function clampMin(n: number, min = 0) {
  return n < min ? min : n;
}

function applyPromo(basePrice: number, promo: { type: string; value: string }) {
  const value = toNumberBR(promo.value);

  switch (promo.type) {
    case "PCT": {
      const pct = clampMin(value, 0);
      const final = basePrice * (1 - pct / 100);
      return clampMin(final, 0);
    }
    case "VALUE":
    case "FIXED": {
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
function formatBRL(value: string | number) {
  const n = Number(String(value ?? 0).replace(",", "."));
  if (!Number.isFinite(n)) return "R$ —";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function OwnerPromosScreen() {
  const nav = useNavigation<any>();
  const q = useSalonActivePromos();

  const rows = useMemo(() => {
    const items = q.data?.items ?? [];
    return items.map((it: any) => {
      const promoPriceData =
        resolvePromoPriceData(it) ??
        resolvePromoPriceData(it.product, it.promo) ??
        resolvePromoPriceData(it.promo);
      const legacyBase = toNumberBR(it.product?.price);
      const legacyFinal = applyPromo(legacyBase, it.promo);
      const base = promoPriceData?.originalPrice ?? legacyBase;
      const final = promoPriceData?.price ?? legacyFinal;
      const hasDiscount = promoPriceData?.hasDiscount ?? (legacyFinal < legacyBase);
      const badge =
        resolvePromoBadgeLabel(it) ??
        resolvePromoBadgeLabel(it.product) ??
        resolvePromoBadgeLabel(it.promo);
      return { ...it, base, final, hasDiscount, badge };
    });
  }, [q.data?.items]);

  if (q.isLoading) {
    return (
      <Screen>
        <Container style={{ flex: 1 }}>
          <Loading />
        </Container>
      </Screen>
    );
  }

  if (q.isError) {
    return (
      <Screen>
        <Container style={{ flex: 1 }}>
          <ErrorState onRetry={() => q.refetch()} />
        </Container>
      </Screen>
    );
  }

  return (
    <Screen>
      <Container style={{ flex: 1 }}>
        <View style={s.header}>
          <Pressable onPress={() => nav.goBack()} style={s.backBtn} hitSlop={10}>
            <Text style={s.backTxt}>←</Text>
          </Pressable>
          <Text style={s.h1}>Promoções</Text>
          <View style={{ width: 42 }} />
        </View>

        {!rows.length ? (
          <Empty text="Sem promoções ativas agora." />
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(it: any) => `${it.promo.id}:${it.product.id}`}
            contentContainerStyle={{ paddingBottom: 18, gap: 12 }}
            renderItem={({ item }: any) => {
              const p = item.product;
              const img = getProductImageUrl(p);

              return (
                <Pressable onPress={() => nav.navigate(OWNER_SCREENS.ProductDetails, { productId: p.id })}>
                  <Card style={s.card}>
                    <View style={s.rowTop}>
                      <View style={s.thumb}>
                        {img ? (
                          <Image source={{ uri: img }} style={s.thumbImg} resizeMode="cover" />
                        ) : (
                          <View style={s.thumbPh}>
                            <Text style={{ fontSize: 11, opacity: 0.7 }}>Sem imagem</Text>
                          </View>
                        )}

                        {!!item.badge ? (
                          <View style={s.badge}>
                            <Text style={s.badgeTxt}>{item.badge}</Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.name} numberOfLines={2}>
                          {p.name}
                        </Text>

                        <View style={s.priceRow}>
                          <Text style={s.price}>{formatBRL(item.hasDiscount ? item.final : item.base)}</Text>
                          {item.hasDiscount ? <Text style={s.oldPrice}>{formatBRL(item.base)}</Text> : null}
                        </View>

                        <Text style={s.promoHint} numberOfLines={1}>
                          {item.promo.type === "PCT"
                            ? `Desconto de ${Math.round(toNumberBR(item.promo.value))}%`
                            : "Produto em promoção"}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                      <Button
                        title="Selecionar na compra"
                        variant="primary"
                        onPress={() => nav.navigate(OWNER_SCREENS.Buy, { addProductId: p.id })}
                        style={{ flex: 1, height: 46, borderRadius: 14 }}
                      />
                      <Button
                        title="Ver"
                        variant="ghost"
                        onPress={() => nav.navigate(OWNER_SCREENS.ProductDetails, { productId: p.id })}
                        style={{ width: 90, height: 46, borderRadius: 14, borderWidth: 1, borderColor: t.colors.border }}
                      />
                    </View>
                  </Card>
                </Pressable>
              );
            }}
          />
        )}
      </Container>
    </Screen>
  );
}

const s = StyleSheet.create({
  header: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  h1: { color: t.colors.text, fontWeight: "900", fontSize: 20 },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  backTxt: { color: t.colors.text, fontWeight: "900", fontSize: 18 },

  card: { padding: 12, borderRadius: 18 },

  rowTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" },

  thumb: {
    width: 84,
    height: 84,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface2,
  },
  thumbImg: { width: "100%", height: "100%" },
  thumbPh: { flex: 1, alignItems: "center", justifyContent: "center" },

  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.78)",
  },
  badgeTxt: { color: "#fff", fontWeight: "900", fontSize: 12 },

  name: { color: t.colors.text, fontWeight: "900", fontSize: 14, lineHeight: 18 },

  priceRow: { marginTop: 8, flexDirection: "row", alignItems: "flex-end", gap: 10 },
  price: { color: t.colors.text, fontWeight: "900", fontSize: 14 },
  oldPrice: { color: t.colors.text2, fontWeight: "800", textDecorationLine: "line-through", fontSize: 12 },

  promoHint: { marginTop: 4, color: t.colors.text2, fontWeight: "800", fontSize: 12 },
});
