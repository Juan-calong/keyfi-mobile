import Config from "react-native-config";

const enabled = __DEV__ && String(Config.API_DEBUG || "") === "1";

export function apiLog(...args: any[]) {
  if (!enabled) return;
  console.log(...args);
}

export function apiWarn(...args: any[]) {
  if (!enabled) return;
  console.warn(...args);
}