import { AppRegistry } from "react-native";
import { enableScreens } from "react-native-screens";
import messaging from "@react-native-firebase/messaging";

import App from "./App";
import { name as appName } from "./app.json";

enableScreens(true);

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log("[PUSH][BACKGROUND_MESSAGE]", remoteMessage);
});

AppRegistry.registerComponent(appName, () => App);