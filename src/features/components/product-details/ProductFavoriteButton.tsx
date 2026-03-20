import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "../../../core/api/client";
import { endpoints } from "../../../core/api/endpoints";
import type { ToggleFavoriteResponse } from "./productDetails.types";
import { s } from "./productDetails.styles";

type Props = {
  productId: string;
  initialFavorited?: boolean;
};

export function ProductFavoriteButton({
  productId,
  initialFavorited = false,
}: Props) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const queryClient = useQueryClient();

  useEffect(() => {
    setFavorited(initialFavorited);
  }, [initialFavorited]);

  const toggleMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<ToggleFavoriteResponse>(
        endpoints.products.favorite(productId)
      );
      return res.data;
    },
    onSuccess: (data) => {
      setFavorited(Boolean(data.favorited));

      queryClient.invalidateQueries({ queryKey: ["customer-favorites"] });
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  return (
    <Pressable
      onPress={() => {
        if (toggleMutation.isPending) return;
        toggleMutation.mutate();
      }}
      hitSlop={10}
      style={({ pressed }) => [
        s.favoriteIconButton,
        pressed && s.favoriteIconButtonPressed,
      ]}
    >
      {toggleMutation.isPending ? (
        <View style={s.favoriteLoaderWrap}>
          <ActivityIndicator size="small" color="#E11D48" />
        </View>
      ) : (
        <Icon
          name={favorited ? "heart" : "heart-outline"}
          size={24}
          color="#E11D48"
        />
      )}
    </Pressable>
  );
}