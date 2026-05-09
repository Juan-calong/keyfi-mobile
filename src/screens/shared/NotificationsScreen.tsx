import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { Container } from "../../ui/components/Container";
import { Screen } from "../../ui/components/Screen";
import { Card } from "../../ui/components/Card";
import { AppBackButton } from "../../ui/components/AppBackButton";
import { Button } from "../../ui/components/Button";
import { Empty, ErrorState, Loading } from "../../ui/components/State";
import { t } from "../../ui/tokens";
import { handleNotificationClick, type NotificationAudience } from "../../core/notifications/notification-actions";
import {
  getUnreadNotificationsCount,
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type MyNotification,
} from "../../core/api/services/notifications.service";

function isUnread(item: MyNotification) {
  if (item.readAt) return false;
  return String(item.status || "").toUpperCase() !== "READ";
}

type Props = { audience: NotificationAudience };

export function NotificationsScreen({ audience }: Props) {
  const nav = useNavigation<any>();
  const queryClient = useQueryClient();
  const keyPrefix = audience === "OWNER" ? "owner" : "customer";
  const notificationsKey = [`${keyPrefix}-notifications`];
  const unreadKey = [`${keyPrefix}-notifications-unread-count`];

  const notificationsQ = useQuery({ queryKey: notificationsKey, queryFn: listMyNotifications, retry: false });
  const unreadQ = useQuery({ queryKey: unreadKey, queryFn: getUnreadNotificationsCount, retry: false });

  const markOneReadMut = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationsKey });
      await queryClient.invalidateQueries({ queryKey: unreadKey });
    },
  });

  const markAllReadMut = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationsKey });
      await queryClient.invalidateQueries({ queryKey: unreadKey });
    },
  });

  const items = notificationsQ.data ?? [];
  return (
    <Screen>
      <Container style={{ flex: 1 }}>
        <View style={s.header}>
          <View style={s.headerLeft}>
            <AppBackButton onPress={() => nav.goBack()} showLabel={false} color={t.colors.text} iconSize={24} style={s.backButton} />
            <View style={{ flex: 1 }}>
              <Text style={s.h1}>Notificações</Text>
              <Text style={s.sub}>Não lidas: {unreadQ.data ?? 0}</Text>
            </View>
          </View>
          <Button title={markAllReadMut.isPending ? "..." : "Ler todas"} variant="ghost" onPress={() => markAllReadMut.mutate()} style={{ minWidth: 88, height: 44, borderRadius: 12 }} />
        </View>

        <View style={{ marginTop: 12, flex: 1, minHeight: 0 }}>
          {notificationsQ.isLoading ? (
            <Loading />
          ) : notificationsQ.isError ? (
            <ErrorState onRetry={() => { notificationsQ.refetch(); unreadQ.refetch(); }} />
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 40, gap: 12 }}
              renderItem={({ item }) => {
                const unread = isUnread(item);
                return (
                  <Pressable
                    onPress={async () => {
                      if (unread && item.id) {
                        await markOneReadMut.mutateAsync(item.id).catch(() => undefined);
                      }
                      handleNotificationClick(item, (screen, params) => nav.navigate(screen, params), { audience });
                    }}
                  >
                    <Card style={[s.card, unread && s.unreadCard]}>
                      <Text style={[s.title, unread && s.unreadTitle]}>{item.title || "Nova notificação"}</Text>
                      <Text style={s.body}>{item.body || "Toque para abrir."}</Text>
                    </Card>
                  </Pressable>
                );
              }}
              ListEmptyComponent={<Empty text="Sem notificações por enquanto." />}
              refreshing={notificationsQ.isRefetching}
              onRefresh={() => { notificationsQ.refetch(); unreadQ.refetch(); }}
            />
          )}
        </View>
      </Container>
    </Screen>
  );
}

const s = StyleSheet.create({
  header: { marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  headerLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4 },
  backButton: { minWidth: 40, minHeight: 40, paddingRight: 0 },
  h1: { color: t.colors.text, fontWeight: "900", fontSize: 22 },
  sub: { color: t.colors.text2, fontWeight: "800", marginTop: 6 },
  card: { padding: 14, borderRadius: 16, borderWidth: 1, borderColor: "transparent" },
  unreadCard: { borderColor: "#D9C28A", backgroundColor: "#FFF9EC" },
  title: { color: t.colors.text, fontWeight: "900" },
  unreadTitle: { color: "#6A4D00" },
  body: { marginTop: 8, color: t.colors.text2, fontWeight: "800" },
});
