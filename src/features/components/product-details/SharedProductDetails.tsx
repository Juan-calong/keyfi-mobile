import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  StatusBar,
  FlatList,
  ScrollView,
  useWindowDimensions,
  Modal,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

import { Screen } from "../../../ui/components/Screen";
import { Container } from "../../../ui/components/Container";
import { Loading, ErrorState } from "../../../ui/components/State";
import { IosAlert } from "../../../ui/components/IosAlert";
import { friendlyError } from "../../../core/errors/friendlyError";
import { ProductFavoriteButton } from "./ProductFavoriteButton";

import { ExpandableInfoText } from "./ExpandableInfoText";
import LinearGradient from "react-native-linear-gradient";

import type {
  Product,
  RelatedProduct,
  ProductMedia,
  BasicQueryState,
} from "./productDetails.types";
import {
  COLORS,
  formatBRL,
  getEffectivePrice,
  getPrimaryProductImage,
  getProductDescription,
  getSafeHighlights,
  isOutOfStock,
  normalizeGalleryMedia,
} from "./productDetails.utils";
import { s } from "./productDetails.styles";
import { ProductMediaViewerModal } from "./ProductMediaViewerModal";

function InfoItem({
  icon,
  label,
  value,
  onPress,
}: {
  icon: string;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        s.infoItem,
        onPress && pressed && { opacity: 0.72 },
      ]}
    >
      <View style={s.infoIconWrap}>
        <Icon name={icon} size={16} color={COLORS.textSoft} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </Pressable>
  );
}

type Props = {
  product: Product | undefined;
  productQuery: BasicQueryState;
  relatedQuery: BasicQueryState;
  relatedItems: RelatedProduct[];
  onBack: () => void;
  onOpenRelatedProduct: (productId: string) => void;
  onAddToCart: (productId: string) => void;
  onGoToCart: () => void;
  qtyInCart: number;
  allowVideos?: boolean;
};


