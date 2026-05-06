import React, { useEffect } from "react";
import { CommonActions, NavigationContainer } from "@react-navigation/native";
import { navigationRef } from "./src/navigation/navigationRef";
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
  bindNotifeePushOpenListener,
  handleInitialPushOpen,
  registerPushTokenWithBackend,
} from "./src/core/push/push.service";
import { handleNotificationClick, normalizePayload } from "./src/core/notifications/notification-actions";
import { CUSTOMER_SCREENS } from "./src/navigation/customer.routes";
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

if (hydrated && token) {
  try {
    await applyPendingInvite();
  } catch {
    // Falha ao aplicar convite não deve bloquear abertura do app.
  }
}
}

  queryClient.invalidateQueries({ queryKey: ["me"] });
}

export default function App() {
  const pendingPushOpenRef = React.useRef<any | null>(null);
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.activeRole);

  const navigateFromNotification = React.useCallback((screen: string, params?: any) => {
  if (!navigationRef.isReady()) return false;

  navigationRef.dispatch(
    CommonActions.navigate({
      name: screen,
      params,
    })
  );

  return true;
}, []);

  useEffect(() => {
    useAuthStore.getState().hydrate();
  }, []);

  useEffect(() => {
    Airbridge.setOnDeeplinkReceived((url) => {
      handleInviteUrl(url).catch(() => {
       // Falha no deeplink não deve bloquear o app.
      });
    });

    const sub = Linking.addEventListener("url", (evt) => {
      handleInviteUrl(evt?.url || "").catch(() => {
        // Falha no link recebido não deve bloquear o app.
      });
    });

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleInviteUrl(url).catch(() => {
          // Falha no link inicial não deve bloquear o app.
        });
      }
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!hydrated || !token) return;

registerPushTokenWithBackend().catch(() => {
  // Falha ao registrar push token não deve bloquear sessão.
});

applyPendingInvite().catch(() => {
  // Falha ao aplicar convite pendente não deve bloquear sessão.
});

    const unsubTokenRefresh = bindPushTokenRefresh();
    const unsubForeground = bindForegroundPushListener();
    const processPushOpen = (remoteMessage: any) => {
      console.log("[PUSH_OPEN][RECEIVED]");
      const payload = normalizePayload(remoteMessage);
      console.log("[PUSH_OPEN][DATA]", payload);

      const handled = handleNotificationClick(remoteMessage, navigateFromNotification);

      if (handled) {
        console.log("[PUSH_OPEN][HANDLED_TRUE]");
        return;
      }

      console.log("[PUSH_OPEN][HANDLED_FALSE]");
      navigateFromNotification(CUSTOMER_SCREENS.Notifications);
    };

    const onPushOpen = (remoteMessage: any) => {
      if (!navigationRef.isReady()) {
        console.log("[PUSH_OPEN][NAV_NOT_READY_PENDING]");
        pendingPushOpenRef.current = remoteMessage;
        return;
      }
      processPushOpen(remoteMessage);
    };

    const unsubOpen = bindPushOpenListener(onPushOpen);
    const unsubNotifeeOpen = bindNotifeePushOpenListener(onPushOpen);

    handleInitialPushOpen(onPushOpen).catch(() => {
        // Falha ao processar abertura inicial por push não deve bloquear o app.
    });

    return () => {
      unsubTokenRefresh();
      unsubForeground();
      unsubOpen();
      unsubNotifeeOpen();
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
        <NavigationContainer
          key={navKey}
          ref={navigationRef}
          onReady={() => {
            const pending = pendingPushOpenRef.current;
            if (!pending) return;
            console.log("[PUSH_OPEN][NAV_READY_PROCESS_PENDING]");
            const handled = handleNotificationClick(pending, navigateFromNotification);

            if (handled) {
              console.log("[PUSH_OPEN][HANDLED_TRUE]");
            } else {
              console.log("[PUSH_OPEN][HANDLED_FALSE]");
              navigateFromNotification(CUSTOMER_SCREENS.Notifications);
            }
            pendingPushOpenRef.current = null;
          }}
        >
          <RootNavigator />
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}