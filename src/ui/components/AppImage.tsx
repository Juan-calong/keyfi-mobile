import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  View,
  type ImageResizeMode,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

type AppImageProps = {
  uri?: string | null;
  placeholderUri?: string | null;
  style?: StyleProp<ViewStyle>;
  resizeMode?: ImageResizeMode;
  backgroundColor?: string;
  fallbackLabel?: string;
  fallbackIconSize?: number;
};

const DEFAULT_BG = "#F7F4F3";
const FALLBACK_BG = "#F4EFE3";
const GOLD = "#B8943C";

export function AppImage({
  uri,
  placeholderUri,
  style,
  resizeMode = "cover",
  backgroundColor = DEFAULT_BG,
  fallbackLabel = "Sem imagem",
  fallbackIconSize = 26,
}: AppImageProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "error">(
    uri ? "loading" : "idle"
  );
  const pulse = useRef(new Animated.Value(0.25)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    setStatus(uri ? "loading" : "idle");
  }, [uri]);

  useEffect(() => {
    if (status !== "loading" || !uri) {
      loopRef.current?.stop?.();
      loopRef.current = null;
      pulse.setValue(0.25);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.55,
          duration: 720,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.25,
          duration: 720,
          useNativeDriver: true,
        }),
      ])
    );

    loopRef.current = animation;
    animation.start();

    return () => {
      animation.stop();
    };
  }, [pulse, status, uri]);

  const showFallback = status === "error" || !uri;
  const showImage = Boolean(uri) && status !== "error";

  return (
    <View style={[styles.container, { backgroundColor }, style]}>
      {showImage ? (
        <>
          {placeholderUri && placeholderUri !== uri ? (
            <Image
              source={{ uri: placeholderUri }}
              style={styles.image}
              resizeMode={resizeMode}
            />
          ) : null}

          <Image
            source={{ uri: uri as string }}
            style={[styles.image, status === "loaded" ? styles.imageVisible : styles.imageHidden]}
            resizeMode={resizeMode}
            onLoad={() => setStatus("loaded")}
            onError={() => setStatus("error")}
          />
        </>
      ) : null}

      {status === "loading" ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.placeholder, { opacity: pulse }]}
        >
          <View style={styles.placeholderCard} />
          <View style={styles.placeholderLine} />
        </Animated.View>
      ) : null}

      {showFallback ? (
        <View style={styles.fallback}>
          <Icon name="image-outline" size={fallbackIconSize} color={GOLD} />
          <Text style={styles.fallbackText} numberOfLines={1}>
            {fallbackLabel}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    alignItems: "stretch",
    justifyContent: "center",
  },

  image: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },

  imageVisible: {
    opacity: 1,
  },

  imageHidden: {
    opacity: 0,
  },

  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: FALLBACK_BG,
    paddingHorizontal: 16,
  },

  placeholderCard: {
    width: "58%",
    maxWidth: 120,
    minWidth: 72,
    aspectRatio: 1,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.32)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.04)",
  },

  placeholderLine: {
    marginTop: 12,
    width: "42%",
    maxWidth: 92,
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.34)",
  },

  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: FALLBACK_BG,
    gap: 4,
    paddingHorizontal: 12,
  },

  fallbackText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    color: "#7A7165",
  },
});
