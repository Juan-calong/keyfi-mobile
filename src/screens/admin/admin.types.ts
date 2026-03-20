export type Product = {
    id: string;
    sku: string;
    name: string;
    description?: string | null;
    price: string;
    active: boolean;
    stock?: number | null;
    createdAt: string;
    updatedAt: string;
    categoryId?: string | null;
};

export type OrderListItem = {
    id: string;
    code: string;
    status: string;
    paymentStatus: string;
    adminApprovalStatus: string;
    totalAmount: string;
    createdAt: string;
    salon?: { id: string; name: string } | null;
};

export type OrderDetail = OrderListItem & {
    items: Array<{
        id: string;
        qty: number;
        unitPrice: string;
        total: string;
        product: { id: string; name: string; sku: string };
    }>;
};

export type PermissionItem = {
    id: string;
    status: string;
    createdAt: string;
    salon: { id: string; name: string; cnpj: string };
    seller: { id: string; user: { id: string; name: string; email: string } };
};

export type PayoutItem = {
    id: string;
    amount: string;
    status: string;
    createdAt: string;
    decidedAt?: string | null;
    wallet: {
        id: string;
        ownerType: string;
        sellerId?: string | null;
        salonId?: string | null;
    };
};

export type TabKey = "PRODUCTS" | "APPROVALS" | "PERMISSIONS" | "PAYOUTS";
