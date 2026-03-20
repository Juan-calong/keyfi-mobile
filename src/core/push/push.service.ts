import { PermissionsAndroid, Platform } from "react-native";
import messaging from "@react-native-firebase/messaging";

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

export async function ensurePushPermission() {
  const androidOk = await requestAndroidNotificationPermission();
  const iosOk = await requestIosNotificationPermission();

  apiLog("[PUSH][PERMISSION]", {
    androidOk,
    iosOk,
    platform: Platform.OS,
  });

  return androidOk && iosOk;
}

export async function registerPushTokenWithBackend() {
  const allowed = await ensurePushPermission();
  if (!allowed) {
    apiLog("[PUSH][REGISTER] permission denied");
    return null;
  }

  await messaging().registerDeviceForRemoteMessages();

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
    } catch (error) {
      console.log("[PUSH][TOKEN][REFRESH][ERROR]", error);
    }
  });
}

export function bindForegroundPushListener() {
  return messaging().onMessage(async (remoteMessage) => {
    console.log("[PUSH][FOREGROUND_MESSAGE]", remoteMessage);
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