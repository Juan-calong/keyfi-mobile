import React, { useMemo } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";

import { Screen } from "../ui/components/Screen";
import { Container } from "../ui/components/Container";
import { Loading, ErrorState } from "../ui/components/State";
import { t } from "../ui/tokens";

import { api } from "../core/api/client";
import { endpoints } from "../core/api/endpoints";
import { OWNER_SCREENS } from "../navigation/owner.routes";

type MeDTO = any;

const trim = (v: any) => String(v ?? "").trim();

function cleanMeiLikeName(value?: string | null) {
  const s = trim(value);
  if (!s) return "Seu salão";

  const cleaned = s.replace(/\s+\d{11}$/, "").trim();
  return cleaned || s;
}

function pickReferralTokens(me: any) {
  const salonToken =
    me?.salon?.referralToken ||
    me?.salonReferralToken ||
    me?.profile?.salon?.referralToken;

  const sellerToken =
    me?.sellerProfile?.referralToken ||
    me?.seller?.referralToken ||
    me?.profile?.sellerProfile?.referralToken;

  return { salonToken, sellerToken };
}

function pickSalonInfo(me: any) {
  const salon = me?.salon || me?.profile?.salon || me?.ownerSalon;
  const rawName =
    salon?.name || salon?.fantasyName || salon?.displayName || "Seu salão";

  const name = cleanMeiLikeName(rawName);

  return { salon, name };
}

