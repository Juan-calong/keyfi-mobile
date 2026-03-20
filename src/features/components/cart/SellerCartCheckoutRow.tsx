import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { formatBRL, toNumberBR } from "./cart.shared.utils";

type SellerPreviewLineLike = {
  productId: string;
  qty?: number;
  _img?: string | null;
  _name?: string;
  unitPriceFinal: string | number;
  unitPriceBase: string | number;
  lineCouponDiscount?: string | number;
};

type Props = {
  item: SellerPreviewLineLike;
  qty: number;
  s: any;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
};

export function SellerCartCheckoutRow({
  item,
  qty,
  s,
  onDecrease,
  onIncrease,
  onRemove,
}: Props) {
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
          <Text style={s.price}>{formatBRL(toNumberBR(item.unitPriceFinal))}</Text>

          {toNumberBR(item.unitPriceFinal) < toNumberBR(item.unitPriceBase) ? (
            <Text style={s.oldPrice}>{formatBRL(toNumberBR(item.unitPriceBase))}</Text>
          ) : null}
        </View>

        {!!item.lineCouponDiscount && toNumberBR(item.lineCouponDiscount) > 0 ? (
          <Text style={s.metaDiscount}>
            Cupom: -{formatBRL(toNumberBR(item.lineCouponDiscount))}
          </Text>
        ) : null}
      </View>

      <View style={s.qtyWrap}>
        <View style={s.qtyControls}>
          <Pressable
            onPress={onDecrease}
            style={({ pressed }) => [s.qtyBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={s.qtyBtnText}>−</Text>
          </Pressable>

          <View style={s.qtyPill}>
            <Text style={s.qtyText}>{qty}</Text>
          </View>

          <Pressable
            onPress={onIncrease}
            style={({ pressed }) => [s.qtyBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={s.qtyBtnText}>+</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={onRemove}
          hitSlop={8}
          style={({ pressed }) => [s.removeBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={s.removeText}>Remove</Text>
        </Pressable>
      </View>
    </View>
  );
}