import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AdminProductFormScreen } from "../screens/admin/AdminProductFormScreen";
import { AdminStockAdjustScreen } from "../screens/admin/AdminStockAdjustScreen";
import { AdminOrderDetailsScreen } from "../screens/admin/AdminOrdersScreen";
import { AdminCategoriesScreen } from "../screens/admin/AdminCategoriesScreen";
import { AdminDashboardScreen } from "../screens/admin/AdminDashboardScreen";

import { ADMIN_SCREENS, AdminStackParamList } from "./admin.routes";

const Stack = createNativeStackNavigator<AdminStackParamList>();

export function AdminStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name={ADMIN_SCREENS.Dashboard} component={AdminDashboardScreen} />

            <Stack.Screen name={ADMIN_SCREENS.Categories} component={AdminCategoriesScreen} />
            <Stack.Screen name={ADMIN_SCREENS.ProductForm} component={AdminProductFormScreen} />
            <Stack.Screen name={ADMIN_SCREENS.OrderDetails} component={AdminOrderDetailsScreen} />
            <Stack.Screen name={ADMIN_SCREENS.StockAdjust} component={AdminStockAdjustScreen} />
        </Stack.Navigator>
    );
}
