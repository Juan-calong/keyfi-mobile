import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  ViewToken,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";

type BannerItem = {
  id: string;
  imageUrl: string;
};

type Props = {
  items: BannerItem[];
  onPressItem: (item: BannerItem) => void;
  autoSlideInterval?: number;
};

export function HomeHeroCarousel({
  items,
  onPressItem,
  autoSlideInterval = 3500,
}: Props) {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<BannerItem> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);

  const bannerWidth = useMemo(() => width, [width]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems?.[0];
      if (typeof first?.index === "number") {
        setActiveIndex(first.index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  function stopAutoSlide() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function startAutoSlide() {
    stopAutoSlide();

    if (items.length <= 1) return;

    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const nextIndex = prev + 1 >= items.length ? 0 : prev + 1;

        listRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });

        return nextIndex;
      });
    }, autoSlideInterval);
  }

  useEffect(() => {
    startAutoSlide();

    return () => {
      stopAutoSlide();
    };
  }, [items.length, autoSlideInterval]);

  useEffect(() => {
    if (activeIndex >= items.length && items.length > 0) {
      setActiveIndex(0);
      listRef.current?.scrollToIndex({
        index: 0,
        animated: false,
      });
    }
  }, [activeIndex, items.length]);

  function handleMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x;
    const nextIndex = Math.round(x / bannerWidth);

    if (Number.isFinite(nextIndex)) {
      setActiveIndex(nextIndex);
    }

    startAutoSlide();
  }

  if (!items.length) return null;

  if (items.length === 1) {
    const item = items[0];

    return (
      <Pressable
        onPress={() => onPressItem(item)}
        style={[styles.singleWrap, { width: bannerWidth }]}
      >
        <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
      </Pressable>
    );
  }

  return (
    <View>
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={bannerWidth}
        snapToAlignment="start"
        disableIntervalMomentum
        onScrollBeginDrag={stopAutoSlide}
        onMomentumScrollEnd={handleMomentumEnd}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: bannerWidth,
          offset: bannerWidth * index,
          index,
        })}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onPressItem(item)}
            style={[styles.slideWrap, { width: bannerWidth }]}
          >
            <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
          </Pressable>
        )}
      />

      <View style={styles.dotsWrap}>
        {items.map((_, index) => (
          <View
            key={index}
            style={[styles.dot, index === activeIndex && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  singleWrap: {
    height: 250,
    borderRadius: 5,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  slideWrap: {
    height: 230,
    borderRadius: 5,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  dotsWrap: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  dotActive: {
    width: 18,
    backgroundColor: "#111",
  },
});