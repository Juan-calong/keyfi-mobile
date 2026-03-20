import React from "react";
import { View, Text, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { Card } from "../../ui/components/Card";
import { Button } from "../../ui/components/Button";
import { t } from "../../ui/tokens";
import { useAuthStore } from "../../stores/auth.store";

export function ChooseRoleScreen() {
    const nav = useNavigation<any>();
    const logout = useAuthStore((s) => s.logout);
    const resetSession = useAuthStore((s) => s.resetSession);

    async function onGoLogin() {
        // ✅ limpa a sessão e deixa o RootNavigator trocar para AuthStack (Login)
        await resetSession();
    }

    async function onClear() {
        try {
            await logout();
            Alert.alert("Ok", "Sessão limpa.");
        } catch {
            await resetSession();
            Alert.alert("Ok", "Sessão limpa.");
        }
    }

    return (
        <Screen>
            <Container>
                <View style={{ marginTop: 18, flexDirection: "row", gap: 10 }}>
                    <Button title="Ir para Login" variant="ghost" onPress={onGoLogin} />
                    <Button title="Limpar sessão" variant="ghost" onPress={onClear} />
                </View>

                <View style={{ marginTop: 24 }}>
                    <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 20 }}>
                        Complete seu cadastro
                    </Text>
                    <Text style={{ color: t.colors.text2, fontWeight: "800", marginTop: 6 }}>
                        Escolha como você vai usar o KeyFi
                    </Text>
                </View>

                <View style={{ marginTop: 16, gap: 12 }}>
                    <Card>
                        <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 16 }}>
                            Sou dono(a) de salão
                        </Text>
                        <Text style={{ marginTop: 6, color: t.colors.text2, fontWeight: "800" }}>
                            Vou comprar produtos e gerenciar permissões.
                        </Text>

                        <View style={{ marginTop: 12 }}>
                            <Button
                                title="Cadastrar salão"
                                variant="primary"
                                onPress={() => nav.navigate("OnboardingSalon")}
                            />
                        </View>
                    </Card>

                    <Card>
                        <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 16 }}>
                            Sou vendedor(a)
                        </Text>
                        <Text style={{ marginTop: 6, color: t.colors.text2, fontWeight: "800" }}>
                            Vou montar carrinho para salões autorizados.
                        </Text>

                        <View style={{ marginTop: 12 }}>
                            <Button
                                title="Cadastrar vendedor"
                                variant="ghost"
                                onPress={() => nav.navigate("OnboardingSeller")}
                            />
                        </View>
                    </Card>
                </View>
            </Container>
        </Screen>
    );
}
