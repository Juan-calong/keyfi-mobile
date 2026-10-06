import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "../core/queries/queryClient";
export { queryClient } from "../core/queries/queryClient";

export function AppProviders({ children }: { children: React.ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            <NavigationContainer>{children}</NavigationContainer>
        </QueryClientProvider>
    );
}
