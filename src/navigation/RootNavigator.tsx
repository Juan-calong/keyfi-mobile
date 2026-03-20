import React from "react";
import { useAuthStore } from "../stores/auth.store";

import { AuthStack } from "./AuthStack";
import { AdminStack } from "./AdminStack";
import { ChooseRoleScreen } from "../screens/onboarding/ChooseRoleScreen";
import { OwnerStack } from "./OwnerStack";
import { SellerStack } from "./SellerStack";
import { SellerPendingStack } from "./SellerPendingStack";
import { CustomerStack } from "./CustomerStack";

export function RootNavigator() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.activeRole);
  const needsOnboarding = useAuthStore((s) => s.needsOnboarding);

  if (!hydrated) return null;
  if (!token) return <AuthStack />;

  if (needsOnboarding) return <ChooseRoleScreen />;

  if (role === "PENDING") return <SellerPendingStack />;
  if (role === "ADMIN") return <AdminStack />;
  if (role === "SELLER") return <SellerStack />;
  if (role === "SALON_OWNER") return <OwnerStack />;
  if (role === "CUSTOMER") return <CustomerStack />;

  return <AuthStack />;
}