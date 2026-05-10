import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";
import { OWNER_SCREENS, OwnerStackParamList } from "../../navigation/owner.routes";
import {  FavoriteItemBase,
  SharedFavoritesScreen,
} from "../../features/favorites/components/SharedFavoritesScreen";


type NavProp = NativeStackNavigationProp<OwnerStackParamList>;

type FavoritesResponse = {
  items: FavoriteItemBase[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

export function OwnerFavoritesScreen() {
  const navigation = useNavigation<NavProp>();

  const favoritesQuery = useQuery({
    queryKey: ["owner-favorites"],
    queryFn: async () => {
      const res = await api.get<FavoritesResponse>(endpoints.products.favorites);
      return res.data;
    },
  });

  const items = favoritesQuery.data?.items ?? [];

  
  return (
      <SharedFavoritesScreen
      title="Seus Favoritos"
      subtitle="Os produtos que você marcou com coração aparecem aqui."
      items={items}
      isLoading={favoritesQuery.isLoading}
      isError={favoritesQuery.isError}
      onRetry={() => favoritesQuery.refetch()}
      onExploreProducts={() => navigation.navigate(OWNER_SCREENS.Buy)}
      onOpenProduct={(item) =>
        navigation.navigate(OWNER_SCREENS.ProductDetails, {
          productId: item.id,
        })
      }
    />
  );
}