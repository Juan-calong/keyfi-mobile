import React, { useMemo, useState } from "react";
import { useNavigation } from "@react-navigation/native";

import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";
import { OWNER_SCREENS } from "../../navigation/owner.routes";
import { useAuthStore } from "../../stores/auth.store";
import { usePersistentCart } from "../../core/api/hooks/usePersistentCart";

import { IosAlert } from "../../ui/components/IosAlert";
import { friendlyError } from "../../core/errors/friendlyError";
import { IosConfirm, type IosConfirmAction } from "../../ui/components/IosConfirm";

import { SharedOwnerCustomerCartScreen } from "../../features/components/cart/SharedOwnerCustomerCartScreen";
import type { CartItem, CartPreviewItem, CartPreviewResp } from "../../features/components/cart/cart.shared.types";
import type { PersistentCart } from "../../core/api/services/cart.service";

function money(value: number | null | undefined) {
  return Number(value || 0).toFixed(2);
}

function mapPersistentCartToPreview(cart: PersistentCart): Pick<CartPreviewResp, "items" | "summary"> {
  const items: CartPreviewItem[] = cart.items.map((item) => ({
    productId: item.productId,
    qty: item.qty,
    product: {
      id: item.productId,
      name: item.name,
      imageUrl: item.image,
    },
    unitPriceBase: money(item.pricing.unitBase),
    unitPriceFinal: money(item.pricing.unitFinal),
    lineBase: money(item.pricing.lineBase),
    lineFinal: money(item.pricing.lineFinal),
    linePromoDiscount: money(item.pricing.lineBase - item.pricing.lineFinal),
    promo: item.pricing.promoLabel ? { label: item.pricing.promoLabel } : null,
  }));

  return {
    items,
    summary: {
      subtotalBase: money(cart.totals.subtotalBase),
      discountProducts: money(cart.totals.subtotalBase - cart.totals.subtotalAfterPromos),
      subtotalAfterPromos: money(cart.totals.subtotalAfterPromos),
      coupon: cart.coupon
        ? { code: cart.coupon.code, type: String(cart.coupon.type || ""), value: String(cart.coupon.value || "") }
        : null,
      couponDiscount: money(cart.totals.couponDiscount),
      shipping: money(0),
      total: money(cart.totals.total),
    },
  };
}

