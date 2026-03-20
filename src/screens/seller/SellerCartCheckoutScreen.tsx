import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  Image,
  Platform,
  StatusBar,
} from "react-native";
import { CommonActions, useNavigation, useRoute } from "@react-navigation/native";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { Loading, ErrorState, Empty } from "../../ui/components/State";
import { IosAlert } from "../../ui/components/IosAlert";

import { ProductsService, Product } from "../../core/api/services/products.service";
import {
  previewCart,
  createSellerCartRequest,
  sendSellerCartRequest,
  type CartPreviewResponse,
} from "../../core/api/services/cartRequests.service";
import { getProductImageUrl } from "../../core/utils/productImage";

import { SELLER_SCREENS } from "../../navigation/seller.routes";
import { useSellerSessionStore } from "../../stores/seller.session.store";

import { friendlyError } from "../../core/errors/friendlyError";

function asArray<T>(v: any): T[] {
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.items)) return v.items;
  if (Array.isArray(v?.data)) return v.data;
  return [];
}

function toNumberBR(v: any): number {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function formatBRL(value: string | number) {
  const n = toNumberBR(value);
  if (!Number.isFinite(n)) return "R$ —";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const BLACK = "#000000";
const WHITE = "#FFFFFF";
const LINE = "rgba(0,0,0,0.12)";

function buildInitialQtyMap(params: any): Record<string, number> {
  const map: Record<string, number> = {};

  const items = Array.isArray(params?.items) ? params.items : [];
  const selectedIds = Array.isArray(params?.selectedIds) ? params.selectedIds : [];

  if (items.length > 0) {
    for (const it of items) {
      const id = String(it?.productId ?? "");
      const qty = Number(it?.qty ?? 0);
      if (!id) continue;
      map[id] = Math.max(1, qty || 1);
    }
    return map;
  }

  for (const id of selectedIds) {
    if (!id) continue;
    map[String(id)] = 1;
  }

  return map;
}

type PreviewLine = CartPreviewResponse["items"][number] & {
  _img?: string | null;
  _name?: string;
};

export function SellerCartCheckoutScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();

  const [modal, setModal] = useState<null | { title: string; message: string }>(null);

  const activeSalonId = useSellerSessionStore((s) => s.activeSalonId);
  const salonId = route?.params?.salonId || activeSalonId || null;

  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string>("");

  const [qtyById, setQtyById] = useState<Record<string, number>>(() =>
    buildInitialQtyMap(route?.params)
  );

  const lastPreviewErrorRef = useRef<string>("");

  const productsQ = useQuery({
    queryKey: ["seller-products-checkout-fallback", { active: "true" }],
    queryFn: () => ProductsService.list({ active: "true" }),
    retry: false,
    staleTime: 0,
  });

  const productsAll: Product[] = useMemo(() => {
    const raw = asArray<Product>(productsQ.data);
    return raw.filter((p: any) => Number(p?.stock ?? 0) > 0 && p?.active !== false);
  }, [productsQ.data]);

  const items = useMemo(() => {
    return Object.entries(qtyById)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([productId, qty]) => ({
        productId,
        qty: Number(qty),
      }));
  }, [qtyById]);

  useEffect(() => {
    const validIds = new Set(productsAll.map((p: any) => String(p.id)));
    setQtyById((prev) => {
      let changed = false;
      const next: Record<string, number> = {};
      for (const [id, qty] of Object.entries(prev)) {
        if (validIds.has(id)) next[id] = qty;
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [productsAll]);

  const previewQ = useQuery({
    queryKey: ["seller-cart-preview", { salonId, items, coupon: appliedCoupon }],
    enabled: !!salonId && items.length > 0,
    retry: false,
    staleTime: 0,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      return previewCart({
        salonId: String(salonId),
        items,
        couponCode: appliedCoupon || undefined,
      });
    },
  });

  const preview = previewQ.data as CartPreviewResponse | undefined;

  const applyCouponMut = useMutation({
    mutationFn: async (codeRaw: string) => {
      const code = String(codeRaw || "").trim().toUpperCase();

      return previewCart({
        salonId: String(salonId),
        items,
        couponCode: code,
      });
    },
    onSuccess: () => {
      const normalized = String(coupon || "").trim().toUpperCase();
      setAppliedCoupon(normalized);
    },
    onError: (e: any) => {
      const fe = friendlyError(e);

      setAppliedCoupon("");
      setModal({
        title: "Cupom inválido",
        message: fe.message || "Não foi possível aplicar esse cupom.",
      });
    },
  });

  useEffect(() => {
    if (!previewQ.isError || !previewQ.error) return;

    const fe = friendlyError(previewQ.error);
    const msg = fe.message || "Não foi possível atualizar o carrinho.";
    const key = `${msg}::${appliedCoupon}::${JSON.stringify(items)}`;

    if (lastPreviewErrorRef.current === key) return;
    lastPreviewErrorRef.current = key;

    setModal({
      title: fe.title || "Aviso",
      message: msg,
    });
  }, [previewQ.isError, previewQ.error, appliedCoupon, items]);

  const byId = useMemo(
    () => new Map(productsAll.map((p: any) => [String(p.id), p])),
    [productsAll]
  );

  const mergedLines = useMemo<PreviewLine[]>(() => {
    const lines = preview?.items || [];

    return lines.map((l) => {
      const p = byId.get(String(l.productId));
      const img = l.product?.imageUrl || (p ? getProductImageUrl(p) : null) || null;
      const name = l.product?.name || (p as any)?.name || "—";
      return { ...l, _name: name, _img: img };
    });
  }, [preview, byId]);

  const applyCoupon = () => {
    const code = String(coupon || "").trim().toUpperCase();

    if (!salonId) {
      setModal({ title: "Aviso", message: "Selecione um salão antes de aplicar o cupom." });
      return;
    }

    if (!items.length) {
      setModal({ title: "Aviso", message: "Adicione itens ao carrinho antes de aplicar o cupom." });
      return;
    }

    if (code.length < 2) {
      setModal({ title: "Cupom", message: "Digite um cupom válido." });
      return;
    }

    applyCouponMut.mutate(code);
  };

  const clearCoupon = () => {
  setCoupon("");
  setAppliedCoupon("");
  setModal({
    title: "Cupom removido",
    message: "O cupom foi removido do seu carrinho.",
  });
};

  function changeQty(productId: string, delta: number) {
    setQtyById((prev) => {
      const curr = Number(prev[productId] ?? 0);
      const next = curr + delta;

      if (next <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }

      return {
        ...prev,
        [productId]: next,
      };
    });
  }

  function removeItem(productId: string) {
    setQtyById((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
  }

  const sendRequestMut = useMutation({
    mutationFn: async () => {
      if (!salonId) {
        throw new Error("Selecione um salão antes de continuar.");
      }

      if (!items.length) {
        throw new Error("Seu carrinho está vazio.");
      }

      const created = await createSellerCartRequest(String(salonId), {
        items,
        couponCode: appliedCoupon || undefined,
      });

      const sent = await sendSellerCartRequest(created.request.id);
      return sent.request;
    },
    onSuccess: (request) => {
      setQtyById({});
      setCoupon("");
      setAppliedCoupon("");

      nav.dispatch(
        CommonActions.reset({
          index: 1,
          routes: [
            { name: SELLER_SCREENS.Tabs },
            {
              name: SELLER_SCREENS.CartRequestDetails,
              params: { requestId: request.id },
            },
          ],
        })
      );
    },
    onError: (e: any) => {
      const apiMessage =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        null;

      const fe = friendlyError(e);

      setModal({
        title: "Aviso",
        message:
          apiMessage ||
          fe.message ||
          e?.message ||
          "Falha ao enviar carrinho para o salão.",
      });
    },
  });

  const isInitialLoading = productsQ.isLoading || (!preview && previewQ.isLoading);
  const isFatalError = productsQ.isError || (!preview && previewQ.isError && !previewQ.data);

  return (
    <Screen style={{ flex: 1, backgroundColor: WHITE }}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      <View style={s.header}>
        <Pressable onPress={() => nav.goBack?.()} hitSlop={12} style={s.headerLeft}>
          <Text style={s.chev}>‹</Text>
          <Text style={s.backText}>Back</Text>
        </Pressable>

        <Text style={s.headerTitle}>Carrinho</Text>

        <View style={s.headerRight} />
      </View>

      <Container style={{ flex: 1, paddingHorizontal: 16 }}>
        <View style={s.rule} />

        {!salonId ? (
          <Empty text="Selecione um salão antes de continuar." />
        ) : items.length === 0 ? (
          <Empty text="Seu carrinho está vazio." />
        ) : isInitialLoading ? (
          <Loading />
        ) : isFatalError ? (
          <ErrorState onRetry={() => previewQ.refetch()} />
        ) : (
          <>
            <FlatList
              data={mergedLines}
              keyExtractor={(i) => String(i.productId)}
              ItemSeparatorComponent={() => <View style={s.sep} />}
              ListEmptyComponent={<Empty text="Sem itens." />}
              contentContainerStyle={{ paddingBottom: 250 }}
              renderItem={({ item }) => {
                const qty = Number(qtyById[item.productId] ?? item.qty ?? 1);

                return (
                  <View style={s.row}>
                    <View style={s.thumb}>
                      {item._img ? (
                        <Image
                          source={{ uri: String(item._img) }}
                          style={{ width: "100%", height: "100%" }}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={s.thumbPh}>
                          <Text style={s.thumbPhText}>No image</Text>
                        </View>
                      )}
                    </View>

                    <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                      <Text style={s.name} numberOfLines={1}>
                        {item._name}
                      </Text>

                      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                        <Text style={s.price}>{formatBRL(item.unitPriceFinal)}</Text>

                        {toNumberBR(item.unitPriceFinal) < toNumberBR(item.unitPriceBase) ? (
                          <Text style={s.oldPrice}>{formatBRL(item.unitPriceBase)}</Text>
                        ) : null}
                      </View>

                      {!!item.lineCouponDiscount && toNumberBR(item.lineCouponDiscount) > 0 ? (
                        <Text style={s.metaDiscount}>
                          Cupom: -{formatBRL(item.lineCouponDiscount)}
                        </Text>
                      ) : null}
                    </View>

                    <View style={s.qtyWrap}>
                      <View style={s.qtyControls}>
                        <Pressable
                          onPress={() => changeQty(item.productId, -1)}
                          style={({ pressed }) => [s.qtyBtn, pressed && { opacity: 0.7 }]}
                        >
                          <Text style={s.qtyBtnText}>−</Text>
                        </Pressable>

                        <View style={s.qtyPill}>
                          <Text style={s.qtyText}>{qty}</Text>
                        </View>

                        <Pressable
                          onPress={() => changeQty(item.productId, +1)}
                          style={({ pressed }) => [s.qtyBtn, pressed && { opacity: 0.7 }]}
                        >
                          <Text style={s.qtyBtnText}>+</Text>
                        </Pressable>
                      </View>

                      <Pressable
                        onPress={() => removeItem(item.productId)}
                        hitSlop={8}
                        style={({ pressed }) => [s.removeBtn, pressed && { opacity: 0.7 }]}
                      >
                        <Text style={s.removeText}>Remove</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              }}
            />

            <View style={s.footer}>
              <View style={s.footerRule} />

              {(preview?.warnings?.length ?? 0) > 0 ? (
                <View style={{ marginBottom: 10, gap: 6 }}>
                  {preview?.warnings?.map((w, idx) => (
                    <Text key={`${w.code}-${idx}`} style={s.warningText}>
                      {w.message}
                    </Text>
                  ))}
                </View>
              ) : null}

              <Text style={s.sectionTitle}>Promo code</Text>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                <TextInput
                  value={coupon}
                  onChangeText={setCoupon}
                  placeholder="Promo code"
                  placeholderTextColor="rgba(0,0,0,0.45)"
                  autoCapitalize="characters"
                  style={s.couponInput}
                  returnKeyType="done"
                  onSubmitEditing={applyCoupon}
                />

                <Pressable
                  onPress={applyCoupon}
                  disabled={applyCouponMut.isPending}
                  style={({ pressed }) => [
                    s.couponBtn,
                    (pressed || applyCouponMut.isPending) && { opacity: 0.7 },
                  ]}
                >
                  <Text style={s.couponBtnText}>
                    {applyCouponMut.isPending ? "..." : "Apply"}
                  </Text>
                </Pressable>
              </View>

              {appliedCoupon ? (
  <View style={s.appliedRow}>
    <Text style={s.promoApplied}>Applied: {appliedCoupon}</Text>
    <Pressable
      onPress={clearCoupon}
      hitSlop={10}
      style={s.clearCouponHit}
    >
      <Text style={s.clearCouponText}>Remove</Text>
    </Pressable>
  </View>
) : null}

              <View style={{ height: 12 }} />

              <Text style={s.sectionTitle}>Order Summary</Text>

              <View style={{ marginTop: 8, gap: 8 }}>
                <Row label="Subtotal base" value={formatBRL(preview?.summary.subtotalBase || 0)} />
                <Row
                  label="Desconto produtos"
                  value={formatBRL(preview?.summary.discountProducts || 0)}
                />
                <Row
                  label="Subtotal após promo"
                  value={formatBRL(preview?.summary.subtotalAfterPromos || 0)}
                />
                <Row label="Cupom" value={formatBRL(preview?.summary.couponDiscount || 0)} />
                <Row label="Shipping" value={formatBRL(preview?.summary.shipping || 0)} />
                <View style={s.sep} />
                <Row label="Total" value={formatBRL(preview?.summary.total || 0)} bold />
              </View>

              <View style={{ height: 12 }} />

              <Pressable
                onPress={() => sendRequestMut.mutate()}
                disabled={sendRequestMut.isPending || !preview?.canCheckout}
                style={({ pressed }) => [
                  s.checkoutBtn,
                  (pressed || sendRequestMut.isPending || !preview?.canCheckout) && { opacity: 0.7 },
                ]}
              >
                <Text style={s.checkoutText}>
                  {sendRequestMut.isPending ? "Enviando..." : "Enviar para o salão"}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </Container>

      <IosAlert
        visible={!!modal}
        title={modal?.title}
        message={modal?.message}
        onClose={() => setModal(null)}
      />
    </Screen>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Text
        style={[
          { color: "rgba(0,0,0,0.7)", fontWeight: "700" },
          bold && { color: BLACK, fontWeight: "900" },
        ]}
      >
        {label}
      </Text>
      <Text style={[{ color: BLACK, fontWeight: "800" }, bold && { fontWeight: "900" }]}>
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: WHITE,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 6, minWidth: 80 },
  headerTitle: { color: BLACK, fontSize: 17, fontWeight: "600", letterSpacing: -0.3 },
  headerRight: { minWidth: 80 },
  chev: { fontSize: 28, lineHeight: 28, color: BLACK, marginTop: Platform.OS === "android" ? -2 : 0 },
  backText: { fontSize: 16, color: BLACK, fontWeight: "500" },

  rule: { height: 1, backgroundColor: LINE, marginBottom: 10 },
  sep: { height: 1, backgroundColor: LINE },

  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 14 },

  thumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LINE,
    overflow: "hidden",
    backgroundColor: WHITE,
  },
  thumbPh: { flex: 1, alignItems: "center", justifyContent: "center" },
  thumbPhText: { color: "rgba(0,0,0,0.45)", fontWeight: "700", fontSize: 11 },

  name: { color: BLACK, fontSize: 16, fontWeight: "800" },
  price: { color: BLACK, fontWeight: "800" },
  oldPrice: {
    color: "rgba(0,0,0,0.5)",
    fontWeight: "800",
    textDecorationLine: "line-through",
  },
  metaDiscount: {
    color: "rgba(0,0,0,0.6)",
    fontWeight: "700",
    fontSize: 12,
  },

  qtyWrap: {
    alignItems: "flex-end",
    gap: 6,
  },
  qtyControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: LINE,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WHITE,
  },
  qtyBtnText: {
    color: BLACK,
    fontWeight: "900",
    fontSize: 16,
    lineHeight: 18,
  },

  appliedRow: {
  marginTop: 10,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
},
promoApplied: {
  color: "rgba(0,0,0,0.65)",
  fontSize: 12,
  fontWeight: "700",
},
clearCouponHit: {
  paddingVertical: 6,
  paddingHorizontal: 10,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: LINE,
  backgroundColor: WHITE,
},
clearCouponText: {
  color: BLACK,
  fontSize: 12,
  fontWeight: "700",
},

  qtyPill: {
    minWidth: 36,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: LINE,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  qtyText: { color: BLACK, fontWeight: "900" },

  removeBtn: {
    paddingVertical: 2,
  },
  removeText: {
    color: "rgba(0,0,0,0.65)",
    fontWeight: "800",
    fontSize: 12,
  },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: WHITE,
  },
  footerRule: { height: 1, backgroundColor: LINE, marginBottom: 12 },

  sectionTitle: { color: "rgba(0,0,0,0.75)", fontWeight: "800", fontSize: 13 },

  warningText: {
    color: "rgba(0,0,0,0.7)",
    fontWeight: "700",
    fontSize: 12,
  },

  couponInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: WHITE,
    color: BLACK,
    fontWeight: "700",
  },
  couponBtn: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
  },
  couponBtnText: { color: BLACK, fontWeight: "900" },

  checkoutBtn: {
    marginTop: 10,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BLACK,
  },
  checkoutText: { color: WHITE, fontWeight: "900", fontSize: 18, letterSpacing: -0.2 },
});