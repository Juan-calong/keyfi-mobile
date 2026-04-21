import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";

import { api } from "../../core/api/client";
import { useCartStore } from "../../stores/cart.store";
import { endpoints } from "../../core/api/endpoints";
import { CUSTOMER_SCREENS } from "../../navigation/customer.routes";

import { IosAlert } from "../../ui/components/IosAlert";
import { friendlyError } from "../../core/errors/friendlyError";
import { IosConfirm, type IosConfirmAction } from "../../ui/components/IosConfirm";

import { SharedOwnerCustomerCartScreen } from "../../features/components/cart/SharedOwnerCustomerCartScreen";
import type { CartItem, CartPreviewResp } from "../../features/components/cart/cart.shared.types";
import { toNumberBR } from "../../features/components/cart/cart.shared.utils";

const CART_PREVIEW_URL = endpoints.cart.preview;

export function CustomerCartScreen() {
  const nav = useNavigation<any>();
  const qc = useQueryClient();

  const qtyById = useCartStore((s) => s.qtyById);
  const inc = useCartStore((s) => s.inc);
  const dec = useCartStore((s) => s.dec);
  const remove = useCartStore((s) => s.remove);
  const clearCart = useCartStore((s) => s.clear);

  const [promoInput, setPromoInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

  const [banner, setBanner] = useState<null | { title: string; message: string }>(null);
  const [bannerKey, setBannerKey] = useState(0);

  const [modal, setModal] = useState<null | { title: string; message: string }>(null);

  const [confirm, setConfirm] = useState<
    | null
    | {
        title: string;
        message: string;
        actions: IosConfirmAction[];
      }
  >(null);

  function showBanner(title: string, message: string) {
    setBannerKey((k) => k + 1);
    setBanner({ title, message });
  }

  React.useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 3500);
    return () => clearTimeout(t);
  }, [banner, bannerKey]);

  const cartItems = useMemo<CartItem[]>(() => {
    return Object.entries(qtyById || {})
      .map(([productId, qty]) => ({ productId, qty: Number(qty) || 0 }))
      .filter((x) => x.qty > 0);
  }, [qtyById]);

  const itemsPayload = useMemo(
    () => cartItems.map((i) => ({ productId: i.productId, qty: i.qty })),
    [cartItems]
  );

  const itemsKey = useMemo(() => {
    const sorted = [...itemsPayload].sort((a, b) => a.productId.localeCompare(b.productId));
    return JSON.stringify(sorted);
  }, [itemsPayload]);

  const previewQ = useQuery({
    queryKey: ["customer-cart-preview", itemsKey, appliedCoupon],
    enabled: itemsPayload.length > 0,
    queryFn: async () => {
      const res = await api.post<CartPreviewResp>(CART_PREVIEW_URL, {
        items: itemsPayload,
        couponCode: appliedCoupon || undefined,
        shipping: 0,
      });
      return res.data;
    },
    retry: false,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  const applyCouponMut = useMutation({
    mutationFn: async (codeRaw: string) => {
      const code = String(codeRaw || "").trim().toUpperCase();
      const res = await api.post<CartPreviewResp>(CART_PREVIEW_URL, {
        items: itemsPayload,
        couponCode: code,
        shipping: 0,
      });
      return res.data;
    },
    onSuccess: (data) => {
      const normalized = data?.summary?.coupon?.code || promoInput.trim().toUpperCase();
      setAppliedCoupon(normalized);
      qc.setQueryData(["customer-cart-preview", itemsKey, normalized], data);
    },
    onError: (e: any) => {
      const fe = friendlyError(e);
      setModal({ title: "Cupom inválido", message: fe.message });
      setAppliedCoupon(null);
    },
  });

  const createOrderMut = useMutation({
    mutationFn: async () => {
      if (!itemsPayload.length) throw new Error("Carrinho vazio");

      const payload: any = {
        buyerType: "CUSTOMER" as const,
        items: itemsPayload,
      };

      if (appliedCoupon) payload.couponCode = appliedCoupon;

      const res = await api.post(endpoints.orders.create, payload, {
        headers: { "Idempotency-Key": `order-${Date.now()}` },
      });

      return res.data;
    },
    onError: (e: any) => {
      const fe = friendlyError(e);
      setModal({ title: fe.title, message: fe.message });
    },
  });

  const preview = previewQ.data;
  const rows = preview?.items || [];
  const summary = preview?.summary;

  const finishCreateOrder = async () => {
    const order = await createOrderMut.mutateAsync();
    const orderId = order?.orderId;

    if (!orderId) {
      setModal({ title: "Erro", message: "Pedido criado mas não retornou orderId." });
      return;
    }

    const totalAmount = toNumberBR(summary?.total ?? "0");
    nav.navigate(CUSTOMER_SCREENS.PixPayment, { orderId, amount: totalAmount });
  };

  const onCheckoutPix = async () => {
  const typed = promoInput.trim().toUpperCase();
  const hasTypedButNotApplied = !!typed && typed !== (appliedCoupon || "");

  if (hasTypedButNotApplied) {
    setConfirm({
      title: "Aplicar cupom?",
      message: "Você digitou um cupom, mas ainda não clicou em Apply. Quer validar antes de finalizar?",
      actions: [
        { text: "Cancelar", style: "cancel" },
        { text: "Validar", onPress: () => applyCouponMut.mutate(typed) },
        {
          text: "Continuar sem cupom",
          style: "destructive",
          onPress: () =>
            nav.navigate(CUSTOMER_SCREENS.ShippingMethod, {
              items: itemsPayload,
              couponCode: appliedCoupon || undefined,
            }),
        },
      ],
    });
    return;
  }

  nav.navigate(CUSTOMER_SCREENS.ShippingMethod, {
    items: itemsPayload,
    couponCode: appliedCoupon || undefined,
  });
};

  const unavailableKey = useMemo(() => {
    const arr = preview?.unavailable ?? [];
    return arr.map((x) => `${x.productId}:${x.reason}`).sort().join("|");
  }, [preview?.unavailable]);

  React.useEffect(() => {
    const unavailable = preview?.unavailable || [];
    if (!unavailable.length) return;

    unavailable.forEach((u) => remove(u.productId));

    const count = unavailable.length;
    const msg =
      count === 1
        ? "Removemos 1 item que ficou indisponível."
        : `Removemos ${count} itens que ficaram indisponíveis.`;

    showBanner("Itens removidos do carrinho", msg);
  }, [unavailableKey]);

  const showError = previewQ.isError && !preview;

  const canCheckout =
    !createOrderMut.isPending &&
    rows.length > 0 &&
    preview?.canCheckout !== false &&
    (preview?.unavailable?.length ?? 0) === 0;

  const isFirstLoad = !preview && previewQ.isLoading;

  return (
    <>
      <SharedOwnerCustomerCartScreen
  cartItemsLength={cartItems.length}
  rows={rows}
  summary={summary}
  isFirstLoad={isFirstLoad}
  showError={showError}
  onRetry={() => previewQ.refetch()}
  banner={banner}
  onDismissBanner={() => setBanner(null)}
  onBack={() => nav.goBack?.()}
  onClearCart={() => {
    if (!cartItems.length) return;

    setConfirm({
      title: "Limpar carrinho?",
      message: "Isso vai remover todos os itens.",
      actions: [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Limpar",
          style: "destructive",
          onPress: () => {
            clearCart();
            setAppliedCoupon(null);
            setPromoInput("");
            showBanner("Carrinho limpo", "Todos os itens foram removidos.");
          },
        },
      ],
    });
  }}
  promoInput={promoInput}
  onChangePromoInput={setPromoInput}
  onApplyCoupon={() => {
    const code = promoInput.trim().toUpperCase();

    if (!code) {
      setAppliedCoupon(null);
      return;
    }

    applyCouponMut.mutate(code);
  }}
  applyCouponPending={applyCouponMut.isPending}
  appliedCoupon={appliedCoupon}
  onRemoveCoupon={() => {
    setAppliedCoupon(null);
    showBanner("Cupom removido", "O cupom foi removido do seu carrinho.");
  }}
  onOpenProduct={(productId) =>
    nav.navigate(CUSTOMER_SCREENS.ProductDetails, { productId })
  }
  onInc={(productId) => inc(productId)}
  onDec={(productId) => dec(productId)}
  onRemoveItem={(productId) => remove(productId)}
  canCheckout={canCheckout}
  checkoutPending={createOrderMut.isPending}
  onCheckout={onCheckoutPix}
  onGoToShop={() =>
  nav.navigate(CUSTOMER_SCREENS.Root, {
    screen: CUSTOMER_SCREENS.Tabs,
    params: {
      screen: CUSTOMER_SCREENS.Buy,
    },
  })
}
/>

      <IosAlert
        visible={!!modal}
        title={modal?.title}
        message={modal?.message}
        onClose={() => setModal(null)}
      />

      <IosConfirm
        visible={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        actions={confirm?.actions || []}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}