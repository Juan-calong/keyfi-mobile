export const ADMIN_SCREENS = {
    Dashboard: "AdminDashboard",
    Orders: "AdminOrders",
    ProductForm: "AdminProductForm",
    StockAdjust: "AdminStockAdjust",
    OrderDetails: "AdminOrderDetails",
    Categories: "AdminCategories",
} as const;

export type AdminStackParamList = {
    AdminDashboard: undefined;
    AdminOrders: undefined;

    AdminProductForm:
    | { mode: "create" }
    | { mode: "edit"; product: any };

    AdminStockAdjust: { productId: string };
    AdminOrderDetails: { orderId: string };
    AdminCategories: undefined;
};
