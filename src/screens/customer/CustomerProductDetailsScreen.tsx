import React from "react";
import { CommonActions, useNavigation, useRoute } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";

import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";
import { CUSTOMER_SCREENS } from "../../navigation/customer.routes";
import { useCartStore } from "../../stores/cart.store";

import type {
  Product,
  RelatedProduct,
} from "../../features/components/product-details/productDetails.types";
import { SharedProductDetails } from "../../features/components/product-details/SharedProductDetails";

export function CustomerProductDetailsScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();

  const qtyById = useCartStore((state) => state.qtyById);
  const cartInc = useCartStore((state) => state.inc);
  const cartRemove = useCartStore((state) => state.remove);

  const productId = route.params?.productId as string | undefined;

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
  const qtyInCart = product ? (qtyById?.[product.id] ?? 0) : 0;

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
      allowVideos={false}
      viewerMode="CUSTOMER"
      onBack={() => nav.goBack()}
      onAddToCart={(id) => cartInc(id, 1)}
      onRemoveFromCart={(id) => cartRemove(id)}
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