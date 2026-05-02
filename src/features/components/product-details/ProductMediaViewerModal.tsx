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
  resetKey: string;
  onZoomStateChange?: (zoomed: boolean) => void;
};

function ZoomableImage({
  uri,
  width,
  height,
  enabled,
  resetKey,
  onZoomStateChange,
}: ZoomableImageProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  useEffect(() => {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedX.value = 0;
    savedY.value = 0;
  }, [resetKey, scale, savedScale, translateX, translateY, savedX, savedY]);
  useEffect(() => {
    onZoomStateChange?.(false);
  }, [onZoomStateChange, resetKey]);

  const pinch = Gesture.Pinch()
    .enabled(enabled)
    .onUpdate((e) => {
      const next = savedScale.value * e.scale;
      scale.value = Math.min(4, Math.max(1, next));
    })
.onEnd(() => {
  savedScale.value = scale.value;

  if (savedScale.value <= 1) {
    savedScale.value = 1;
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedX.value = 0;
    savedY.value = 0;

    if (onZoomStateChange) {
      runOnJS(onZoomStateChange)(false);
    }

    return;
  }

  if (onZoomStateChange) {
    runOnJS(onZoomStateChange)(true);
  }
});

  const doubleTap = Gesture.Tap()
    .enabled(enabled)
    .numberOfTaps(2)
    .onEnd(() => {
      const nextScale = savedScale.value > 1 ? 1 : 2;
      scale.value = withSpring(nextScale);
      savedScale.value = nextScale;
if (nextScale === 1) {
  translateX.value = withSpring(0);
  translateY.value = withSpring(0);
  savedX.value = 0;
  savedY.value = 0;
}

if (onZoomStateChange) {
  runOnJS(onZoomStateChange)(nextScale > 1);
}
    });

  const pan = Gesture.Pan()
    .enabled(enabled)
    .onUpdate((e) => {
      if (scale.value <= 1) return;
      const limitX = ((width * scale.value) - width) / 2;
      const limitY = ((height * scale.value) - height) / 2;
      const nextX = savedX.value + e.translationX;
      const nextY = savedY.value + e.translationY;
      translateX.value = Math.min(limitX, Math.max(-limitX, nextX));
      translateY.value = Math.min(limitY, Math.max(-limitY, nextY));
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  const composed = Gesture.Simultaneous(pinch, pan, doubleTap);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[s.viewerImageWrap, { width, height }]}>
        <Animated.Image
          source={{ uri }}
          style={[s.viewerImage, { width, height }, imageStyle]}
          resizeMode="contain"
        />
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

  const viewerWidth = Math.min(screenWidth - 24, 420);
  const viewerHeight = Math.min(screenHeight * 0.62, 430);

  useEffect(() => {
    if (!visible) return;

    const safeIndex =
      media.length === 0 ? 0 : Math.min(Math.max(initialIndex, 0), media.length - 1);

    setCurrentIndex(safeIndex);
    setIsCurrentImageZoomed(false);

    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex?.({
        index: safeIndex,
        animated: false,
      });
    });
  }, [visible, initialIndex, media.length]);

  const validMedia = useMemo(() => media ?? [], [media]);

function handleMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
  const x = e.nativeEvent.contentOffset.x;
  const next = Math.round(x / viewerWidth);
  setCurrentIndex(next);
  setIsCurrentImageZoomed(false);
}

  function renderItem({ item, index }: { item: ProductMedia; index: number }) {
    const isVideo = item?.type === "video";
    const imageUri = item?.thumbnailUrl || item?.url;

    return (
      <View style={[s.viewerPage, { width: viewerWidth, height: viewerHeight }]}>
        {isVideo ? (
          <View
            style={[
              s.viewerVideoCard,
              {
                width: viewerWidth,
                height: viewerHeight,
                borderRadius: 18,
              },
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
            resetKey={`${visible}-${currentIndex}-${item.id}`}
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

        <View style={s.viewerContent}>
          <View style={s.viewerHeader}>
            <Text style={s.viewerCounter}>
              {validMedia.length ? `${currentIndex + 1}/${validMedia.length}` : "0/0"}
            </Text>
          </View>

          <View style={[s.viewerBody, { height: viewerHeight }]}>
            <FlatList
              ref={listRef}
              data={validMedia}
              horizontal
              pagingEnabled
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