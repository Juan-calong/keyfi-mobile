// src/ui/components/CouponBox.tsx
import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { validateCoupon } from "../../core/api/coupons";
import { useCartStore } from "../../stores/cart.store";
import { t } from "../tokens";

export function CouponBox() {
  const qtyById = useCartStore((s) => s.qtyById);
  const couponCode = useCartStore((s) => s.couponCode);
  const setCouponCode = useCartStore((s) => s.setCouponCode);
  const clearCoupon = useCartStore((s) => s.clearCoupon);
  const setPricing = useCartStore((s) => s.setPricing);

  const [code, setCode] = useState(couponCode);

  const items = useMemo(() => {
    const out: Array<{ productId: string; qty: number }> = [];
    for (const [productId, qty] of Object.entries(qtyById || {})) {
      if (qty > 0) out.push({ productId, qty });
    }
    return out;
  }, [qtyById]);

  const m = useMutation({
    mutationFn: async () => {
      const body = {
        couponCode: code.trim() ? code.trim().toUpperCase() : null,
        items,
      };
      return validateCoupon(body);
    },
    onSuccess: (res) => {
      setPricing(res);
      setCode(res.coupon?.code || "");
      setCouponCode(res.coupon?.code || "");
    },
  });

  const applied = !!couponCode;

  return (
    <View style={{ borderWidth: 1, borderColor: t.colors.border, borderRadius: 12, padding: 12, gap: 10 }}>
      <Text style={{ fontSize: 16, fontWeight: "800", color: t.colors.text }}>Cupom</Text>

      {applied ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: t.colors.text }}>
            Aplicado: <Text style={{ fontWeight: "900" }}>{couponCode}</Text>
          </Text>

          <Pressable
            onPress={() => {
              clearCoupon();
              setCode("");
            }}
            style={{ alignSelf: "flex-start", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: t.colors.danger }}
          >
            <Text style={{ color: t.colors.danger, fontWeight: "800" }}>Remover cupom</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="PROMO10"
              placeholderTextColor={t.colors.muted}
              autoCapitalize="characters"
              style={{ flex: 1, borderWidth: 1, borderColor: t.colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: t.colors.text }}
            />
            <Pressable
              disabled={m.isPending || items.length === 0 || code.trim().length < 3}
              onPress={() => m.mutate()}
              style={{
                paddingHorizontal: 14,
                justifyContent: "center",
                borderRadius: 10,
                opacity: m.isPending || items.length === 0 || code.trim().length < 3 ? 0.5 : 1,
                backgroundColor: t.colors.primary,
              }}
            >
              {m.isPending ? <ActivityIndicator /> : <Text style={{ color: "white", fontWeight: "900" }}>Aplicar</Text>}
            </Pressable>
          </View>

          {!!m.error && (
            <Text style={{ color: t.colors.danger }}>
              Cupom inválido ou não aplicável.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