export function SharedProductDetails({
  product,
  productQuery,
  relatedQuery,
  relatedItems,
  onBack,
  onOpenRelatedProduct,
  onAddToCart,
  onGoToCart,
  qtyInCart,
  allowVideos = false,
}: Props) {
  const { width: screenWidth } = useWindowDimensions();

  const [modal, setModal] = useState<null | { title: string; message: string }>(null);
  const [banner, setBanner] = useState<null | { title: string; message: string }>(null);
  const [bannerKey, setBannerKey] = useState(0);
  const [effectVisible, setEffectVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const galleryListRef = useRef<FlatList<ProductMedia> | null>(null);
  const addLock = useRef(false);

  React.useEffect(() => {
    if (!banner) return;
    const tmr = setTimeout(() => setBanner(null), 3500);
    return () => clearTimeout(tmr);
  }, [banner, bannerKey]);

  React.useEffect(() => {
    setViewerIndex(null);
    galleryListRef.current?.scrollToOffset?.({ offset: 0, animated: false });
  }, [product?.id]);

  const galleryCardWidth = screenWidth - 34;
  const galleryHeight = Math.min(Math.max(screenWidth * 0.64, 250), 360);

  const out = product ? isOutOfStock(product) : false;
  const alreadyInCart = !!product && qtyInCart > 0;

  const basePrice = product ? getEffectivePrice(product) : null;
  const hasPromo = product?.activePromo?.promoPrice != null;

  const galleryMedia = useMemo(
    () => normalizeGalleryMedia(product, { allowVideos }),
    [product, allowVideos]
  );

  const productDescription = useMemo(() => getProductDescription(product), [product]);

  const brandValue = product?.brand?.trim() || "Profissional";
  const volumeValue = product?.volume?.trim() || "—";
  const lineValue = product?.line?.trim() || "Beauty Care";
  const effectText = product?.effect?.trim() || "";
  const safeHighlights = useMemo(() => getSafeHighlights(product), [product]);

  function showBanner(title: string, message: string) {
    setBannerKey((k) => k + 1);
    setBanner({ title, message });
  }

  function handleAddToCart() {
    if (!product) return;

    if (out) {
      showBanner("Sem estoque", "Esse produto está sem estoque no momento.");
      return;
    }

    if (alreadyInCart) return;
    if (addLock.current) return;

    addLock.current = true;

    try {
      onAddToCart(product.id);
      showBanner("Pronto", "Produto adicionado ao carrinho.");
    } catch (e: any) {
      const fe: any = friendlyError(e);
      setModal({
        title: String(fe?.title || "Erro"),
        message: String(fe?.message || "Não foi possível adicionar ao carrinho."),
      });
    } finally {
      setTimeout(() => {
        addLock.current = false;
      }, 300);
    }
  }

  return (
    <Screen style={{ backgroundColor: COLORS.bg as any }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <Container style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <View style={s.header}>
          <Pressable
            onPress={onBack}
            hitSlop={10}
            style={({ pressed }) => [s.back, pressed && { opacity: 0.7 }]}
          >
            <Text style={s.chev}>{"<"}</Text>
            <Text style={s.backText}>Back</Text>
          </Pressable>

          <Text style={s.headerTitle}>Detalhes</Text>
          <View style={{ width: 52 }} />
        </View>

        {banner ? (
          <View style={s.bannerWrap}>
            <View style={s.bannerCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.bannerTitle}>{banner.title}</Text>
                <Text style={s.bannerMsg}>{banner.message}</Text>
              </View>

              <Pressable
                onPress={() => setBanner(null)}
                hitSlop={10}
                style={({ pressed }) => [s.bannerBtn, pressed && { opacity: 0.6 }]}
              >
                <Text style={s.bannerBtnText}>OK</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {productQuery.isLoading ? (
          <Loading />
        ) : productQuery.isError ? (
          <ErrorState onRetry={() => productQuery.refetch?.()} />
        ) : !product ? (
          <View style={{ marginTop: 20 }}>
            <Text style={{ color: COLORS.text, fontWeight: "800" }}>
              Produto não encontrado.
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scrollContent}
          >
            <View style={s.mainCard}>
              <View style={[s.galleryWrap, { height: galleryHeight }]}>
                {galleryMedia.length > 0 ? (
                  <FlatList
                    ref={galleryListRef}
                    data={galleryMedia}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => `${item.type}-${item.id}`}
                    renderItem={({ item, index }) => {
                      const isVideo = item.type === "video";
                      const imageSource = item.thumbnailUrl || item.url;

                      return (
                        <View
                          style={[
                            s.galleryItem,
                            { width: galleryCardWidth, height: galleryHeight },
                          ]}
                        >
                          <Pressable
                            onPress={() => setViewerIndex(index)}
                            style={({ pressed }) => [
                              s.galleryPressable,
                              pressed && { opacity: 0.96 },
                            ]}
                          >
                            {imageSource ? (
                              <Image
                                source={{ uri: imageSource }}
                                style={s.heroImg}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={s.heroPh}>
                                <Text style={s.phText}>
                                  {isVideo ? "Sem capa" : "Sem imagem"}
                                </Text>
                              </View>
                            )}

                            {isVideo ? (
                              <View style={s.videoBadge}>
                                <Icon name="play-circle" size={18} color="#FFFFFF" />
                                <Text style={s.videoBadgeText}>Vídeo</Text>
                              </View>
                            ) : null}

                            {out && index === 0 ? (
                              <View style={s.stockBadge}>
                                <Text style={s.stockBadgeText}>Sem estoque</Text>
                              </View>
                            ) : null}
                          </Pressable>
                        </View>
                      );
                    }}
                  />
                ) : (
                  <View style={s.galleryEmpty}>
                    <Text style={s.phText}>Sem mídia</Text>
                  </View>
                )}
              </View>

              <View style={s.cardContent}>
                <View style={s.titleRow}>
                  <Text style={s.name}>{product.name}</Text>

                  <ProductFavoriteButton
                    productId={product.id}
                    initialFavorited={!!product.isFavorite}
                  />
                </View>

                <View style={s.priceArea}>
                  {hasPromo ? (
                    <View style={s.priceInline}>
                      <Text style={s.pricePromo}>
                        {formatBRL(product.activePromo!.promoPrice!)}
                      </Text>
                      <Text style={s.oldPrice}>{formatBRL(basePrice!)}</Text>
                    </View>
                  ) : (
                    <Text style={s.price}>{formatBRL(basePrice!)}</Text>
                  )}
                </View>

                <View style={s.separator} />

                <ExpandableInfoText
                  title="Descrição"
                  text={productDescription}
                  previewLines={4}
                  buttonLabel="Ver mais"
                />

                <View style={s.separator} />
<View style={s.infoSection}>
  <View style={s.infoGrid}>
    <InfoItem icon="pricetag-outline" label="Marca" value={brandValue} />
    <InfoItem icon="cube-outline" label="Volume" value={volumeValue} />
    <InfoItem icon="sparkles-outline" label="Linha" value={lineValue} />
    <InfoItem
      icon="water-outline"
      label="Efeito"
      value={effectText || "Toque para ver"}
      onPress={() => setEffectVisible(true)}
    />
  </View>
</View>

                {safeHighlights.length > 0 ? (
                  <View style={s.highlightsSection}>
                    <Text style={s.highlightsTitle}>Destaques</Text>

                    <View style={s.hlWrap}>
                      {safeHighlights.map((txt, idx) => (
                        <View key={`${idx}-${txt}`} style={s.hlChip}>
                          <Text style={s.hlChipText} numberOfLines={1} ellipsizeMode="tail">
                            {txt}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                <Pressable
                  onPress={alreadyInCart ? onGoToCart : handleAddToCart}
                  disabled={out}
                  style={({ pressed }) => [
                    s.buyBtnBlack,
                    pressed && !out && { opacity: 0.9 },
                    out && { opacity: 0.4 },
                  ]}
                >
                  <Icon name="bag-handle-outline" size={18} color="#FFFFFF" />
                  <Text style={s.buyBtnBlackText}>
                    {out
                      ? "Sem estoque"
                      : alreadyInCart
                      ? "Ir para o carrinho"
                      : "Adicionar ao carrinho"}
                  </Text>
                </Pressable>

                {alreadyInCart && !out ? (
                  <Text style={s.subHint}>Já adicionado — finalize no carrinho</Text>
                ) : null}
              </View>
            </View>


            {relatedQuery.isLoading ? (
              <View style={s.relatedSection}>
                <View style={s.relatedHeader}>
                  <Text style={s.relatedTitle}>Produtos relacionados</Text>
                </View>
                <Text style={s.relatedLoading}>Carregando...</Text>
              </View>
            ) : relatedQuery.isError ? (
              <View style={s.relatedSection}>
                <View style={s.relatedHeader}>
                  <Text style={s.relatedTitle}>Produtos relacionados</Text>
                </View>
                <Text style={s.relatedLoading}>
                  Não foi possível carregar os relacionados.
                </Text>
              </View>
            ) : relatedItems.length > 0 ? (
              <View style={s.relatedSection}>
                <View style={s.relatedHeader}>
                  <Text style={s.relatedTitle}>Produtos relacionados</Text>
                </View>

                <FlatList
                  data={relatedItems}
                  horizontal
                  keyExtractor={(item) => item.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.relatedListContent}
                  ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                  renderItem={({ item }) => {
                    const relatedImg = getPrimaryProductImage(item as any);
                    const relatedOut = isOutOfStock(item);

                    return (
                      <Pressable
                        onPress={() => onOpenRelatedProduct(item.id)}
                        style={({ pressed }) => [
                          s.relatedCard,
                          pressed && { opacity: 0.88 },
                        ]}
                      >
                        <View style={s.relatedImageWrap}>
                          {relatedImg ? (
                            <Image
                              source={{ uri: relatedImg }}
                              style={s.relatedImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={s.relatedImageFallback}>
                              <Text style={s.relatedImageFallbackText}>Sem imagem</Text>
                            </View>
                          )}
                        </View>

                        <Text style={s.relatedName} numberOfLines={2}>
                          {item.name}
                        </Text>

                        <Text style={s.relatedPrice} numberOfLines={1}>
                          {formatBRL(
                            item.effectivePrice ?? item.customerPrice ?? item.price
                          )}
                        </Text>

                        <View style={[s.relatedBtn, relatedOut && s.relatedBtnDisabled]}>
                          <Text style={s.relatedBtnText}>
                            {relatedOut ? "Indisponível" : "Ver mais"}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  }}
                />
              </View>
            ) : null}
          </ScrollView>
        )}

        <ProductMediaViewerModal
          visible={viewerIndex !== null}
          media={galleryMedia}
          initialIndex={viewerIndex ?? 0}
          onClose={() => setViewerIndex(null)}
        />

        <Modal
  visible={effectVisible}
  transparent
  animationType="fade"
  onRequestClose={() => setEffectVisible(false)}
>
  <View
    style={{
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "center",
      padding: 20,
    }}
  >
    <View
      style={{
        maxHeight: "72%",
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: "#ECECEC",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{
            flex: 1,
            fontSize: 16,
            fontWeight: "800",
            color: "#111827",
            marginRight: 12,
          }}
        >
          Efeito
        </Text>

        <Pressable
          onPress={() => setEffectVisible(false)}
          hitSlop={10}
          style={({ pressed }) => [pressed && { opacity: 0.7 }]}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "800",
              color: "#111827",
            }}
          >
            Fechar
          </Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16 }}
      >
        <Text
          style={{
            fontSize: 15,
            lineHeight: 24,
            color: "#374151",
          }}
        >
          {effectText || "Sem efeito informado para este produto."}
        </Text>
      </ScrollView>
    </View>
  </View>
</Modal>

        <IosAlert
          visible={!!modal}
          title={modal?.title}
          message={modal?.message}
          onClose={() => setModal(null)}
        />
      </Container>
    </Screen>
  );
}