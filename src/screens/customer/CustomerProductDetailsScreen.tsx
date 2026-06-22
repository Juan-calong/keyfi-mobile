import React from "react";
import { Alert } from "react-native";
import { CommonActions, useNavigation, useRoute } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";

import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";
import { CUSTOMER_SCREENS } from "../../navigation/customer.routes";
import { useAuthStore } from "../../stores/auth.store";
import { usePersistentCart } from "../../core/api/hooks/usePersistentCart";
import { friendlyError } from "../../core/errors/friendlyError";

import type {
  Product,
  RelatedProduct,
} from "../../features/components/product-details/productDetails.types";
import { SharedProductDetails } from "../../features/components/product-details/SharedProductDetails";

export function CustomerProductDetailsScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();

  const token = useAuthStore((state) => state.token);
  const activeRole = useAuthStore((state) => state.activeRole);
  const { cart, addItemMutation, setItemQtyMutation, removeItemMutation } = usePersistentCart({ token, activeRole });

  const productId = route.params?.productId as string | undefined;
  const intent = route.params?.intent as string | undefined;

  const q = useQuery({
    queryKey: ["customer-product", productId],
    enabled: !!productId,
    queryFn: async () =>
      (await api.get<Product>(endpoints.products.byId(productId!))).data,
    retry: false,
  });

  const relatedQ = useQuery({
    queryKey: ["customer-product-related", productId],
    enabled: !!productId,
    queryFn: async () => {
      const res = await api.get<any>(endpoints.products.related(productId!), {
        params: { take: 6 },
      });

      if (Array.isArray(res.data)) return res.data as RelatedProduct[];
      if (Array.isArray(res.data?.items)) return res.data.items as RelatedProduct[];
      if (Array.isArray(res.data?.data)) return res.data.data as RelatedProduct[];

      return [];
    },
    retry: false,
  });

  const product = q.data;
    React.useEffect(() => {
    if (intent !== "REVIEW" || !product?.id) return;
    Alert.alert("Avalie este produto", "Role até a seção de avaliações e comentários para enviar sua avaliação.");
  }, [intent, product?.id]);
  const qtyInCart = product ? (cart.items.find((item) => item.productId === product.id)?.qty ?? 0) : 0;
  const isProductInCart = (candidateProductId: string) =>
    cart.items.some((item) => item.productId === candidateProductId && item.qty > 0);

  return (
    <SharedProductDetails
      product={product}
      productQuery={{
        isLoading: q.isLoading,
        isError: q.isError,
        refetch: () => q.refetch(),
      }}
      relatedQuery={{
        isLoading: relatedQ.isLoading,
        isError: relatedQ.isError,
      }}
      relatedItems={relatedQ.data ?? []}
      qtyInCart={qtyInCart}
      isProductInCart={isProductInCart}
      allowVideos={false}
      viewerMode="CUSTOMER"
      onBack={() => nav.goBack()}
      onAddToCart={(id) => addItemMutation.mutate({ productId: id, qty: 1 }, { onError: (e: any) => Alert.alert("Erro", friendlyError(e).message) })}
      onDecreaseCartItem={(id, nextQty) =>
        setItemQtyMutation.mutate({ productId: id, payload: { qty: nextQty } }, { onError: (e: any) => Alert.alert("Erro", friendlyError(e).message) })
      }
      onRemoveFromCart={(id) => removeItemMutation.mutate(id, { onError: (e: any) => Alert.alert("Erro", friendlyError(e).message) })}
      onGoToCart={() => {
        nav.dispatch(
          CommonActions.navigate({
            name: CUSTOMER_SCREENS.Root,
            params: {
              screen: CUSTOMER_SCREENS.Tabs,
              params: { screen: CUSTOMER_SCREENS.Cart },
            },
          })
        );
      }}
      onOpenRelatedProduct={(nextProductId) => {
        if (!nextProductId) return;
        nav.navigate(CUSTOMER_SCREENS.ProductDetails, {
          productId: nextProductId,
        });
      }}
    />
  );
}
