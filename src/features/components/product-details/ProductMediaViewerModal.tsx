import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  FlatList,
  Image,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { WebView } from "react-native-webview";

import type { ProductMedia } from "./productDetails.types";
import { s } from "./productDetails.styles";

type Props = {
  visible: boolean;
  media: ProductMedia[];
  initialIndex: number;
  onClose: () => void;
};

export function ProductMediaViewerModal({
  visible,
  media,
  initialIndex,
  onClose,
}: Props) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const listRef = useRef<FlatList<ProductMedia> | null>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const viewerWidth = Math.min(screenWidth - 24, 420);
  const viewerHeight = Math.min(screenHeight * 0.62, 430);

  useEffect(() => {
    if (!visible) return;

    const safeIndex =
      media.length === 0 ? 0 : Math.min(Math.max(initialIndex, 0), media.length - 1);

    setCurrentIndex(safeIndex);

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
  }

  function renderItem({ item }: { item: ProductMedia }) {
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
          <Image
            source={{ uri: imageUri }}
            style={{
              width: viewerWidth,
              height: viewerHeight,
              borderRadius: 18,
            }}
            resizeMode="contain"
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
    </Modal>
  );
}