import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActivityIndicator, Linking, View } from "react-native";

import { useAuthStore } from "./src/stores/auth.store";
import { RootNavigator } from "./src/navigation/RootNavigator";
import {
  bindForegroundPushListener,
  bindPushOpenListener,
  bindPushTokenRefresh,
  handleInitialPushOpen,
  registerPushTokenWithBackend,
} from "./src/core/push/push.service";

const queryClient = new QueryClient();

function BootScreen() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ActivityIndicator size="large" />
    </View>
  );
}

export default function App() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.activeRole);

  useEffect(() => {
    useAuthStore.getState().hydrate();
  }, []);

  useEffect(() => {
    const sub = Linking.addEventListener("url", (evt) => {
      const url = evt?.url || "";
      if (url.startsWith("keyfi://mp-connected")) {
        queryClient.invalidateQueries({ queryKey: ["me"] });
      }
    });

    Linking.getInitialURL().then((url) => {
      if (url && url.startsWith("keyfi://mp-connected")) {
        queryClient.invalidateQueries({ queryKey: ["me"] });
      }
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!hydrated || !token) return;

    registerPushTokenWithBackend().catch((e) => {
      console.log("[PUSH][REGISTER][ERROR]", e);
    });

    const unsubTokenRefresh = bindPushTokenRefresh();
    const unsubForeground = bindForegroundPushListener();
    const unsubOpen = bindPushOpenListener();

    handleInitialPushOpen().catch((e) => {
      console.log("[PUSH][INITIAL_OPEN][ERROR]", e);
    });

    return () => {
      unsubTokenRefresh();
      unsubForeground();
      unsubOpen();
    };
  }, [hydrated, token]);

  if (!hydrated) {
    return (
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <BootScreen />
        </QueryClientProvider>
      </SafeAreaProvider>
    );
  }

  const navKey = `${token ? "in" : "out"}:${role ?? "none"}`;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer key={navKey}>
          <RootNavigator />
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}