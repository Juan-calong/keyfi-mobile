// src/core/queries/salonHome.queries.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";

export type ProductDTO = {
    id: string;
    sku: string;
    name: string;
    price: string; // Decimal -> string
    stock: number;
    active: boolean;
    primaryImageUrl?: string | null;
    images?: { url: string; isPrimary?: boolean; sort?: number }[];
};

export type ProductsResponse = {
    items: ProductDTO[];
    nextCursor: string | null;
};

export type PromoDTO = {
    id: string;
    title: string;
    type: "PCT" | "VALUE"; // ajuste se tiver mais
    value: string;         // Decimal -> string
    startsAt: string;
    endsAt: string | null;
};

export type ActivePromoItemDTO = {
    promo: PromoDTO;
    product: Pick<ProductDTO, "id" | "sku" | "name" | "price" | "stock" | "active" | "images" | "primaryImageUrl">;
};

export type ActivePromosResponse = {
    items: ActivePromoItemDTO[];
    take?: number;
};

export function useSalonProducts() {
    return useQuery({
        queryKey: ["salon", "products"],
        queryFn: async () => {
            const { data } = await api.get<ProductsResponse>(endpoints.products.list);
            return data;
        },
        staleTime: 30_000,
    });
}

export function useSalonActivePromos() {
    return useQuery({
        queryKey: ["salon", "promosActive"],
        queryFn: async () => {
            const { data } = await api.get<ActivePromosResponse>(endpoints.products.promosActive);
            return data;
        },
        staleTime: 30_000,
    });
}
