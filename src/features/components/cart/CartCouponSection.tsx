import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { s } from "./cart.shared.styles";

type Props = {
  promoInput: string;
  onChangePromoInput: (value: string) => void;
  onApplyCoupon: () => void;
  applyCouponPending?: boolean;
  appliedCoupon?: string | null;
  onRemoveCoupon?: () => void;
  disabled?: boolean;
  compact?: boolean;
};

export function CartCouponSection({
  promoInput,
  onChangePromoInput,
  onApplyCoupon,
  applyCouponPending = false,
  appliedCoupon,
  onRemoveCoupon,
  disabled = false,
  compact = false,
}: Props) {
  return (
    <View style={[s.section, compact && s.sectionCompact]}>
      <Text style={s.sectionLabel}>Código promocional</Text>

      <View style={s.promoRow}>
        <TextInput
          value={promoInput}
          onChangeText={onChangePromoInput}
          placeholder="Código promocional"
          placeholderTextColor="#00000066"
          autoCapitalize="characters"
          style={s.promoInput}
          returnKeyType="done"
          onSubmitEditing={onApplyCoupon}
        />

        <Pressable
          onPress={onApplyCoupon}
          style={({ pressed }) => [
            s.promoBtn,
            pressed && { opacity: 0.75 },
            applyCouponPending && { opacity: 0.55 },
          ]}
          hitSlop={10}
          disabled={applyCouponPending || disabled}
        >
          <Text style={s.promoBtnText}>
            {applyCouponPending ? "..." : "Aplicar"}
          </Text>
        </Pressable>
      </View>

      {!!appliedCoupon && !applyCouponPending ? (
        <View style={s.appliedRow}>
          <Text style={s.promoApplied}>Aplicado: {appliedCoupon}</Text>

          <Pressable
            onPress={onRemoveCoupon}
            hitSlop={10}
            style={s.clearCouponHit}
          >
            <Text style={s.clearCouponText}>Remover</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}