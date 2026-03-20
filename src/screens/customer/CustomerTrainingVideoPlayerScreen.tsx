import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import Video from "react-native-video";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { t } from "../../ui/tokens";
import { CUSTOMER_SCREENS, CustomerStackParamList } from "../../navigation/customer.routes";

type PlayerRoute = RouteProp<
  CustomerStackParamList,
  typeof CUSTOMER_SCREENS.TrainingVideoPlayer
>;

type Nav = NativeStackNavigationProp<CustomerStackParamList>;

export function CustomerTrainingVideoPlayerScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<PlayerRoute>();

  const { title, description, productName, videoUrl } = route.params ?? {};
const safeVideoUrl = typeof videoUrl === "string" && videoUrl.trim().length > 0 ? videoUrl : undefined;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canPlay = useMemo(() => {
  return typeof safeVideoUrl === "string" && safeVideoUrl.trim().length > 0;
}, [safeVideoUrl]);

  return (
    <Screen>
      <Container style={{ flex: 1, paddingTop: 24 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={{ color: t.colors.text, fontWeight: "800", fontSize: 14 }}>
              Voltar
            </Text>
          </Pressable>

          <Text style={{ color: t.colors.text, fontWeight: "900", fontSize: 16 }}>
            Vídeo
          </Text>

          <View style={{ width: 44 }} />
        </View>

        {!!productName && (
          <Text
            style={{
              color: t.colors.text2,
              fontWeight: "800",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            {productName}
          </Text>
        )}

        <Text
          style={{
            marginTop: 6,
            color: t.colors.text,
            fontWeight: "900",
            fontSize: 22,
            lineHeight: 28,
          }}
        >
          {title || "Vídeo de treinamento"}
        </Text>

        {!!description && (
          <Text
            style={{
              marginTop: 8,
              color: t.colors.text2,
              fontWeight: "600",
              fontSize: 14,
              lineHeight: 20,
            }}
          >
            {description}
          </Text>
        )}

        <View style={{ height: 18 }} />

        <View
          style={{
            width: "100%",
            aspectRatio: 16 / 9,
            borderRadius: 18,
            overflow: "hidden",
            backgroundColor: "#000",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {!canPlay ? (
            <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 14 }}>
              Vídeo indisponível
            </Text>
          ) : (
            <>
              <Video
                source={{ uri: safeVideoUrl }}
                style={{ width: "100%", height: "100%" }}
                controls
                resizeMode="contain"
                paused={false}
                onLoadStart={() => {
                  setLoading(true);
                  setError(null);
                }}
                onLoad={() => {
                  setLoading(false);
                  setError(null);
                }}
                onError={(e) => {
                  setLoading(false);
                  setError("Não foi possível carregar este vídeo.");
                  console.log("[TRAINING_VIDEO_PLAYER][ERROR]", e);
                }}
              />

              {loading && !error ? (
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(0,0,0,0.22)",
                  }}
                >
                  <ActivityIndicator />
                  <Text
                    style={{
                      marginTop: 8,
                      color: "#FFF",
                      fontWeight: "700",
                      fontSize: 13,
                    }}
                  >
                    Carregando vídeo...
                  </Text>
                </View>
              ) : null}

              {error ? (
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 18,
                    backgroundColor: "rgba(0,0,0,0.45)",
                  }}
                >
                  <Text
                    style={{
                      color: "#FFF",
                      fontWeight: "800",
                      fontSize: 14,
                      textAlign: "center",
                    }}
                  >
                    {error}
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </View>
      </Container>
    </Screen>
  );
}