export function OwnerCartScreen() {
  const nav = useNavigation<any>();
  const token = useAuthStore((s) => s.token);
  const activeRole = useAuthStore((s) => s.activeRole);

  const {
    cart,
    cartQuery,
    addItemMutation,
    setItemQtyMutation,
    removeItemMutation,
    clearCartMutation,
    applyCouponMutation,
    removeCouponMutation,
  } = usePersistentCart({ token, activeRole });

  const [promoInput, setPromoInput] = useState("");
  const [banner, setBanner] = useState<null | { title: string; message: string }>(null);
  const [bannerKey, setBannerKey] = useState(0);

  const [modal, setModal] = useState<null | { title: string; message: string }>(null);
  const [confirm, setConfirm] = useState<null | { title: string; message: string; actions: IosConfirmAction[] }>(null);
  const [checkoutPending, setCheckoutPending] = useState(false);

  const mapped = useMemo(() => mapPersistentCartToPreview(cart), [cart]);
  const rows = mapped.items;
  const summary = mapped.summary;

  const cartItems = useMemo<CartItem[]>(() => cart.items.map((i) => ({ productId: i.productId, qty: i.qty })), [cart.items]);
  const itemsPayload = useMemo(() => cartItems.map((i) => ({ productId: i.productId, qty: i.qty })), [cartItems]);
  const appliedCoupon = cart.couponCode;

  const mutating =
    addItemMutation.isPending ||
    setItemQtyMutation.isPending ||
    removeItemMutation.isPending ||
    clearCartMutation.isPending ||
    applyCouponMutation.isPending ||
    removeCouponMutation.isPending;

  function showBanner(title: string, message: string) {
    setBannerKey((k) => k + 1);
    setBanner({ title, message });
  }

  React.useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 3500);
    return () => clearTimeout(t);
  }, [banner, bannerKey]);

  const onCheckoutPix = async () => {
    if (checkoutPending || mutating || itemsPayload.length <= 0) return;
    setCheckoutPending(true);

    try {
      const previewRes = await api.post<CartPreviewResp>(endpoints.cart.preview, {
        items: itemsPayload,
        couponCode: appliedCoupon || undefined,
        shipping: 0,
      });
      const preview = previewRes.data;
      const unavailable = preview.unavailable || [];

      if (unavailable.length > 0) {
        try {
          await Promise.all(unavailable.map((u) => removeItemMutation.mutateAsync(u.productId)));
          await cartQuery.refetch();
          showBanner(
            "Itens indisponíveis removidos",
            unavailable.length === 1
              ? "Removemos 1 item indisponível. Revise o carrinho e tente novamente."
              : `Removemos ${unavailable.length} itens indisponíveis. Revise o carrinho e tente novamente.`
          );
        } catch (e: any) {
          setModal({
            title: "Erro ao atualizar carrinho",
            message: friendlyError(e).message,
          });
        }
        return;
      }

      if (preview.canCheckout === false) {
        setModal({
          title: "Não foi possível continuar",
          message: "Seu carrinho precisa de ajustes antes de seguir para o frete.",
        });
        return;
      }
    } catch (e: any) {
      setModal({
        title: "Falha ao validar carrinho",
        message: friendlyError(e).message,
      });
      return;
    } finally {
      setCheckoutPending(false);
    }

    const typed = promoInput.trim().toUpperCase();
    const hasTypedButNotApplied = !!typed && typed !== (appliedCoupon || "");

    if (hasTypedButNotApplied) {
      setConfirm({
        title: "Aplicar cupom?",
        message: "Você digitou um cupom, mas ainda não clicou em Apply. Quer validar antes de finalizar?",
        actions: [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Validar",
            onPress: () =>
              applyCouponMutation.mutate(
                { code: typed },
                { onError: (e: any) => setModal({ title: "Cupom inválido", message: friendlyError(e).message }) }
              ),
          },
          {
            text: "Continuar sem cupom",
            style: "destructive",
            onPress: () => nav.navigate(OWNER_SCREENS.ShippingMethod, { items: itemsPayload, couponCode: appliedCoupon || undefined }),
          },
        ],
      });
      return;
    }

    nav.navigate(OWNER_SCREENS.ShippingMethod, { items: itemsPayload, couponCode: appliedCoupon || undefined });
  };

  return (
    <>
      <SharedOwnerCustomerCartScreen
        cartItemsLength={cart.items.length}
        rows={rows}
        summary={summary}
        isFirstLoad={cartQuery.isLoading && !cartQuery.data}
        showError={cartQuery.isError}
        onRetry={() => cartQuery.refetch()}
        banner={banner}
        onDismissBanner={() => setBanner(null)}
        onBack={() => nav.goBack?.()}
        onClearCart={() => {
          if (!cart.items.length || mutating) return;
          setConfirm({
            title: "Limpar carrinho?",
            message: "Isso vai remover todos os itens.",
            actions: [
              { text: "Cancelar", style: "cancel" },
              {
                text: "Limpar",
                style: "destructive",
                onPress: () =>
                  clearCartMutation.mutate(undefined, {
                    onSuccess: () => showBanner("Carrinho limpo", "Todos os itens foram removidos."),
                    onError: (e: any) =>
                      setModal({ title: "Erro ao limpar carrinho", message: friendlyError(e).message }),
                  }),
              },
            ],
          });
        }}
        promoInput={promoInput}
        onChangePromoInput={setPromoInput}
        onApplyCoupon={() => {
          const code = promoInput.trim().toUpperCase();
          if (!code || mutating) return;
          applyCouponMutation.mutate({ code }, { onError: (e: any) => setModal({ title: "Cupom inválido", message: friendlyError(e).message }) });
        }}
        applyCouponPending={applyCouponMutation.isPending}
        appliedCoupon={appliedCoupon}
        onRemoveCoupon={() => removeCouponMutation.mutate(undefined, { onSuccess: () => showBanner("Cupom removido", "O cupom foi removido do seu carrinho."), onError: (e: any) => setModal({ title: "Erro ao remover cupom", message: friendlyError(e).message }) })}
        onOpenProduct={(productId) => nav.navigate(OWNER_SCREENS.ProductDetails, { productId })}
        onInc={(productId) => {
          if (mutating) return;
          const current = cart.items.find((i) => i.productId === productId);
          if (!current) {
            return addItemMutation.mutate(
              { productId, qty: 1 },
              { onError: (e: any) => setModal({ title: "Erro ao atualizar item", message: friendlyError(e).message }) }
            );
          }
          setItemQtyMutation.mutate(
            { productId, payload: { qty: current.qty + 1 } },
            { onError: (e: any) => setModal({ title: "Erro ao atualizar item", message: friendlyError(e).message }) }
          );
        }}
        onDec={(productId) => {
          if (mutating) return;
          const current = cart.items.find((i) => i.productId === productId);
          if (!current) return;
          if (current.qty <= 1) {
            return removeItemMutation.mutate(productId, {
              onError: (e: any) => setModal({ title: "Erro ao remover item", message: friendlyError(e).message }),
            });
          }
          setItemQtyMutation.mutate(
            { productId, payload: { qty: current.qty - 1 } },
            { onError: (e: any) => setModal({ title: "Erro ao atualizar item", message: friendlyError(e).message }) }
          );
        }}
        onRemoveItem={(productId) =>
          !mutating &&
          removeItemMutation.mutate(productId, {
            onError: (e: any) => setModal({ title: "Erro ao remover item", message: friendlyError(e).message }),
          })
        }
        canCheckout={rows.length > 0}
        checkoutPending={checkoutPending}
        onCheckout={onCheckoutPix}
        onGoToShop={() => nav.navigate(OWNER_SCREENS.Root, { screen: OWNER_SCREENS.Tabs, params: { screen: OWNER_SCREENS.Buy } })}
      />

      <IosAlert visible={!!modal} title={modal?.title} message={modal?.message} onClose={() => setModal(null)} />
      <IosConfirm visible={!!confirm} title={confirm?.title} message={confirm?.message} actions={confirm?.actions || []} onClose={() => setConfirm(null)} />
    </>
  );
}