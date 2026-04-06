import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActivityIndicator, Linking, View } from "react-native";
import { Airbridge } from "airbridge-react-native-sdk";
import { applyPendingInvite } from "./src/core/referrals/applyPendingInvite.service";

import { useAuthStore } from "./src/stores/auth.store";
import { RootNavigator } from "./src/navigation/RootNavigator";
import {
  bindForegroundPushListener,
  bindPushOpenListener,
  bindPushTokenRefresh,
  handleInitialPushOpen,
  registerPushTokenWithBackend,
} from "./src/core/push/push.service";
import {
  parseInviteFromUrl,
  savePendingInvite,
} from "./src/core/airbridge/invite-link.service";

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

async function handleInviteUrl(url: string) {
  const safeUrl = String(url || "").trim();
  if (!safeUrl) return;

  if (!safeUrl.startsWith("keyfi://mp-connected")) return;

  const invite = parseInviteFromUrl(safeUrl);

  if (invite) {
    const { hydrated, token } = useAuthStore.getState();

    await savePendingInvite(invite);

    console.log("[AIRBRIDGE][INVITE][SAVED]", {
      inviteType: invite.inviteType,
      tokenPreview: `${invite.token.slice(0, 6)}...`,
      receivedAt: invite.receivedAt,
      hydrated,
      hasAuthToken: !!token,
    });

    if (hydrated && token) {
      try {
        const result = await applyPendingInvite();
        console.log("[AIRBRIDGE][INVITE][APPLY_IMMEDIATE_RESULT]", result);
      } catch (e) {
        console.log("[AIRBRIDGE][INVITE][APPLY_IMMEDIATE_ERROR]", e);
      }
    } else {
      console.log("[AIRBRIDGE][INVITE][DEFERRED_UNTIL_AUTH]", {
        hydrated,
        hasAuthToken: !!token,
      });
    }
  } else {
    console.log("[AIRBRIDGE][INVITE][IGNORED_URL]", safeUrl);
  }

  queryClient.invalidateQueries({ queryKey: ["me"] });
}

export default function App() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.activeRole);

  useEffect(() => {
    useAuthStore.getState().hydrate();
  }, []);

  useEffect(() => {
    Airbridge.setOnDeeplinkReceived((url) => {
      handleInviteUrl(url).catch((e) => {
        console.log("[AIRBRIDGE][DEEPLINK][ERROR]", e);
      });
    });

    const sub = Linking.addEventListener("url", (evt) => {
      handleInviteUrl(evt?.url || "").catch((e) => {
        console.log("[LINKING][URL][ERROR]", e);
      });
    });

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleInviteUrl(url).catch((e) => {
          console.log("[LINKING][INITIAL_URL][ERROR]", e);
        });
      }
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!hydrated || !token) return;

    registerPushTokenWithBackend().catch((e) => {
      console.log("[PUSH][REGISTER][ERROR]", e);
    });

    applyPendingInvite().catch((e) => {
      console.log("[REFERRAL][APPLY_PENDING][ERROR]", e);
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