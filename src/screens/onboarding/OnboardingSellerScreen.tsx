import React, { useState } from "react";
import { View, Text, TextInput, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { Card } from "../../ui/components/Card";
import { Button } from "../../ui/components/Button";
import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";
import { useAuthStore } from "../../stores/auth.store";

export function OnboardingSellerScreen() {
    const nav = useNavigation<any>();
    const refreshSession = useAuthStore((s) => s.refreshSession);

    const [referralToken, setReferralToken] = useState("");
    const [loading, setLoading] = useState(false);

    async function onSubmit() {
        try {
            setLoading(true);

            // 1) chama onboarding seller (token atual vai no Authorization)
            const res = await api.post(endpoints.onboarding.seller, {
                referralToken: referralToken.trim() ? referralToken.trim() : undefined,
            });

            console.log("[ONBOARDING_SELLER][OK]", res.data);

            // 2) tenta pegar um accessToken novo (com onboardingStatus atualizado)
            try {
                await refreshSession();
            } catch {
                // fallback: força usuário voltar e logar de novo
                Alert.alert(
                    "Quase lá",
                    "Cadastro concluído, mas preciso atualizar sua sessão. Faça login novamente."
                );
                nav.reset({ index: 0, routes: [{ name: "Login" }] });
                return;
            }

            // 3) manda pra área do vendedor
            nav.reset({ index: 0, routes: [{ name: "SellerHome" }] });
        } catch (e: any) {
            const msg = e?.response?.data?.error || e?.message || "Falha ao cadastrar vendedor.";
            Alert.alert("Erro", msg);
            console.log("[ONBOARDING_SELLER][ERR]", e?.response?.data || e);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Screen>
            <Container>
                <View style={{ marginTop: 16 }}>
                    <Text style={{ fontSize: 20, fontWeight: "900" }}>Cadastro de Vendedor</Text>
                    <Text style={{ marginTop: 6, opacity: 0.7 }}>
                        Se você tiver um código de indicação (8 dígitos), cole abaixo. Se não tiver, pode deixar vazio.
                    </Text>
                </View>

                <View style={{ marginTop: 16, gap: 12 }}>
                    <Card>
                        <Text style={{ fontWeight: "900", marginBottom: 8 }}>Código de indicação (opcional)</Text>
                        <TextInput
                            value={referralToken}
                            onChangeText={setReferralToken}
                            autoCapitalize="characters"
                            placeholder="Ex: A1B2C3D4"
                            style={{
                                borderWidth: 1,
                                borderColor: "rgba(255,255,255,0.15)",
                                padding: 12,
                                borderRadius: 12,
                                color: "white",
                            }}
                        />
                        <View style={{ marginTop: 12 }}>
                            <Button
                                title={loading ? "Salvando..." : "Concluir cadastro"}
                                variant="primary"
                                onPress={onSubmit}
                            />
                        </View>
                    </Card>
                </View>
            </Container>
        </Screen>
    );
}
