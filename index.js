import { AppRegistry } from "react-native";
import { enableScreens } from "react-native-screens";
import messaging from "@react-native-firebase/messaging";

import App from "./App";
import { name as appName } from "./app.json";

enableScreens(true);

messaging().setBackgroundMessageHandler(async () => {
  // Handler necessário para o Firebase processar mensagens em background.
});

AppRegistry.registerComponent(appName, () => App);