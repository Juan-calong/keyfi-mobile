import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { s } from "./cart.shared.styles";
import { formatBRL, toNumberBR } from "./cart.shared.utils";
import type { CartPreviewItem } from "./cart.shared.types";

type Props = {
  row: CartPreviewItem;
  onOpenProduct: (productId: string) => void;
  onInc: (productId: string) => void;
  onDec: (productId: string) => void;
  onRemove: (productId: string) => void;
};

export function OwnerCustomerCartRow({
  row,
  onOpenProduct,
  onInc,
  onDec,
  onRemove,
}: Props) {
  const base = toNumberBR(row.unitPriceBase ?? "0");
  const final = toNumberBR(row.unitPriceFinal ?? row.unitPriceBase ?? "0");
  const hasPromo = final < base;
  const variant = (row.product?.sku && String(row.product.sku)) || "—";
  const quantityDiscountLabel = String(row.quantityDiscount?.label ?? "").trim();
  const quantityDiscountPerUnit = toNumberBR(row.quantityDiscount?.discountPerUnit ?? "0");

  const stop = (e?: any) => e?.stopPropagation?.();

  return (
    <Pressable onPress={() => onOpenProduct(row.productId)} style={s.row}>
      <View style={s.thumbWrap}>
        {row.product?.imageUrl ? (
          <Image
            source={{ uri: row.product.imageUrl }}
            style={s.thumb}
            resizeMode="contain"
          />
        ) : (
          <View style={s.thumbPh}>
            <Text style={s.thumbPhText}>Sem imagem</Text>
          </View>
        )}
      </View>

      <View style={s.rowMiddle}>
        <Text numberOfLines={1} style={s.itemName}>
          {row.product?.name || "—"}
        </Text>

        <Text numberOfLines={1} style={s.itemVariant}>
          {variant}
        </Text>
          {row.quantityDiscount?.applied ? (
          <Text numberOfLines={2} style={s.itemQuantityDiscount}>
            {quantityDiscountLabel ||
              (quantityDiscountPerUnit > 0
                ? `Desconto por quantidade: ${formatBRL(quantityDiscountPerUnit)} por unidade`
                : "Desconto por quantidade aplicado")}
          </Text>
        ) : null}
      </View>

      <View style={s.rowRight}>
        <View style={s.priceStack}>
          <Text style={s.price}>{formatBRL(final)}</Text>
          {hasPromo ? <Text style={s.oldPrice}>{formatBRL(base)}</Text> : null}
        </View>

        <View style={s.stepper} onStartShouldSetResponder={() => true}>
          <Pressable
            onPress={(e) => {
              stop(e);
              onDec(row.productId);
            }}
            hitSlop={10}
            style={s.stepperBtn}
          >
            <Text style={s.stepperSymbol}>−</Text>
          </Pressable>

          <View style={s.stepperMid}>
            <Text style={s.stepperQty}>{row.qty}</Text>
          </View>

          <Pressable
            onPress={(e) => {
              stop(e);
              onInc(row.productId);
            }}
            hitSlop={10}
            style={s.stepperBtn}
          >
            <Text style={s.stepperSymbol}>+</Text>
          </Pressable>
        </View>
      </View>

      <Pressable
        onPress={(e) => {
          stop(e);
          onRemove(row.productId);
        }}
        hitSlop={10}
        style={s.removeHit}
      >
        <Text style={s.removeX}>×</Text>
      </Pressable>
    </Pressable>
  );
}