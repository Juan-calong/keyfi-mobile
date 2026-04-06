import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import {
  QueryKey,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "../../../core/api/client";
import { endpoints } from "../../../core/api/endpoints";
import type { ToggleFavoriteResponse } from "./productDetails.types";

type Props = {
  productId: string;
  initialFavorited?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  size?: number;
  activeColor?: string;
  inactiveColor?: string;
  loaderColor?: string;
};

const RELEVANT_QUERY_ROOTS = new Set([
  "customer-favorites",
  "owner-favorites",
  "customer-products",
  "owner-products",
  "customer-home-products",
  "owner-home-products",
  "customer-home-promos-preview",
  "owner-home-promos-preview",
  "customer-promos-active",
  "owner-promos-active",
  "product",
]);

function getQueryRoot(queryKey: QueryKey) {
  return Array.isArray(queryKey) ? String(queryKey[0] ?? "") : "";
}

function isRelevantFavoriteQuery(queryKey: QueryKey, productId: string) {
  const root = getQueryRoot(queryKey);

  if (!RELEVANT_QUERY_ROOTS.has(root)) return false;

  if (root === "product") {
    return Array.isArray(queryKey) && String(queryKey[1] ?? "") === productId;
  }

  return true;
}

function patchItemFavorite<T extends Record<string, any>>(
  item: T,
  productId: string,
  favorited: boolean
): T {
  if (!item || typeof item !== "object") return item;

  const currentId = String(item.id ?? item.productId ?? "");
  if (currentId !== productId) return item;

  const currentFavoritesCount =
    typeof item.favoritesCount === "number" ? item.favoritesCount : undefined;

  return {
    ...item,
    isFavorite: favorited,
    favorited,
    favoritesCount:
      currentFavoritesCount == null
        ? currentFavoritesCount
        : Math.max(
            0,
            currentFavoritesCount + (favorited ? 1 : -1)
          ),
  };
}

function patchFavoriteData(
  data: any,
  productId: string,
  favorited: boolean,
  queryKey: QueryKey
) {
  if (data == null) return data;

  const root = getQueryRoot(queryKey);
  const isFavoritesList =
    root === "customer-favorites" || root === "owner-favorites";

  if (Array.isArray(data)) {
    const next = data
      .map((item) => patchItemFavorite(item, productId, favorited))
      .filter((item) => {
        if (!isFavoritesList) return true;
        const id = String(item?.id ?? item?.productId ?? "");
        return favorited || id !== productId;
      });

    return next;
  }

  if (Array.isArray(data?.items)) {
    const nextItems = data.items
      .map((item: any) => patchItemFavorite(item, productId, favorited))
      .filter((item: any) => {
        if (!isFavoritesList) return true;
        const id = String(item?.id ?? item?.productId ?? "");
        return favorited || id !== productId;
      });

    return {
      ...data,
      items: nextItems,
      total:
        typeof data.total === "number"
          ? nextItems.length
          : data.total,
    };
  }

  if (Array.isArray(data?.data?.items)) {
    const nextItems = data.data.items
      .map((item: any) => patchItemFavorite(item, productId, favorited))
      .filter((item: any) => {
        if (!isFavoritesList) return true;
        const id = String(item?.id ?? item?.productId ?? "");
        return favorited || id !== productId;
      });

    return {
      ...data,
      data: {
        ...data.data,
        items: nextItems,
        total:
          typeof data?.data?.total === "number"
            ? nextItems.length
            : data?.data?.total,
      },
    };
  }

  if (typeof data === "object") {
    return patchItemFavorite(data, productId, favorited);
  }

  return data;
}

export function ProductFavoriteButton({
  productId,
  initialFavorited = false,
  containerStyle,
  size = 20,
  activeColor = "#E11D48",
  inactiveColor = "#2E2A29",
  loaderColor = "#E11D48",
}: Props) {
  const queryClient = useQueryClient();
  const [favorited, setFavorited] = useState(Boolean(initialFavorited));

  const queryPredicate = useMemo(
    () => ({
      predicate: (query: { queryKey: QueryKey }) =>
        isRelevantFavoriteQuery(query.queryKey, productId),
    }),
    [productId]
  );

  const toggleMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<ToggleFavoriteResponse>(
        endpoints.products.favorite(productId)
      );
      return res.data;
    },

    onMutate: async () => {
      const nextFavorited = !favorited;

      setFavorited(nextFavorited);

      await queryClient.cancelQueries(queryPredicate);

      const previousEntries = queryClient.getQueriesData({
        predicate: (query) => isRelevantFavoriteQuery(query.queryKey, productId),
      });

      previousEntries.forEach(([queryKey, oldData]) => {
        queryClient.setQueryData(queryKey, (current: any) =>
          patchFavoriteData(
            current ?? oldData,
            productId,
            nextFavorited,
            queryKey
          )
        );
      });

      return {
        previousEntries,
        previousFavorited: favorited,
      };
    },

    onSuccess: async (data) => {
      const confirmedFavorited = Boolean(data?.favorited);
      setFavorited(confirmedFavorited);

      const entries = queryClient.getQueriesData({
        predicate: (query) => isRelevantFavoriteQuery(query.queryKey, productId),
      });

      entries.forEach(([queryKey]) => {
        queryClient.setQueryData(queryKey, (current: any) =>
          patchFavoriteData(current, productId, confirmedFavorited, queryKey)
        );
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["customer-favorites"] }),
        queryClient.invalidateQueries({ queryKey: ["owner-favorites"] }),
        queryClient.invalidateQueries({ queryKey: ["customer-home-products"] }),
        queryClient.invalidateQueries({ queryKey: ["owner-home-products"] }),
        queryClient.invalidateQueries({ queryKey: ["customer-home-promos-preview"] }),
        queryClient.invalidateQueries({ queryKey: ["owner-home-promos-preview"] }),
        queryClient.invalidateQueries({ queryKey: ["customer-products"] }),
        queryClient.invalidateQueries({ queryKey: ["owner-products"] }),
        queryClient.invalidateQueries({ queryKey: ["product"] }),
      ]);
    },

    onError: (_error, _vars, context) => {
      setFavorited(Boolean(context?.previousFavorited));

      context?.previousEntries?.forEach(
        ([queryKey, oldData]: [QueryKey, any]) => {
          queryClient.setQueryData(queryKey, oldData);
        }
      );
    },
  });

  useEffect(() => {
    setFavorited(Boolean(initialFavorited));
  }, [initialFavorited]);

  return (
    <Pressable
      onPress={(e) => {
        e.stopPropagation?.();
        if (toggleMutation.isPending) return;
        toggleMutation.mutate();
      }}
      hitSlop={10}
      style={({ pressed }) => [
        styles.button,
        containerStyle,
        pressed && styles.buttonPressed,
      ]}
    >
      {toggleMutation.isPending ? (
        <ActivityIndicator size="small" color={loaderColor} />
      ) : (
        <Icon
          name={favorited ? "heart" : "heart-outline"}
          size={size}
          color={favorited ? activeColor : inactiveColor}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.7,
  },
});