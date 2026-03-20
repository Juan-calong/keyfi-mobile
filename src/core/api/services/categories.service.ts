import { api } from "../client";

export type Category = {
    id: string;
    name: string;
    active: boolean;
    createdAt?: string;
    updatedAt?: string;
};

type ListResp = { items: Category[] } | Category[];

function asItems(v: any): Category[] {
    if (Array.isArray(v)) return v;
    if (Array.isArray(v?.items)) return v.items;
    return [];
}

export const CategoriesService = {
    list: async (params?: { active?: "true" | "false" }) => {
        const res = await api.get("/categories", { params });
        return asItems(res.data);
    },

    create: async (name: string) => {
        const res = await api.post("/categories", { name });
        return res.data as Category;
    },

    update: async (id: string, patch: { name?: string; active?: boolean }) => {
        const res = await api.patch(`/categories/${id}`, patch);
        return res.data as Category;
    },
};