function moneyBRL(v?: number | null) {
  const n = Number(v ?? 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseMoney(v: any) {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function RowItem({
  title,
  subtitle,
  onPress,
  hideDivider,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
  hideDivider?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 14,
        paddingHorizontal: 4,
        borderBottomWidth: hideDivider ? 0 : 1,
        borderBottomColor: t.colors.border,
      }}
    >
      <View style={{ flex: 1, paddingRight: 10 }}>
        <Text
          style={{
            color: t.colors.text,
            fontWeight: "900",
            fontSize: 16,
            letterSpacing: 0.2,
          }}
        >
          {title}
        </Text>

        {!!subtitle && (
          <Text
            style={{
              marginTop: 2,
              color: t.colors.text2,
              fontWeight: "700",
              fontSize: 12,
            }}
          >
            {subtitle}
          </Text>
        )}
      </View>

      <Text style={{ color: t.colors.text2, fontSize: 30, fontWeight: "900" }}>
        ›
      </Text>
    </Pressable>
  );
}

function EarningsPreviewRow({
  onPress,
  total,
  available,
  pending,
}: {
  onPress: () => void;
  total: number;
  available: number;
  pending: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 14,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: t.colors.border,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: t.colors.text,
              fontWeight: "900",
              fontSize: 16,
              letterSpacing: 0.2,
            }}
          >
            Carteira (comissões)
          </Text>

          <Text
            style={{
              marginTop: 2,
              color: t.colors.text2,
              fontWeight: "700",
              fontSize: 12,
            }}
          >
            Total: {moneyBRL(total)}
          </Text>
        </View>

        <Text style={{ color: t.colors.text2, fontSize: 30, fontWeight: "900" }}>
          ›
        </Text>
      </View>

      <View style={{ height: 10 }} />

      <View
        style={{
          backgroundColor: "#FFF",
          borderWidth: 1,
          borderColor: t.colors.border,
          borderRadius: 14,
          padding: 12,
          flexDirection: "row",
          gap: 10,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.colors.text2, fontWeight: "800", fontSize: 12 }}>
            Disponível
          </Text>
          <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 14, marginTop: 4 }}>
            {moneyBRL(available)}
          </Text>
        </View>

        <View style={{ width: 1, backgroundColor: t.colors.border, opacity: 0.9 }} />

        <View style={{ flex: 1 }}>
          <Text style={{ color: t.colors.text2, fontWeight: "800", fontSize: 12 }}>
            Em processamento
          </Text>
          <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 14, marginTop: 4 }}>
            {moneyBRL(pending)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export function ProfileMeScreen() {
  const nav = useNavigation<any>();

  const meQ = useQuery<MeDTO>({
    queryKey: ["me"],
    queryFn: async () => (await api.get(endpoints.profiles.me)).data,
    retry: false,
  });

  const walletQ = useQuery<any>({
    queryKey: ["wallet", "me"],
    queryFn: async () => (await api.get(endpoints.wallet.me)).data,
    retry: false,
    enabled: !!meQ.data,
  });

  const me = meQ.data;
  const { salonToken } = pickReferralTokens(me);
  const { name: salonName } = pickSalonInfo(me);

  const sans = (t as any)?.fonts?.sans || (t as any)?.font?.sans || undefined;

  const walletInfo = useMemo(() => {
    const root = walletQ.data || {};
    const w = root.wallet || {};
    const available = parseMoney(w.available);
    const pending = parseMoney(w.pending);
    const total = available + pending;

    return { available, pending, total };
  }, [walletQ.data]);

  const isLoading = meQ.isLoading || (walletQ.isLoading && !!me);
  const isError = meQ.isError || walletQ.isError;

  return (
    <Screen>
      <Container style={{ flex: 1 }}>
        {isLoading ? (
          <Loading />
        ) : isError ? (
          <ErrorState
            onRetry={() => {
              meQ.refetch();
              walletQ.refetch();
            }}
          />
        ) : (
          <ScrollView
            contentContainerStyle={{
              paddingBottom: 40,
              paddingTop: 80,
            }}
          >
            <Text
              style={{
                color: t.colors.text,
                fontWeight: "900",
                fontSize: 28,
                ...(sans ? { fontFamily: sans } : null),
                paddingHorizontal: 4,
              }}
            >
              Profile
            </Text>

            <View style={{ height: 12 }} />

            <Pressable
              onPress={() => nav.navigate(OWNER_SCREENS.ProfileDetails)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 10,
                paddingHorizontal: 4,
              }}
            >
              <View
                style={{
                  width: 55,
                  height: 55,
                  borderRadius: 26,
                  backgroundColor: t.colors.surface,
                  borderWidth: 1,
                  borderColor: t.colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: t.colors.text2, fontSize: 18, fontWeight: "900" }}>
                  👤
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: t.colors.text,
                    fontWeight: "900",
                    fontSize: 16,
                    ...(sans ? { fontFamily: sans } : null),
                  }}
                >
                  Minha conta
                </Text>

                <Text
                  style={{
                    marginTop: 2,
                    color: t.colors.text2,
                    fontWeight: "700",
                    fontSize: 12,
                  }}
                >
                  {salonName}
                </Text>
              </View>

              <Text style={{ color: t.colors.text2, fontSize: 18, fontWeight: "900" }}>
                ›
              </Text>
            </Pressable>

            <View style={{ height: 12 }} />

            <View
              style={{
                backgroundColor: "#FFF",
                borderTopWidth: 1,
                borderTopColor: t.colors.border,
                borderBottomWidth: 1,
                borderBottomColor: t.colors.border,
              }}
            >
              <RowItem
                title="Vincular vendedores"
                subtitle="Gerencie permissões"
                onPress={() => nav.navigate(OWNER_SCREENS.OwnerSellers)}
              />

              <RowItem
                title="Pedidos de vendedores"
                subtitle="Aprovar ou rejeitar carrinhos enviados"
                onPress={() => nav.navigate(OWNER_SCREENS.CartRequests)}
              />

              <RowItem title="Pedidos" onPress={() => nav.navigate(OWNER_SCREENS.Orders)} />

              <EarningsPreviewRow
                onPress={() => nav.navigate(OWNER_SCREENS.Wallet)}
                total={walletInfo.total}
                available={walletInfo.available}
                pending={walletInfo.pending}
              />

              <RowItem
                title="Recebimento (PIX)"
                subtitle="Cadastrar/editar dados para receber"
                onPress={() => nav.navigate(OWNER_SCREENS.PixKey)}
              />

              <RowItem
                title="Notificações"
                onPress={() => nav.navigate(OWNER_SCREENS.Notifications)}
              />

              <RowItem
                title="Token do salão"
                onPress={() =>
                  nav.navigate(OWNER_SCREENS.SalonToken, { token: String(salonToken ?? "") })
                }
              />

              <RowItem
  title="Token do salão"
  onPress={() =>
    nav.navigate(OWNER_SCREENS.SalonToken, { token: String(salonToken ?? "") })
  }
/>

<RowItem
  title="Quem usou meu token"
  subtitle="Ver clientes e salões vinculados"
  onPress={() => nav.navigate(OWNER_SCREENS.Referrals)}
/>

<RowItem
  title="Vincular por token"
  subtitle="Cole o token do vendedor (ou salão)"
  onPress={() => nav.navigate(OWNER_SCREENS.ApplyReferral)}
  hideDivider
/>
            </View>
          </ScrollView>
        )}
      </Container>
    </Screen>
  );
}