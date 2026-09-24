import { PermissionsAndroid, Platform } from "react-native";
import messaging from "@react-native-firebase/messaging";
import notifee, { AndroidImportance, EventType } from "@notifee/react-native";

import { api } from "../api/client";

type DevicePlatform = "ANDROID" | "IOS";
type PushRegistrationStage =
  | "permission"
  | "register_remote_messages"
  | "get_fcm_token"
  | "backend_registration"
  | "unknown";

export function reportPushRegistrationFailure(stage: PushRegistrationStage, error: unknown) {
  const details = error && typeof error === "object" ? error as { name?: unknown; code?: unknown } : {};
  const errorName = typeof details.name === "string" &&
    ["Error", "AxiosError", "FirebaseError", "NativeFirebaseError", "PermissionDenied"].includes(details.name)
    ? details.name : "UnknownError";
  const errorCode = typeof details.code === "string" &&
    /^(?:messaging\/[a-z0-9_-]{1,80}|ERR_[A-Z_]+|permission_denied)$/.test(details.code)
    ? details.code : undefined;

  console.warn({
    event: "push_registration_failed",
    platform: Platform.OS === "ios" ? "ios" : "android",
    stage,
    errorName,
    errorCode,
    message: `Push registration failed at ${stage}`,
  });
}

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
    await notifee.requestPermission();
    return true;
  } catch {
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
  } catch {
    // Falha ao exibir notificação local não deve quebrar o app.
  }
}

export async function ensurePushPermission() {
  const androidOk = await requestAndroidNotificationPermission();
  const iosOk = await requestIosNotificationPermission();
  const localOk = await requestLocalNotificationPermission();
  return androidOk && iosOk && localOk;
}

export async function registerPushTokenWithBackend() {
  let stage: PushRegistrationStage = "permission";
  try {
    const allowed = await ensurePushPermission();
    if (!allowed) {
      reportPushRegistrationFailure(stage, { name: "PermissionDenied", code: "permission_denied" });
      return null;
    }

    stage = "register_remote_messages";
    await messaging().registerDeviceForRemoteMessages();
    await ensureAndroidChannel();
    stage = "get_fcm_token";
    const token = await messaging().getToken();
    if (!token) {
      reportPushRegistrationFailure(stage, { code: "messaging/no_token" });
      return null;
    }
    stage = "backend_registration";
    await api.post("/devices/push-token", {
      token,
      platform: getPlatform(),
    });

    return token;
  } catch (error) {
    reportPushRegistrationFailure(stage, error);
    return null;
  }
}

export async function removePushTokenFromBackend() {
  try {
    const token = await messaging().getToken().catch(() => null);

    if (token) {
      await api.post("/devices/push-token/remove", { token });
    }

    await messaging().deleteToken();
  } catch {
    // Falha ao remover token não deve bloquear logout/reset local.
  }
}

export function bindPushTokenRefresh() {
  return messaging().onTokenRefresh(async (token) => {
    try {
      await api.post("/devices/push-token", {
        token,
        platform: getPlatform(),
      });
    } catch (error) {
      reportPushRegistrationFailure("backend_registration", error);
    }
  });
}

export function bindForegroundPushListener() {
  return messaging().onMessage(async (remoteMessage) => {
    await displayForegroundNotification(remoteMessage);
  });
}

export function bindNotifeePushOpenListener(onOpen?: (remoteMessage: any) => void) {
  return notifee.onForegroundEvent(({ type, detail }) => {
    if (type !== EventType.PRESS && type !== EventType.ACTION_PRESS) return;
    onOpen?.({ detail });
  });
}


export function bindPushOpenListener(onOpen?: (remoteMessage: any) => void) {
  return messaging().onNotificationOpenedApp((remoteMessage) => {
    onOpen?.(remoteMessage);
  });
}

export async function handleInitialPushOpen(onOpen?: (remoteMessage: any) => void) {
  const [firebaseInitial, notifeeInitial] = await Promise.all([
    messaging().getInitialNotification(),
    notifee.getInitialNotification().catch(() => null),
  ]);

  const initialNotification =
    firebaseInitial ?? (notifeeInitial ? { detail: notifeeInitial } : null);

  

  if (!initialNotification) return null;
  onOpen?.(initialNotification);

  return initialNotification;
}
