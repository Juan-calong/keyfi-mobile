import React, { useMemo, useRef, useState } from "react";
import {
    View,
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    NativeScrollEvent,
    NativeSyntheticEvent,
} from "react-native";
import { t } from "../tokens";
import { useBreakpoints } from "../responsive";

export type CarouselItem = {
    id: string;
    imageUri?: string | null; // quando você tiver imagem do backend
};

export function NewArrivalsCarousel({
    items,
    onPressItem,
}: {
    items: CarouselItem[];
    onPressItem: (id: string) => void;
}) {
    const bp = useBreakpoints();
    const listRef = useRef<FlatList<CarouselItem>>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const GAP = 12;
    const ITEM_W = useMemo(() => {
        // Ajusta bem no celular/tablet
        return bp.isTablet ? 260 : 210;
    }, [bp.isTablet]);
    const ITEM_H = bp.isTablet ? 160 : 140;

    const snap = ITEM_W + GAP;

    const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const x = e.nativeEvent.contentOffset.x;
        const idx = Math.round(x / snap);
        setActiveIndex(Math.max(0, Math.min(idx, items.length - 1)));
    };

    const goTo = (idx: number) => {
        const safe = Math.max(0, Math.min(idx, items.length - 1));
        listRef.current?.scrollToOffset({ offset: safe * snap, animated: true });
        setActiveIndex(safe);
    };

    return (
        <View>
            <View style={s.row}>
                <Pressable
                    onPress={() => goTo(activeIndex - 1)}
                    style={[s.arrow, activeIndex === 0 && { opacity: 0.35 }]}
                    disabled={activeIndex === 0}
                    hitSlop={10}
                >
                    <View style={s.arrowInner} />
                </Pressable>

                <Pressable
                    onPress={() => goTo(activeIndex + 1)}
                    style={[s.arrow, activeIndex >= items.length - 1 && { opacity: 0.35 }]}
                    disabled={activeIndex >= items.length - 1}
                    hitSlop={10}
                >
                    <View style={[s.arrowInner, { transform: [{ rotate: "180deg" }] }]} />
                </Pressable>
            </View>

            <FlatList
                ref={listRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                data={items}
                keyExtractor={(i) => i.id}
                contentContainerStyle={{ paddingRight: 4 }}
                style={{ marginTop: 10 }}
                snapToInterval={snap}
                decelerationRate="fast"
                bounces
                onMomentumScrollEnd={onScrollEnd}
                renderItem={({ item }) => (
                    <Pressable
                        onPress={() => onPressItem(item.id)}
                        style={{ marginRight: GAP }}
                    >
                        <View style={[s.card, { width: ITEM_W, height: ITEM_H }]}>
                            {item.imageUri ? (
                                <Image
                                    source={{ uri: item.imageUri }}
                                    style={s.img}
                                    resizeMode="cover"
                                />
                            ) : (
                                // fallback enquanto você não tem imagens
                                <View style={s.placeholder} />
                            )}
                        </View>
                    </Pressable>
                )}
            />

            { }
            <View style={s.dot}>
                {items.slice(0, 10).map((_, i) => (
                    <View key={i} style={[s.dot, i === activeIndex && s.dotActive]} />
                ))}
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    row: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
    arrow: {
        width: 40,
        height: 40,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: t.colors.border,
        backgroundColor: t.colors.surface,
        alignItems: "center",
        justifyContent: "center",
    },
    arrowInner: {
        width: 0,
        height: 0,
        borderTopWidth: 7,
        borderBottomWidth: 7,
        borderRightWidth: 10,
        borderTopColor: "transparent",
        borderBottomColor: "transparent",
        borderRightColor: t.colors.text,
        marginLeft: -2,
    },

    card: {
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: t.colors.border,
        backgroundColor: t.colors.surface,
    },
    img: { width: "100%", height: "100%" },
    placeholder: { flex: 1, backgroundColor: t.colors.surface2 },

    dot: {
        width: 6,
        height: 6,
        borderRadius: 99,
        backgroundColor: t.colors.surface3,
    },
    dotActive: { backgroundColor: t.colors.primary },
});
