import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ChooseRoleScreen } from "../screens/onboarding/ChooseRoleScreen";
import { OnboardingSalonScreen } from "../screens/onboarding/OnboardingSalonScreen";
import { OnboardingSellerScreen } from "../screens/onboarding/OnboardingSellerScreen";

export type OnboardingStackParamList = {
    ChooseRole: undefined;
    OnboardingSalon: undefined;
    OnboardingSeller: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingStack() {
    return (
        <Stack.Navigator>
            <Stack.Screen name="ChooseRole" component={ChooseRoleScreen} options={{ title: "Cadastro" }} />
            <Stack.Screen name="OnboardingSalon" component={OnboardingSalonScreen} options={{ title: "Salão" }} />
            <Stack.Screen name="OnboardingSeller" component={OnboardingSellerScreen} options={{ title: "Vendedor" }} />
        </Stack.Navigator>
    );
}
