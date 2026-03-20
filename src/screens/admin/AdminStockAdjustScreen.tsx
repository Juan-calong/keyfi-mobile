import React from "react";
import { View, Text } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { Card } from "../../ui/components/Card";
import { Button } from "../../ui/components/Button";
import { t } from "../../ui/tokens";

export function AdminStockAdjustScreen() {
    const nav = useNavigation<any>();
    const route = useRoute<any>();

    const productId: string | undefined = route.params?.productId;

    return (
        <Screen>
            <Container>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                    <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 18 }}>
                        Estoque
                    </Text>
                    <Button title="Voltar" variant="ghost" onPress={() => nav.goBack()} />
                </View>

                <View style={{ marginTop: 12 }}>
                    <Card>
                        <Text style={{ color: "rgba(234,240,255,0.85)", fontWeight: "900" }}>
                            Produto
                        </Text>
                        <Text style={{ color: "rgba(234,240,255,0.65)", marginTop: 6 }}>
                            productId: {productId ?? "—"}
                        </Text>

                        <View style={{ marginTop: 14 }}>
                            <Text style={{ color: "rgba(234,240,255,0.65)", fontWeight: "800" }}>
                                (Placeholder) Aqui vai o controle de estoque
                            </Text>

                            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                                <View style={{ flex: 1 }}>
                                    <Button title="Entrada (+)" variant="primary" onPress={() => { }} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Button title="Saída (-)" variant="danger" onPress={() => { }} />
                                </View>
                            </View>

                            <View style={{ marginTop: 10 }}>
                                <Button title="Em breve: salvar ajuste" variant="ghost" onPress={() => { }} />
                            </View>
                        </View>
                    </Card>
                </View>
            </Container>
        </Screen>
    );
}
