import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  FlatList,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { WebView } from "react-native-webview";

import type { ProductMedia } from "./productDetails.types";
import { s } from "./productDetails.styles";
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";

type Props = {
  visible: boolean;
  media: ProductMedia[];
  initialIndex: number;
  onClose: () => void;
};

type ZoomableImageProps = {
  uri: string;
  width: number;
  height: number;
  enabled: boolean;
  isZoomed: boolean;
  zoomResetKey: string;
  imageLoadKey: string;
  onZoomStateChange?: (zoomed: boolean) => void;
};

function ZoomableImage({
  uri,
  width,
  height,
  enabled,
  isZoomed,
  zoomResetKey,
  imageLoadKey,
  onZoomStateChange,
}: ZoomableImageProps) {
  const ZOOM_THRESHOLD = 1.02;
  const MIN_SCALE = 1;
  const MAX_SCALE = 4;
  const DOUBLE_TAP_SCALE = 2;

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);
  const [loadState, setLoadState] = useState<"loaded" | "error">("loaded");
  const onZoomStateChangeRef = useRef(onZoomStateChange);

  useEffect(() => {
    onZoomStateChangeRef.current = onZoomStateChange;
  }, [onZoomStateChange]);

  function notifyZoomState(zoomed: boolean) {
    onZoomStateChangeRef.current?.(zoomed);
  }

  useEffect(() => {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedX.value = 0;
    savedY.value = 0;
    onZoomStateChangeRef.current?.(false);
  }, [zoomResetKey]);

  useEffect(() => {
    setLoadState("loaded");
  }, [imageLoadKey]);

  useAnimatedReaction(
    () => scale.value > ZOOM_THRESHOLD,
    (isZoomed, prevIsZoomed) => {
      if (isZoomed !== prevIsZoomed) {
        runOnJS(notifyZoomState)(isZoomed);
      }
    }
  );

  const resetZoom = () => {
    "worklet";

    scale.value = withSpring(MIN_SCALE);
    savedScale.value = MIN_SCALE;

    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedX.value = 0;
    savedY.value = 0;

    runOnJS(notifyZoomState)(false);
  };

  const pinch = Gesture.Pinch()
    .enabled(enabled)
    .onStart(() => {
      runOnJS(notifyZoomState)(true);
    })
    .onUpdate((e) => {
      const next = savedScale.value * e.scale;
      scale.value = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    })
    .onEnd(() => {
      if (scale.value <= ZOOM_THRESHOLD) {
        resetZoom();
        return;
      }

      if (scale.value > MAX_SCALE) {
        scale.value = withSpring(MAX_SCALE);
        savedScale.value = MAX_SCALE;
      } else {
        savedScale.value = scale.value;
      }

      runOnJS(notifyZoomState)(true);
    })
    .onFinalize(() => {
      if (scale.value <= ZOOM_THRESHOLD) {
        runOnJS(notifyZoomState)(false);
      }
    });

  const doubleTap = Gesture.Tap()
    .enabled(enabled)
    .numberOfTaps(2)
    .onEnd(() => {
      const shouldReset = scale.value > ZOOM_THRESHOLD;

      if (shouldReset) {
        resetZoom();
        return;
      }

      scale.value = withSpring(DOUBLE_TAP_SCALE);
      savedScale.value = DOUBLE_TAP_SCALE;
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      savedX.value = 0;
      savedY.value = 0;

      runOnJS(notifyZoomState)(true);
    });

  const pan = Gesture.Pan()
    .enabled(enabled && isZoomed)
    .minDistance(6)
    .onUpdate((e) => {
      if (scale.value <= ZOOM_THRESHOLD) {
        return;
      }

      const limitX = (width * scale.value - width) / 2;
      const limitY = (height * scale.value - height) / 2;

      const nextX = savedX.value + e.translationX;
      const nextY = savedY.value + e.translationY;

      translateX.value = Math.min(limitX, Math.max(-limitX, nextX));
      translateY.value = Math.min(limitY, Math.max(-limitY, nextY));
    })
    .onEnd(() => {
      if (scale.value <= ZOOM_THRESHOLD) {
        translateX.value = 0;
        translateY.value = 0;
        savedX.value = 0;
        savedY.value = 0;
        return;
      }

      savedX.value = translateX.value;
      savedY.value = translateY.value;
      runOnJS(notifyZoomState)(true);
    });

  const composed = Gesture.Simultaneous(pinch, pan, doubleTap);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[s.viewerImageWrap, { width, height }]}>
        <Animated.Image
          source={{ uri }}
          style={[
            s.viewerImage,
            { width, height },
            imageStyle,
          ]}
          resizeMode="contain"
          onLoad={() => setLoadState("loaded")}
          onError={() => setLoadState("error")}
        />

        {loadState === "error" ? (
          <View
            pointerEvents="none"
            style={[s.viewerImageFallback, { width, height }]}
          >
            <Text style={s.viewerImageFallbackText}>Imagem indisponível</Text>
          </View>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

export function ProductMediaViewerModal({
  visible,
  media,
  initialIndex,
  onClose,
}: Props) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const listRef = useRef<FlatList<ProductMedia> | null>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isCurrentImageZoomed, setIsCurrentImageZoomed] = useState(false);

  const isTablet = screenWidth >= 768;
  const isTabletLandscape = isTablet && screenWidth > screenHeight;
  const viewerHeight = Math.min(screenHeight * 0.62, 445);
  const viewerHorizontalInset = isTabletLandscape ? 24 : 48;
  const viewerMaxWidth = isTabletLandscape ? screenWidth - 24 : 400;

const viewerWidth = Math.max(
  1,
  Math.round(Math.min(screenWidth - viewerHorizontalInset, viewerMaxWidth))
);
  const viewerWidthStyle = { width: viewerWidth };
  const pageStyle = { width: viewerWidth, height: viewerHeight };

  useEffect(() => {
    if (!visible) return;

    const safeIndex =
      media.length === 0 ? 0 : Math.min(Math.max(initialIndex, 0), media.length - 1);

    setCurrentIndex(safeIndex);
    setIsCurrentImageZoomed(false);
  }, [visible, initialIndex, media.length]);

  useEffect(() => {
    if (!visible) {
      setIsCurrentImageZoomed(false);
    }
  }, [visible]);
  

  const validMedia = useMemo(() => media ?? [], [media]);

  useEffect(() => {
    if (!visible || viewerWidth <= 0 || validMedia.length === 0) return;

    const safeIndex =
      Math.min(Math.max(initialIndex, 0), validMedia.length - 1);

    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex?.({
        index: safeIndex,
        animated: false,
      });
    });
  }, [visible, viewerWidth, initialIndex, validMedia.length]);

  function handleMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (viewerWidth <= 0) return;

    const x = e.nativeEvent.contentOffset.x;
    const next = Math.min(
      Math.max(Math.round(x / viewerWidth), 0),
      validMedia.length - 1
    );
    setCurrentIndex(next);
    setIsCurrentImageZoomed(false);
  }

  useEffect(() => {
    setIsCurrentImageZoomed(false);
  }, [currentIndex]);

  function renderItem({ item, index }: { item: ProductMedia; index: number }) {
    const isVideo = item?.type === "video";
    const imageUri = item?.thumbnailUrl || item?.url;

    return (
      <View style={[s.viewerPage, pageStyle]}>
        {isVideo ? (
          <View
            style={[
              s.viewerVideoCard,
              pageStyle,
              { borderRadius: 18 },
            ]}
          >
            {item?.url ? (
              <WebView
                source={{ uri: item.url }}
                style={s.videoWebview}
                allowsFullscreenVideo
                mediaPlaybackRequiresUserAction={false}
              />
            ) : (
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                  Vídeo indisponível
                </Text>
              </View>
            )}
          </View>
        ) : imageUri ? (
          <ZoomableImage
            uri={imageUri}
            width={viewerWidth}
            height={viewerHeight}
            enabled={currentIndex === index}
            isZoomed={currentIndex === index && isCurrentImageZoomed}
            zoomResetKey={`${visible}-${currentIndex}-${item.id}`}
            imageLoadKey={imageUri}
            onZoomStateChange={(zoomed) => {
              if (index === currentIndex) setIsCurrentImageZoomed(zoomed);
            }}
          />
        ) : (
          <View
            style={{
              width: viewerWidth,
              height: viewerHeight,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.08)",
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Sem mídia</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <Modal
  visible={visible}
  transparent
  animationType="fade"
  onRequestClose={onClose}
  statusBarTranslucent
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={s.viewerRoot}>
        <Pressable style={s.viewerBackdrop} onPress={onClose} />

        <View style={[s.viewerContent, viewerWidthStyle]}>
          <View style={s.viewerHeader}>
            <Text style={s.viewerCounter}>
              {validMedia.length ? `${currentIndex + 1}/${validMedia.length}` : "0/0"}
            </Text>
          </View>

          <View style={[s.viewerBody, viewerWidthStyle, { height: viewerHeight }]}>
            {validMedia.length > 0 ? (
              <FlatList
                ref={listRef}
                data={validMedia}
                extraData={`${currentIndex}-${isCurrentImageZoomed}`}
                horizontal
                pagingEnabled
                style={viewerWidthStyle}
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item, idx) => `${item?.type}-${item?.id ?? idx}`}
                renderItem={renderItem}
                onMomentumScrollEnd={handleMomentumEnd}
                getItemLayout={(_, index) => ({
                  length: viewerWidth,
                  offset: viewerWidth * index,
                  index,
                })}
                scrollEnabled={!isCurrentImageZoomed}
              />
            ) : null}
          </View>

          {validMedia.length > 1 ? (
            <View style={s.viewerDotsWrap}>
              {validMedia.map((item, idx) => {
                const isVideo = item?.type === "video";
                const active = idx === currentIndex;

                return (
                  <View
                    key={`${item?.id ?? idx}-${idx}`}
                    style={[
                      s.viewerDot,
                      active && s.viewerDotActive,
                      isVideo && s.viewerDotVideo,
                      isVideo && active && s.viewerDotVideoActive,
                    ]}
                  />
                );
              })}
            </View>
          ) : null}
        </View>
      </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
