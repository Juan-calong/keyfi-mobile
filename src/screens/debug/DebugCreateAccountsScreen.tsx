import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Alert, ScrollView } from "react-native";
import Clipboard from "@react-native-clipboard/clipboard";
import { useMutation } from "@tanstack/react-query";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { Card } from "../../ui/components/Card";
import { Button } from "../../ui/components/Button";
import { t } from "../../ui/tokens";

import { RegisterService } from "../../core/api/services/register.service";

function normalize(v: any) {
    return String(v ?? "").trim();
}

function normalizeCode(v: any) {
    return String(v ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

// mesmo padrão: sem I,O,1,0
function makeCode8() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
}

function makeEmail(prefix: string) {
    const stamp = Date.now().toString().slice(-6);
    return `${prefix}.${stamp}@example.com`;
}

function makeCnpj14() {
    // só pra teste (não valida dígito), mas passa no regex /^\d{14}$/
    let s = "";
    for (let i = 0; i < 14; i++) s += Math.floor(Math.random() * 10);
    return s;
}

function copy(value: string) {
    Clipboard.setString(value);
    Alert.alert("Copiado", "Copiado para a área de transferência.");
}

export function DebugCreateAccountsScreen() {
    const [sellerName, setSellerName] = useState("Seller Teste");
    const [sellerEmail, setSellerEmail] = useState(makeEmail("seller"));
    const [sellerPass, setSellerPass] = useState("NovaSenha123");
    const [sellerCode, setSellerCode] = useState(""); // opcional

    const [ownerName, setOwnerName] = useState("Owner Teste");
    const [ownerEmail, setOwnerEmail] = useState(makeEmail("owner"));
    const [ownerPass, setOwnerPass] = useState("NovaSenha123");

    const [salonName, setSalonName] = useState("Salao Teste");
    const [salonCnpj, setSalonCnpj] = useState(makeCnpj14());
    const [salonCnaes, setSalonCnaes] = useState("9602-5/01");
    const [salonEmail, setSalonEmail] = useState(makeEmail("salon"));
    const [salonPass, setSalonPass] = useState("NovaSenha123");

    const [salonCode, setSalonCode] = useState(""); // opcional
    const [lastJson, setLastJson] = useState<any>(null);

    const sellerPayload = useMemo(
        () => ({
            name: normalize(sellerName),
            email: normalize(sellerEmail).toLowerCase(),
            password: normalize(sellerPass),
            referralToken: sellerCode ? normalizeCode(sellerCode) : undefined,
        }),
        [sellerName, sellerEmail, sellerPass, sellerCode]
    );

    const salonPayload = useMemo(
        () => ({
            owner: {
                name: normalize(ownerName),
                email: normalize(ownerEmail).toLowerCase(),
                password: normalize(ownerPass),
            },
            salon: {
                name: normalize(salonName),
                cnpj: normalize(salonCnpj),
                cnaes: normalize(salonCnaes),
                email: normalize(salonEmail).toLowerCase(),
                password: normalize(salonPass),
            },
            referralToken: salonCode ? normalizeCode(salonCode) : undefined,
        }),
        [ownerName, ownerEmail, ownerPass, salonName, salonCnpj, salonCnaes, salonEmail, salonPass, salonCode]
    );

    const createSellerMut = useMutation({
        mutationFn: async () => RegisterService.createSeller(sellerPayload),
        onSuccess: (data) => {
            setLastJson(data);
            Alert.alert("OK", "Seller criado!");
        },
        onError: (e: any) => {
            const msg =
                e?.response?.data?.error ||
                e?.response?.data?.message ||
                e?.message ||
                "Falha ao criar seller.";
            Alert.alert("Erro", msg);
        },
    });

    const createSalonMut = useMutation({
        mutationFn: async () => RegisterService.createSalon(salonPayload),
        onSuccess: (data) => {
            setLastJson(data);
            Alert.alert("OK", "Salão criado!");
        },
        onError: (e: any) => {
            const msg =
                e?.response?.data?.error ||
                e?.response?.data?.message ||
                e?.message ||
                "Falha ao criar salão.";
            Alert.alert("Erro", msg);
        },
    });

    return (
        <Screen>
            <Container style={{ flex: 1 }}>
                <View style={{ marginTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.title}>Debug: Criar contas</Text>
                        <Text style={styles.subtitle}>
                            Cria Salão e Seller pra você rodar os testes sem adivinhar email/senha.
                        </Text>
                    </View>
                </View>

                <ScrollView style={{ marginTop: 12 }} contentContainerStyle={{ paddingBottom: 24 }}>
                    {/* SELLER */}
                    <Card>
                        <Text style={styles.cardTitle}>Criar SELLER</Text>

                        <Text style={styles.label}>Nome</Text>
                        <TextInput
                            value={sellerName}
                            onChangeText={setSellerName}
                            style={styles.input}
                            placeholder="Nome do vendedor"
                            placeholderTextColor={t.colors.text2}
                        />

                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            value={sellerEmail}
                            onChangeText={setSellerEmail}
                            autoCapitalize="none"
                            style={styles.input}
                            placeholder="seller@example.com"
                            placeholderTextColor={t.colors.text2}
                        />

                        <Text style={styles.label}>Senha</Text>
                        <TextInput
                            value={sellerPass}
                            onChangeText={setSellerPass}
                            secureTextEntry
                            style={styles.input}
                            placeholder="NovaSenha123"
                            placeholderTextColor={t.colors.text2}
                        />

                        <Text style={styles.label}>Código (8 chars) opcional</Text>
                        <TextInput
                            value={sellerCode}
                            onChangeText={(v) => setSellerCode(normalizeCode(v))}
                            autoCapitalize="characters"
                            maxLength={8}
                            style={styles.input}
                            placeholder="Ex: XA84XW8P"
                            placeholderTextColor={t.colors.text2}
                        />

                        <View style={styles.actionsRow}>
                            <Button title="Gerar email" variant="ghost" onPress={() => setSellerEmail(makeEmail("seller"))} />
                            <Button title="Gerar código" variant="ghost" onPress={() => setSellerCode(makeCode8())} />
                            <Button
                                title={createSellerMut.isPending ? "Criando..." : "Criar Seller"}
                                variant="primary"
                                onPress={() => createSellerMut.mutate()}
                                loading={createSellerMut.isPending}
                            />
                        </View>

                        <View style={{ marginTop: 10 }}>
                            <Button title="Copiar credenciais" variant="ghost" onPress={() => copy(`${sellerEmail} | ${sellerPass}`)} />
                        </View>
                    </Card>

                    <View style={{ height: 12 }} />

                    {/* SALON */}
                    <Card>
                        <Text style={styles.cardTitle}>Criar SALÃO</Text>

                        <Text style={styles.label}>Owner nome</Text>
                        <TextInput
                            value={ownerName}
                            onChangeText={setOwnerName}
                            style={styles.input}
                            placeholder="Nome do owner"
                            placeholderTextColor={t.colors.text2}
                        />

                        <Text style={styles.label}>Owner email</Text>
                        <TextInput
                            value={ownerEmail}
                            onChangeText={setOwnerEmail}
                            autoCapitalize="none"
                            style={styles.input}
                            placeholder="owner@example.com"
                            placeholderTextColor={t.colors.text2}
                        />

                        <Text style={styles.label}>Owner senha</Text>
                        <TextInput
                            value={ownerPass}
                            onChangeText={setOwnerPass}
                            secureTextEntry
                            style={styles.input}
                            placeholder="NovaSenha123"
                            placeholderTextColor={t.colors.text2}
                        />

                        <View style={{ height: 10 }} />

                        <Text style={styles.label}>Nome do salão</Text>
                        <TextInput
                            value={salonName}
                            onChangeText={setSalonName}
                            style={styles.input}
                            placeholder="Nome do salão"
                            placeholderTextColor={t.colors.text2}
                        />

                        <Text style={styles.label}>CNPJ (14 dígitos)</Text>
                        <TextInput
                            value={salonCnpj}
                            onChangeText={setSalonCnpj}
                            keyboardType="numeric"
                            style={styles.input}
                            placeholder="00000000000000"
                            placeholderTextColor={t.colors.text2}
                        />

                        <Text style={styles.label}>CNAE(s)</Text>
                        <TextInput
                            value={salonCnaes}
                            onChangeText={setSalonCnaes}
                            style={styles.input}
                            placeholder="9602-5/01"
                            placeholderTextColor={t.colors.text2}
                        />

                        <Text style={styles.label}>Email do salão</Text>
                        <TextInput
                            value={salonEmail}
                            onChangeText={setSalonEmail}
                            autoCapitalize="none"
                            style={styles.input}
                            placeholder="salon@example.com"
                            placeholderTextColor={t.colors.text2}
                        />

                        <Text style={styles.label}>Senha do salão</Text>
                        <TextInput
                            value={salonPass}
                            onChangeText={setSalonPass}
                            secureTextEntry
                            style={styles.input}
                            placeholder="NovaSenha123"
                            placeholderTextColor={t.colors.text2}
                        />

                        <Text style={styles.label}>Código (8 chars) opcional</Text>
                        <TextInput
                            value={salonCode}
                            onChangeText={(v) => setSalonCode(normalizeCode(v))}
                            autoCapitalize="characters"
                            maxLength={8}
                            style={styles.input}
                            placeholder="Ex: XA84XW8P"
                            placeholderTextColor={t.colors.text2}
                        />

                        <View style={styles.actionsRow}>
                            <Button
                                title="Gerar emails"
                                variant="ghost"
                                onPress={() => {
                                    setOwnerEmail(makeEmail("owner"));
                                    setSalonEmail(makeEmail("salon"));
                                }}
                            />
                            <Button title="Gerar CNPJ" variant="ghost" onPress={() => setSalonCnpj(makeCnpj14())} />
                            <Button title="Gerar código" variant="ghost" onPress={() => setSalonCode(makeCode8())} />
                            <Button
                                title={createSalonMut.isPending ? "Criando..." : "Criar Salão"}
                                variant="primary"
                                onPress={() => createSalonMut.mutate()}
                                loading={createSalonMut.isPending}
                            />
                        </View>

                        <View style={{ marginTop: 10 }}>
                            <Button title="Copiar credenciais do owner" variant="ghost" onPress={() => copy(`${ownerEmail} | ${ownerPass}`)} />
                        </View>
                    </Card>

                    <View style={{ height: 12 }} />

                    {/* LAST JSON */}
                    <Card>
                        <Text style={styles.cardTitle}>Última resposta (debug)</Text>

                        <View style={styles.jsonBox}>
                            <Text style={styles.jsonText}>
                                {lastJson ? JSON.stringify(lastJson, null, 2) : "—"}
                            </Text>
                        </View>
                    </Card>
                </ScrollView>
            </Container>
        </Screen>
    );
}

const styles = {
    title: {
        color: t.colors.text,
        fontWeight: "900" as const,
        fontSize: 18,
    },
    subtitle: {
        color: t.colors.text2,
        fontWeight: "700" as const,
        marginTop: 4,
    },
    cardTitle: {
        color: t.colors.text,
        fontWeight: "900" as const,
    },
    label: {
        marginTop: 10,
        color: t.colors.text2,
        fontWeight: "800" as const,
    },
    input: {
        marginTop: 6,
        borderWidth: 1,
        borderColor: t.colors.border,
        backgroundColor: t.colors.surface2,
        borderRadius: t.radius.md,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: t.colors.text,
        fontWeight: "800" as const,
    },
    actionsRow: {
        marginTop: 12,
        flexDirection: "row" as const,
        gap: 10,
        flexWrap: "wrap" as const,
    },
    jsonBox: {
        marginTop: 10,
        borderWidth: 1,
        borderColor: t.colors.border,
        backgroundColor: t.colors.surface2,
        borderRadius: t.radius.md,
        padding: 12,
    },
    jsonText: {
        color: t.colors.text,
        fontWeight: "700" as const,
        fontFamily: "monospace",
    },
};
