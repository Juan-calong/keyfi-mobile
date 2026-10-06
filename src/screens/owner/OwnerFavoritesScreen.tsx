import React from "react";
import { useFavoritesList } from "../../features/favorites/useFavoritesList";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { OWNER_SCREENS, OwnerStackParamList } from "../../navigation/owner.routes";
import {  SharedFavoritesScreen,
} from "../../features/favorites/components/SharedFavoritesScreen";


type NavProp = NativeStackNavigationProp<OwnerStackParamList>;

export function OwnerFavoritesScreen() {
  const navigation = useNavigation<NavProp>();

  const favoritesQuery = useFavoritesList();
  const items = favoritesQuery.items;

  
  return (
      <SharedFavoritesScreen
      title="Seus Favoritos"
      subtitle="Os produtos que você marcou com coração aparecem aqui."
      items={items}
      total={favoritesQuery.total}
      hasMore={favoritesQuery.hasMore}
      isReconciling={favoritesQuery.isReconciling}
      isFetchingNextPage={favoritesQuery.isFetchingNextPage}
      onLoadMore={() => { favoritesQuery.fetchNextPage(); }}
      isLoading={favoritesQuery.isLoading}
      isError={favoritesQuery.isError}
      onRetry={() => { favoritesQuery.retry(); }}
      onExploreProducts={() => navigation.navigate(OWNER_SCREENS.Buy)}
      onOpenProduct={(item) =>
        navigation.navigate(OWNER_SCREENS.ProductDetails, {
          productId: item.id,
        })
      }
    />
  );
}