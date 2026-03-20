import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { Loading, ErrorState } from "../../ui/components/State";
import { t } from "../../ui/tokens";

import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";
import { CUSTOMER_SCREENS, CustomerStackParamList } from "../../navigation/customer.routes";

type TrainingVideoItem = {
  id: string;
  title: string;
  description?: string | null;
  videoUrl?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  sortOrder: number;
  productId?: string;
  productName?: string | null;
};

type TrainingVideosResponse = {
  items: TrainingVideoItem[];
};

type Nav = NativeStackNavigationProp<CustomerStackParamList>;

function formatBytes(value?: number | null) {
  const bytes = Number(value ?? 0);
  if (!bytes || bytes <= 0) return "—";

  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unit = 0;

  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }

  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function VideoCard({
  item,
  onOpen,
}: {
  item: TrainingVideoItem;
  onOpen: (item: TrainingVideoItem) => void;
}) {
  const canOpenVideo = typeof item.videoUrl === "string" && item.videoUrl.trim().length > 0;

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: t.colors.border,
        borderRadius: 18,
        backgroundColor: "#FFF",
        padding: 14,
      }}
    >
      {!!item.productName && (
        <Text
          style={{
            color: t.colors.text2,
            fontWeight: "800",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          {item.productName}
        </Text>
      )}

      <Text
        style={{
          marginTop: item.productName ? 6 : 0,
          color: t.colors.text,
          fontWeight: "900",
          fontSize: 16,
        }}
      >
        {item.title}
      </Text>

      {!!item.description && (
        <Text
          style={{
            marginTop: 6,
            color: t.colors.text2,
            fontWeight: "600",
            fontSize: 13,
            lineHeight: 18,
          }}
        >
          {item.description}
        </Text>
      )}

      <Text
        style={{
          marginTop: 8,
          color: t.colors.text2,
          fontWeight: "700",
          fontSize: 11,
        }}
      >
        {item.mimeType || "vídeo"} • {formatBytes(item.sizeBytes)}
      </Text>

      <Pressable
        disabled={!canOpenVideo}
        onPress={() => {
          if (!canOpenVideo) return;
          onOpen(item);
        }}
        style={{
          marginTop: 12,
          height: 44,
          borderRadius: 12,
          backgroundColor: canOpenVideo ? "#111827" : "#9CA3AF",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#FFF", fontWeight: "900", fontSize: 13 }}>
          {canOpenVideo ? "Assistir no app" : "Vídeo indisponível"}
        </Text>
      </Pressable>
    </View>
  );
}

export function CustomerTrainingVideosScreen() {
  const navigation = useNavigation<Nav>();
  const [search, setSearch] = useState("");

  const videosQ = useQuery<TrainingVideosResponse>({
    queryKey: ["training-videos-library"],
    queryFn: async () => {
      const res = await api.get(endpoints.trainingVideos.listAll);
      return res.data;
    },
    retry: false,
  });

  console.log("[TRAINING_VIDEOS][DATA]", JSON.stringify(videosQ.data, null, 2));

  const items = useMemo(() => {
    const base = videosQ.data?.items ?? [];
    if (!search.trim()) return base;

    const term = search.toLowerCase();
    return base.filter((item) =>
      [item.title, item.description, item.productName].some((v) =>
        String(v ?? "").toLowerCase().includes(term)
      )
    );
  }, [search, videosQ.data?.items]);

  if (videosQ.isLoading) {
    return (
      <Screen>
        <Container style={{ flex: 1 }}>
          <Loading />
        </Container>
      </Screen>
    );
  }

  if (videosQ.isError) {
    return (
      <Screen>
        <Container style={{ flex: 1 }}>
          <ErrorState onRetry={() => videosQ.refetch()} />
        </Container>
      </Screen>
    );
  }

  return (
    <Screen>
      <Container style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingTop: 80, paddingBottom: 40 }}>
          <Text
            style={{
              color: t.colors.text,
              fontWeight: "900",
              fontSize: 28,
              paddingHorizontal: 4,
            }}
          >
            Vídeos de treinamento
          </Text>

          <Text
            style={{
              marginTop: 6,
              paddingHorizontal: 4,
              color: t.colors.text2,
              fontWeight: "700",
              fontSize: 13,
              lineHeight: 18,
            }}
          >
            Veja os conteúdos técnicos e de aplicação dos produtos.
          </Text>

          <View style={{ height: 16 }} />

          <View
            style={{
              borderWidth: 1,
              borderColor: t.colors.border,
              borderRadius: 16,
              backgroundColor: "#FFF",
              paddingHorizontal: 14,
              height: 48,
              justifyContent: "center",
            }}
          >
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar por título ou produto"
              placeholderTextColor={t.colors.text2}
              style={{
                color: t.colors.text,
                fontSize: 14,
                fontWeight: "700",
              }}
            />
          </View>

          <View style={{ height: 16 }} />

          {items.length === 0 ? (
            <View
              style={{
                borderWidth: 1,
                borderColor: t.colors.border,
                borderRadius: 18,
                backgroundColor: "#FFF",
                padding: 18,
              }}
            >
              <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 15 }}>
                Nenhum vídeo encontrado
              </Text>
              <Text
                style={{
                  marginTop: 6,
                  color: t.colors.text2,
                  fontWeight: "600",
                  fontSize: 13,
                }}
              >
                Tente ajustar a busca ou cadastre vídeos no painel admin.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {items.map((item) => (
                <VideoCard
                  key={item.id}
                  item={item}
                  onOpen={(video) =>
                    navigation.navigate(CUSTOMER_SCREENS.TrainingVideoPlayer, {
                      title: video.title,
                      description: video.description,
                      productName: video.productName,
                      videoUrl: video.videoUrl,
                    })
                  }
                />
              ))}
            </View>
          )}
        </ScrollView>
      </Container>
    </Screen>
  );
}