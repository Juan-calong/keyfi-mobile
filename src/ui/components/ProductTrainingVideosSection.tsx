import React from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";
import { t } from "../tokens";

type TrainingVideoItem = {
  id: string;
  title: string;
  description?: string | null;
  videoUrl: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  sortOrder: number;
};

type TrainingVideosResponse = {
  items: TrainingVideoItem[];
};

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

async function fetchTrainingVideos(productId: string) {
  const { data } = await api.get<TrainingVideosResponse>(
    endpoints.trainingVideos.listByProduct(productId)
  );
  return data;
}

export function ProductTrainingVideosSection({
  productId,
}: {
  productId?: string | null;
}) {
  const videosQ = useQuery({
    queryKey: ["product-training-videos", productId],
    queryFn: () => fetchTrainingVideos(String(productId)),
    enabled: !!productId,
  });

  if (!productId) return null;

  if (videosQ.isLoading) {
    return (
      <View
        style={{
          marginTop: 18,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: t.colors.border,
          backgroundColor: "#FFF",
          padding: 16,
        }}
      >
        <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 16 }}>
          Vídeos de treinamento
        </Text>
        <Text style={{ marginTop: 8, color: t.colors.text2, fontSize: 13 }}>
          Carregando vídeos...
        </Text>
      </View>
    );
  }

  if (videosQ.isError) {
    return (
      <View
        style={{
          marginTop: 18,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: t.colors.border,
          backgroundColor: "#FFF",
          padding: 16,
        }}
      >
        <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 16 }}>
          Vídeos de treinamento
        </Text>
        <Text style={{ marginTop: 8, color: t.colors.text2, fontSize: 13 }}>
          Não foi possível carregar os vídeos agora.
        </Text>
      </View>
    );
  }

  const items = videosQ.data?.items ?? [];

  if (items.length === 0) return null;

  return (
    <View
      style={{
        marginTop: 18,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: t.colors.border,
        backgroundColor: "#FFF",
        padding: 16,
      }}
    >
      <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 16 }}>
        Vídeos de treinamento
      </Text>

      <Text style={{ marginTop: 4, color: t.colors.text2, fontSize: 12, fontWeight: "700" }}>
        Veja como usar o produto no salão
      </Text>

      <View style={{ marginTop: 14, gap: 12 }}>
        {items.map((video, index) => (
          <View
            key={video.id}
            style={{
              borderWidth: 1,
              borderColor: t.colors.border,
              borderRadius: 16,
              backgroundColor: t.colors.surface,
              padding: 14,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 15 }}>
                  {video.title}
                </Text>

                {!!video.description && (
                  <Text
                    style={{
                      marginTop: 6,
                      color: t.colors.text2,
                      fontSize: 13,
                      lineHeight: 18,
                      fontWeight: "600",
                    }}
                  >
                    {video.description}
                  </Text>
                )}

                <Text
                  style={{
                    marginTop: 8,
                    color: t.colors.text2,
                    fontSize: 11,
                    fontWeight: "700",
                  }}
                >
                  {video.mimeType || "vídeo"} • {formatBytes(video.sizeBytes)}
                </Text>
              </View>

              <View
                style={{
                  minWidth: 34,
                  height: 34,
                  borderRadius: 17,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#111827",
                }}
              >
                <Text style={{ color: "#FFF", fontWeight: "900", fontSize: 13 }}>▶</Text>
              </View>
            </View>

            <Pressable
              onPress={() => Linking.openURL(video.videoUrl)}
              style={{
                marginTop: 12,
                height: 42,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#111827",
              }}
            >
              <Text style={{ color: "#FFF", fontWeight: "900", fontSize: 13 }}>
                Assistir vídeo {items.length > 1 ? index + 1 : ""}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}