import { PermissionsAndroid, Platform } from "react-native";
import messaging from "@react-native-firebase/messaging";
import notifee, { AndroidImportance } from "@notifee/react-native";

import { api } from "../api/client";
import { apiLog } from "../api/logger";

type DevicePlatform = "ANDROID" | "IOS";

function getPlatform(): DevicePlatform {
  return Platform.OS === "ios" ? "IOS" : "ANDROID";
}

async function requestAndroidNotificationPermission() {
  if (Platform.OS !== "android") return true;
  if (Platform.Version < 33) return true;

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
  );

  return result === PermissionsAndroid.RESULTS.GRANTED;
}

async function requestIosNotificationPermission() {
  if (Platform.OS !== "ios") return true;

  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  return enabled;
}

async function requestLocalNotificationPermission() {
  try {
    const settings = await notifee.requestPermission();

    apiLog("[PUSH][LOCAL_PERMISSION]", {
      authorizationStatus: settings.authorizationStatus,
    });

    return true;
  } catch (error) {
    console.log("[PUSH][LOCAL_PERMISSION][ERROR]", error);
    return false;
  }
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return "default";

  const channelId = await notifee.createChannel({
    id: "default",
    name: "Notificações",
    importance: AndroidImportance.HIGH,
  });

  apiLog("[PUSH][CHANNEL_READY]", { channelId });

  return channelId;
}

async function displayForegroundNotification(remoteMessage: any) {
  try {
    const channelId = await ensureAndroidChannel();

    const title =
      remoteMessage?.notification?.title ||
      remoteMessage?.data?.title ||
      "Nova notificação";

    const body =
      remoteMessage?.notification?.body ||
      remoteMessage?.data?.body ||
      "";

    await notifee.displayNotification({
      title,
      body,
      android: {
        channelId,
        pressAction: {
          id: "default",
        },
      },
    });

    apiLog("[PUSH][FOREGROUND_DISPLAYED]", {
      title,
      hasBody: !!body,
      data: remoteMessage?.data ?? null,
    });
  } catch (error) {
    console.log("[PUSH][FOREGROUND_DISPLAY][ERROR]", error);
  }
}

export async function ensurePushPermission() {
  const androidOk = await requestAndroidNotificationPermission();
  const iosOk = await requestIosNotificationPermission();
  const localOk = await requestLocalNotificationPermission();

  apiLog("[PUSH][PERMISSION]", {
    androidOk,
    iosOk,
    localOk,
    platform: Platform.OS,
  });

  return androidOk && iosOk && localOk;
}

export async function registerPushTokenWithBackend() {
  const allowed = await ensurePushPermission();
  if (!allowed) {
    apiLog("[PUSH][REGISTER] permission denied");
    return null;
  }

  await messaging().registerDeviceForRemoteMessages();
  await ensureAndroidChannel();

  const token = await messaging().getToken();

  apiLog("[PUSH][TOKEN][GET]", {
    hasToken: !!token,
    tokenPreview: token ? `${token.slice(0, 12)}...${token.slice(-8)}` : null,
    platform: getPlatform(),
  });

  if (!token) return null;

  await api.post("/devices/push-token", {
    token,
    platform: getPlatform(),
  });

  apiLog("[PUSH][TOKEN][REGISTERED_BACKEND]", {
    hasToken: !!token,
    tokenPreview: token ? `${token.slice(0, 12)}...${token.slice(-8)}` : null,
    platform: getPlatform(),
  });

  return token;
}

export async function removePushTokenFromBackend() {
  try {
    const token = await messaging().getToken().catch(() => null);

    if (token) {
      await api.post("/devices/push-token/remove", { token });
    }

    await messaging().deleteToken();

    apiLog("[PUSH][TOKEN][REMOVE]", {
      hadToken: !!token,
    });
  } catch (error) {
    console.log("[PUSH][TOKEN][REMOVE][ERROR]", error);
  }
}

export function bindPushTokenRefresh() {
  return messaging().onTokenRefresh(async (token) => {
    try {
      apiLog("[PUSH][TOKEN][REFRESH]", {
        hasToken: !!token,
        tokenPreview: token ? `${token.slice(0, 12)}...${token.slice(-8)}` : null,
      });

      await api.post("/devices/push-token", {
        token,
        platform: getPlatform(),
      });

      apiLog("[PUSH][TOKEN][REFRESH][REGISTERED_BACKEND]", {
        hasToken: !!token,
        tokenPreview: token ? `${token.slice(0, 12)}...${token.slice(-8)}` : null,
      });
    } catch (error) {
      console.log("[PUSH][TOKEN][REFRESH][ERROR]", error);
    }
  });
}

export function bindForegroundPushListener() {
  return messaging().onMessage(async (remoteMessage) => {
    console.log("[PUSH][FOREGROUND_MESSAGE]", remoteMessage);
    await displayForegroundNotification(remoteMessage);
  });
}

export function bindPushOpenListener(onOpen?: (remoteMessage: any) => void) {
  return messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log("[PUSH][OPENED_FROM_BACKGROUND]", remoteMessage);
    onOpen?.(remoteMessage);
  });
}

export async function handleInitialPushOpen(onOpen?: (remoteMessage: any) => void) {
  const initialNotification = await messaging().getInitialNotification();

  if (!initialNotification) return null;

  console.log("[PUSH][OPENED_FROM_QUIT]", initialNotification);
  onOpen?.(initialNotification);

  return initialNotification;
}