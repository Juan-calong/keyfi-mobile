import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  StatusBar,
  ScrollView,
} from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Screen } from "../../../ui/components/Screen";
import { Container } from "../../../ui/components/Container";
import { Loading, ErrorState } from "../../../ui/components/State";
import { IosAlert } from "../../../ui/components/IosAlert";
import { friendlyError } from "../../../core/errors/friendlyError";
import { ShippingService } from "../../../core/api/services/shipping.service";
import { api } from "../../../core/api/client";
import { endpoints } from "../../../core/api/endpoints";
import { toNumberBR, formatBRL } from "../../components/cart/cart.shared.utils";
import type { CartPreviewResp } from "../../components/cart/cart.shared.types";
import type { ShippingQuoteOption, ShippingOption } from "./shipping.types";
import { useSafeAreaInsets } from "react-native-safe-area-context";


type ShippingQuoteApiResponse = {
  ok?: boolean;
  options?: ShippingQuoteOption[];
  errors?: string[];
};

const LAST_SELECTED_SHIPPING_BY_CONTEXT = new Map<string, string>();

type DeliveryAddressInput = {
  zipcode?: string;
  zipCode?: string;
  streetName?: string;
  street?: string;
  streetNumber?: string;
  number?: string;
  neighborhood?: string;
  district?: string;
  city?: string;
  federalUnit?: string;
  state?: string;
  complement?: string | null;
};

type Props = {
  role: "CUSTOMER" | "SALON_OWNER";
  title: string;
  items: { productId: string; qty: number }[];
  couponCode?: string;

  deliveryAddress?: DeliveryAddressInput | null;

  zipcode?: string;
  zipCode?: string;

  onBack: () => void;
  onContinue: (params: {
    orderId: string;
    amount: number;
    shippingOption: ShippingOption;
  }) => void;
};

function onlyDigits(value: string | undefined | null) {
  return String(value ?? "").replace(/\D/g, "");
}

const trim = (v: any) => String(v ?? "").trim();



function pickUserName(me: any) {
  return me?.name || me?.fullName || me?.profile?.name || me?.user?.name || "";
}

function pickEmail(me: any) {
  return me?.email || me?.profile?.email || me?.user?.email || "";
}

function pickSalon(me: any) {
  return me?.salon || me?.profile?.salon || me?.ownerSalon || null;
}

function splitFullName(value?: string | null) {
  const parts = trim(value).split(/\s+/).filter(Boolean);

  const firstName = parts[0] || "Cliente";
  const lastName = parts.slice(1).join(" ") || parts[0] || "Cliente";

  return { firstName, lastName };
}

function pickPayerDoc(me: any, role: "CUSTOMER" | "SALON_OWNER") {
  const salon = pickSalon(me);

  if (role === "SALON_OWNER") {
    return onlyDigits(
      salon?.cnpj ||
        me?.document ||
        me?.cpfCnpj ||
        me?.cpf ||
        me?.cnpj ||
        me?.profile?.document ||
        me?.profile?.cpfCnpj ||
        me?.profile?.cpf ||
        me?.profile?.cnpj ||
        me?.user?.document ||
        me?.user?.cpfCnpj ||
        me?.user?.cpf ||
        me?.user?.cnpj ||
        ""
    );
  }

  return onlyDigits(
    me?.document ||
      me?.cpfCnpj ||
      me?.cpf ||
      me?.cnpj ||
      me?.profile?.document ||
      me?.profile?.cpfCnpj ||
      me?.profile?.cpf ||
      me?.profile?.cnpj ||
      me?.user?.document ||
      me?.user?.cpfCnpj ||
      me?.user?.cpf ||
      me?.user?.cnpj ||
      ""
  );
}

function maskCep(value: string) {
  const d = onlyDigits(value).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function formatMaybeBRL(value: string | number | null | undefined) {
  return formatBRL(toNumberBR(value ?? 0));
}

function normalizeLabel(opt: ShippingQuoteOption) {
  const carrier = String(opt.carrier || "").toUpperCase();

  if (opt.label) return opt.label;
  if (carrier === "LOCAL_DELIVERY") return "Entrega local";
  if (
    carrier === "CORREIOS" &&
    String(opt.serviceCode).toUpperCase().includes("SEDEX")
  ) {
    return "Entrega rápida";
  }
  if (carrier === "CORREIOS") return "Entrega econômica";
  if (carrier === "BRASPRESS") return "Transportadora";
  return opt.serviceName || "Entrega";
}

function normalizeDescription(opt: ShippingQuoteOption) {
  if (opt.description) return opt.description;
  if (opt.deadlineDays != null) {
    return `Chega em até ${opt.deadlineDays} dia(s) úteis`;
  }
  return opt.serviceName || "Opção de entrega";
}

function isLocalDeliveryOption(option: ShippingQuoteOption) {
  const raw = [
    option.carrier,
    option.serviceCode,
    option.serviceName,
    option.label,
    option.description,
    option.deliveryMode,
    option?.meta?.type,
    option?.meta?.method,
  ]
    .map((v) => String(v ?? "").toUpperCase())
    .join(" ");

  if (option.isLocalDelivery === true) return true;
  if (option?.meta?.isLocalDelivery === true) return true;
  if (option.deliveryMode === "LOCAL_DELIVERY") return true;
  if (option?.meta?.deliveryMode === "LOCAL_DELIVERY") return true;
  if (option?.meta?.deliveryType === "LOCAL") return true;

  return raw.includes("LOCAL");
}

function resolveLocalDeliveryCountdownLabel(option: ShippingQuoteOption) {
  const backendLabel = String(option.deliveryCountdownLabel ?? "").trim();
  if (backendLabel) return backendLabel;

  const days = Number(option.nextDeliveryInDays);
  if (!Number.isFinite(days) || days < 0) return null;

  if (days === 0) return "Entrega hoje";
  if (days === 1) return "Entrega em 1 dia";

  return `Entrega em ${days} dias`;
}

function normalizeDeliveryAddress(
  address?: DeliveryAddressInput | null,
  fallbackZipcode?: string
) {
  if (!address && !fallbackZipcode) return null;

  return {
    zipCode: onlyDigits(
      address?.zipCode || address?.zipcode || fallbackZipcode || ""
    ),
    streetName: String(address?.streetName || address?.street || "").trim(),
    streetNumber: String(address?.streetNumber || address?.number || "").trim(),
    neighborhood: String(
      address?.neighborhood || address?.district || ""
    ).trim(),
    city: String(address?.city || "").trim(),
    federalUnit: String(address?.federalUnit || address?.state || "").trim(),
    complement:
      address?.complement == null || String(address.complement).trim() === ""
        ? null
        : String(address.complement).trim(),
  };
}

function resolveOptionQuoteId(option: ShippingQuoteOption | null | undefined) {
  return String(option?.quoteId || "").trim() || null;
}

function resolveOptionStableKey(option: ShippingQuoteOption | null | undefined) {
  if (!option) return null;

  return [
    String(option.carrier || "").trim().toUpperCase(),
    String(option.serviceCode || "").trim().toUpperCase(),
  ].join(":");
}

function resolveOptionSelectionKey(option: ShippingQuoteOption | null | undefined) {
  return resolveOptionStableKey(option);
}

function buildPreviewPayload(params: {
  items: { productId: string; qty: number }[];
  couponCode?: string;
  selected: ShippingQuoteOption | null;
  cleanZipcode: string;
}) {
  const { items, couponCode, selected, cleanZipcode } = params;

  const payload: any = {
    items,
    couponCode: couponCode || undefined,
  };

  if (selected) {
    payload.shippingOption = {
      carrier: selected.carrier,
      serviceCode: selected.serviceCode,
      serviceName: selected.serviceName,
      price: Number(selected.price || 0),
      deadlineDays: selected.deadlineDays ?? null,
      zipcode: cleanZipcode,
      meta: selected.meta ?? null,
    };
  }

  return payload;
}

function buildSelectedShippingPayload(
  selected: ShippingQuoteOption,
  cleanZipcode: string
): ShippingOption {
  const quoteId = resolveOptionQuoteId(selected);

  return {
    quoteId: quoteId || undefined,
    id: selected.id,
    carrier: selected.carrier,
    serviceCode: selected.serviceCode,
    serviceName: selected.serviceName,
    price: Number(selected.price || 0),
    originalPrice: Number(selected.originalPrice ?? selected.meta?.originalPrice ?? selected.price ?? 0),
    discount: Number(selected.discount ?? selected.meta?.discount ?? 0),
    finalPrice: Number(selected.finalPrice ?? selected.meta?.finalPrice ?? selected.price ?? 0),
    deadlineDays: selected.deadlineDays ?? null,
    deliveryMode: selected.deliveryMode ?? selected.meta?.deliveryMode ?? undefined,
    isLocalDelivery: Boolean(selected.isLocalDelivery ?? selected.meta?.isLocalDelivery),
    minSubtotal: selected.minSubtotal ?? selected.meta?.minSubtotal ?? null,
    freeShippingMinSubtotal:
      selected.freeShippingMinSubtotal ??
      selected.meta?.freeShippingMinSubtotal ??
      null,
    qualifiesMinSubtotal:
      selected.qualifiesMinSubtotal ?? selected.meta?.qualifiesMinSubtotal ?? null,
    qualifiesFreeShipping:
      selected.qualifiesFreeShipping ??
      selected.meta?.qualifiesFreeShipping ??
      null,
    missingSubtotalForMin:
      selected.missingSubtotalForMin ??
      selected.meta?.missingSubtotalForMin ??
      null,
    nextDeliveryInDays:
      selected.nextDeliveryInDays ?? selected.meta?.nextDeliveryInDays ?? null,
    deliveryCountdownLabel:
      selected.deliveryCountdownLabel ??
      selected.meta?.deliveryCountdownLabel ??
      null,
    nextDeliveryDate:
      selected.nextDeliveryDate ?? selected.meta?.nextDeliveryDate ?? null,
    deliveryWeekdays:
      selected.deliveryWeekdays ?? selected.meta?.deliveryWeekdays ?? null,
    zipcode: cleanZipcode,
    expiresAt: selected.expiresAt ?? null,
    meta: {
      ...(selected.meta || {}),
      quoteId: quoteId || undefined,
      deliveryMode:
        selected.deliveryMode ?? selected.meta?.deliveryMode ?? undefined,
      isLocalDelivery: Boolean(
        selected.isLocalDelivery ?? selected.meta?.isLocalDelivery
      ),
    },
  };
}

function resolveLocalRuleText(option: ShippingQuoteOption) {
  if (!isLocalDeliveryOption(option)) return null;

  const minSubtotal =
    option.minSubtotal ?? option.meta?.minSubtotal ?? null;
  const freeShippingMinSubtotal =
    option.freeShippingMinSubtotal ??
    option.meta?.freeShippingMinSubtotal ??
    null;
  const qualifiesFreeShipping =
    option.qualifiesFreeShipping ??
    option.meta?.qualifiesFreeShipping ??
    null;
  const missingSubtotalForMin =
    option.missingSubtotalForMin ??
    option.meta?.missingSubtotalForMin ??
    null;

  if (qualifiesFreeShipping) {
    return "Frete grátis aplicado nesta entrega local.";
  }

  if (
    missingSubtotalForMin != null &&
    Number(missingSubtotalForMin) > 0 &&
    minSubtotal != null
  ) {
    return `Pedido mínimo para entrega local: ${formatMaybeBRL(
      minSubtotal
    )}. Faltam ${formatMaybeBRL(missingSubtotalForMin)}.`;
  }

  if (freeShippingMinSubtotal != null) {
    return `Frete grátis local a partir de ${formatMaybeBRL(
      freeShippingMinSubtotal
    )}.`;
  }

  if (minSubtotal != null) {
    return `Pedido mínimo para entrega local: ${formatMaybeBRL(
      minSubtotal
    )}.`;
  }

  return null;
}

function ShippingRow({
  option,
  selected,
  onPress,
}: {
  option: ShippingQuoteOption;
  selected: boolean;
  onPress: () => void;
}) {
  const label = normalizeLabel(option);
  const subtitle = normalizeDescription(option);
  const finalPrice = Number(option.finalPrice ?? option.meta?.finalPrice ?? option.price ?? 0);
  const originalPrice = Number(
    option.originalPrice ?? option.meta?.originalPrice ?? option.price ?? 0
  );
  const discount = Number(option.discount ?? option.meta?.discount ?? 0);
  const price = formatBRL(finalPrice);

  const localDeliveryCountdown = isLocalDeliveryOption(option)
    ? resolveLocalDeliveryCountdownLabel(option)
    : null;

  const localRuleText = resolveLocalRuleText(option);
  const showOldPrice = discount > 0 && originalPrice > finalPrice;

  return (
    <View style={{ marginTop: 14 }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={`${label}, ${option.carrier}, ${subtitle}, ${price}${
          selected ? ", selecionado" : ""
        }`}
        style={({ pressed }) => [
          s.option,
          selected && s.optionSelected,
          option.available === false && s.optionDisabled,
          pressed && option.available !== false && { opacity: 0.96 },
        ]}
        disabled={option.available === false}
      >
        <View style={{ flex: 1 }}>
          <Text style={s.optionTitle}>{label}</Text>
          <Text style={s.optionSub}>{subtitle}</Text>
          <Text style={s.providerText}>
            {option.carrier} • {option.serviceName}
          </Text>

          {localDeliveryCountdown ? (
            <Text style={s.localCountdownText}>{localDeliveryCountdown}</Text>
          ) : null}

          {localRuleText ? (
            <Text style={s.localRuleText}>{localRuleText}</Text>
          ) : null}

          {option.available === false && option.reason ? (
            <Text style={s.unavailableText}>{option.reason}</Text>
          ) : null}
        </View>

        <View style={s.rightWrap}>
          {showOldPrice ? (
            <Text style={s.oldPriceText}>{formatBRL(originalPrice)}</Text>
          ) : null}

          <Text style={s.priceText}>{price}</Text>

          {selected ? (
            <View style={s.checkCircle}>
              <Text style={s.checkText}>✓</Text>
            </View>
          ) : (
            <View style={s.radioCircle} />
          )}
        </View>
      </Pressable>
    </View>
  );
}

function InlineInfoCard({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <View style={s.infoCard}>
      <Text style={s.infoTitle}>{title}</Text>
      <Text style={s.infoText}>{message}</Text>
    </View>
  );
}

export function SharedShippingMethodScreen({
  role,
  title,
  items,
  couponCode,
  deliveryAddress,
  zipcode,
  zipCode,
  onBack,
  onContinue,
}: Props) {
  const [selected, setSelected] = useState<ShippingQuoteOption | null>(null);
  const [modal, setModal] = useState<null | { title: string; message: string }>(
    null
  );
  const insets = useSafeAreaInsets();
const continueLockRef = useRef(false);
const orderAttemptKeyRef = useRef<string | null>(null);

  const rawZipcode =
    zipcode ??
    zipCode ??
    deliveryAddress?.zipCode ??
    deliveryAddress?.zipcode ??
    "";

    

  const cleanZipcode = useMemo(() => onlyDigits(rawZipcode), [rawZipcode]);
  const hasValidZipcode = cleanZipcode.length === 8;

    const shippingContextKey = useMemo(() => {
    const normalizedItems = [...items]
      .map((it) => ({
        productId: String(it.productId),
        qty: Number(it.qty ?? 0),
      }))
      .sort((a, b) => a.productId.localeCompare(b.productId));

    return JSON.stringify({
      role,
      zip: cleanZipcode,
      coupon: couponCode || "",
      items: normalizedItems,
    });
  }, [role, cleanZipcode, couponCode, items]);

  const normalizedDeliveryAddress = useMemo(
    () => normalizeDeliveryAddress(deliveryAddress, cleanZipcode),
    [deliveryAddress, cleanZipcode]
  );

  const selectedSelectionKey = useMemo(
  () => resolveOptionSelectionKey(selected),
  [selected]
);



React.useEffect(() => {
  orderAttemptKeyRef.current = null;
}, [shippingContextKey, selectedSelectionKey]);

  const meQ = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await api.get(endpoints.profiles.me)).data,
    retry: false,
    staleTime: 60000,
  });

  const me = meQ.data;

  const payerName = useMemo(() => pickUserName(me), [me]);
  const payerEmail = useMemo(() => trim(pickEmail(me)), [me]);
  const payerDoc = useMemo(() => pickPayerDoc(me, role), [me, role]);
  const payerParsedName = useMemo(() => splitFullName(payerName), [payerName]);

const previewQ = useQuery({
  queryKey: [
    "shipping-preview",
    role,
    cleanZipcode,
    couponCode || "",
    JSON.stringify(items),
    resolveOptionSelectionKey(selected) || "no-shipping",
  ],
  enabled: items.length > 0,
  queryFn: async () => {
    const { data } = await api.post<CartPreviewResp>(
      endpoints.cart.preview,
      buildPreviewPayload({
        items,
        couponCode,
        selected,
        cleanZipcode,
      })
    );

    return data;
  },
  retry: false,
  staleTime: 0,
  placeholderData: (prev) => prev,
});

  const declaredValue = useMemo(() => {
    return toNumberBR(previewQ.data?.summary?.subtotalBase ?? "0");
  }, [previewQ.data?.summary?.subtotalBase]);

const quoteQ = useQuery<ShippingQuoteApiResponse>({
  queryKey: [
    "shipping-quote",
    role,
    cleanZipcode,
    JSON.stringify(items),
    declaredValue,
  ],
  enabled: items.length > 0 && hasValidZipcode && previewQ.isSuccess,
  queryFn: async () => {
    const data = await ShippingService.quote({
      items,
      zipcode: cleanZipcode,
      declaredValue,
    });

    return data as ShippingQuoteApiResponse;
  },
  retry: false,
  staleTime: 0,
});

const createOrderMut = useMutation({
  mutationFn: async ({
    selectedOption,
    idempotencyKey,
  }: {
    selectedOption: ShippingQuoteOption;
    idempotencyKey: string;
  }) => {
      if (!selectedOption) throw new Error("Escolha uma opção de entrega");

      if (
        !normalizedDeliveryAddress ||
        !normalizedDeliveryAddress.zipCode ||
        !normalizedDeliveryAddress.streetName ||
        !normalizedDeliveryAddress.streetNumber ||
        !normalizedDeliveryAddress.neighborhood ||
        !normalizedDeliveryAddress.city ||
        !normalizedDeliveryAddress.federalUnit
      ) {
        throw new Error("Endereço de entrega incompleto");
      }

      if (!payerDoc) {
        throw new Error("Documento do pagador não encontrado no perfil");
      }

      if (!payerEmail) {
        throw new Error("E-mail do pagador não encontrado no perfil");
      }

      if (!payerParsedName.firstName || !payerParsedName.lastName) {
        throw new Error("Nome do pagador incompleto");
      }

      const payload: any = {
        buyerType: role,
        items,
        deliveryAddress: normalizedDeliveryAddress,
        payer: {
          doc: payerDoc,
          firstName: payerParsedName.firstName,
          lastName: payerParsedName.lastName,
          email: payerEmail,
        },
      };

      if (couponCode) payload.couponCode = couponCode;

const selectedShipping = buildSelectedShippingPayload(
  selectedOption,
  cleanZipcode
);

if (selectedShipping.quoteId) {
  payload.shippingQuoteId = selectedShipping.quoteId;
} else {
  payload.shippingOption = selectedShipping;
}

      console.log(
        "[SHARED_SHIPPING_METHOD][CREATE_ORDER_PAYLOAD]",
        JSON.stringify(payload, null, 2)
      );

      const { data } = await api.post(endpoints.orders.create, payload, {
  headers: { "Idempotency-Key": idempotencyKey },
});

      return data;
    },
    onError: (e: any) => {
      const fe = friendlyError(e);
      setModal({
        title: fe?.title || "Erro",
        message: fe?.message || "Não foi possível criar o pedido.",
      });
    },
  });

  React.useEffect(() => {
  if (!quoteQ.data?.options) return;

  const availableOptions = quoteQ.data.options.filter(
    (opt) => opt.available !== false
  );

  setSelected((current) => {
    if (!availableOptions.length) return current;

    const rememberedKey = LAST_SELECTED_SHIPPING_BY_CONTEXT.get(
      shippingContextKey
    );

    if (!current && rememberedKey) {
const rememberedOption = availableOptions.find(
  (opt) => resolveOptionStableKey(opt) === rememberedKey
);
      if (rememberedOption) return rememberedOption;
    }

    if (!current) {
      return availableOptions[0] ?? null;
    }

const currentKey = resolveOptionStableKey(current);
const stillExists = availableOptions.find(
  (opt) => resolveOptionStableKey(opt) === currentKey
);

    if (stillExists) return stillExists;

    if (rememberedKey) {
      const rememberedOption = availableOptions.find(
        (opt) => resolveOptionSelectionKey(opt) === rememberedKey
      );
      if (rememberedOption) return rememberedOption;
    }

    return availableOptions[0] ?? null;
  });
}, [quoteQ.data?.options, shippingContextKey]);

  React.useEffect(() => {
    const selectedKey = resolveOptionStableKey(selected);
    if (selectedKey) {
      LAST_SELECTED_SHIPPING_BY_CONTEXT.set(shippingContextKey, selectedKey);
    }
  }, [shippingContextKey, selected]);

const isInitialLoading =
  meQ.isLoading ||
  (!previewQ.data && previewQ.isFetching) ||
  (hasValidZipcode && !quoteQ.data && quoteQ.isFetching);

  const totalAmount = useMemo(() => {
    return toNumberBR(previewQ.data?.summary?.total ?? "0");
  }, [previewQ.data?.summary?.total]);

  const quoteOptions = quoteQ.data?.options || [];
  const quoteErrors = quoteQ.data?.errors || [];

const isContinueBusy =
  createOrderMut.isPending ||
  meQ.isLoading ||
  isInitialLoading;

  const noOptions =
    hasValidZipcode &&
    !quoteQ.isLoading &&
    !quoteQ.isError &&
    quoteOptions.length === 0;

    React.useEffect(() => {
  console.log(
    "[SHIPPING][QUOTE_OPTIONS]",
    (quoteQ.data?.options || []).map((opt) => ({
      id: opt.id,
      quoteId: opt.quoteId,
      carrier: opt.carrier,
      serviceCode: opt.serviceCode,
      label: opt.label,
      available: opt.available,
      reason: opt.reason,
      isLocalDelivery: opt.isLocalDelivery,
      deliveryMode: opt.deliveryMode,
      minSubtotal: opt.minSubtotal,
      qualifiesMinSubtotal: opt.qualifiesMinSubtotal,
      qualifiesFreeShipping: opt.qualifiesFreeShipping,
      meta: opt.meta,
    }))
  );
}, [quoteQ.data?.options]);

  const emptyMessage =
    quoteErrors[0] ||
    "Nenhuma transportadora retornou cotação válida para este endereço agora.";

const handleContinue = async () => {
  if (continueLockRef.current || isContinueBusy) return;

  if (!selected) {
    setModal({
      title: "Entrega",
      message: "Escolha uma forma de entrega para continuar.",
    });
    return;
  }

  try {
    continueLockRef.current = true;

    await previewQ.refetch();
    const freshQuoteResult = await quoteQ.refetch();

    const availableOptions = (freshQuoteResult.data?.options || []).filter(
      (opt) => opt.available !== false
    );

    if (!availableOptions.length) {
      setSelected(null);
      setModal({
        title: "Entrega atualizada",
        message:
          "As opções de frete foram atualizadas. Escolha novamente para continuar.",
      });
      return;
    }

    const currentKey = resolveOptionStableKey(selected);
    console.log("[SHIPPING][CONTINUE_COMPARE]", {
  selected: {
    id: selected?.id,
    quoteId: selected?.quoteId,
    carrier: selected?.carrier,
    serviceCode: selected?.serviceCode,
    key: resolveOptionSelectionKey(selected),
  },
  availableOptions: availableOptions.map((opt) => ({
    id: opt.id,
    quoteId: opt.quoteId,
    carrier: opt.carrier,
    serviceCode: opt.serviceCode,
    key: resolveOptionSelectionKey(opt),
  })),
});

const freshSelected =
  availableOptions.find(
    (opt) => resolveOptionStableKey(opt) === currentKey
  ) || null;

    if (!freshSelected) {
      const fallback = availableOptions[0] ?? null;
      setSelected(fallback);

      setModal({
        title: "Entrega atualizada",
        message:
          "A cotação anterior não é mais válida. Revise a opção de entrega e tente novamente.",
      });
      return;
    }

    setSelected(freshSelected);

const idempotencyKey = `order-${Date.now()}-${Math.random()
  .toString(36)
  .slice(2, 10)}`;
    const order = await createOrderMut.mutateAsync({
  selectedOption: freshSelected,
  idempotencyKey,
});
    const orderId = order?.orderId;

    if (!orderId) {
      setModal({
        title: "Erro",
        message: "Pedido criado, mas não retornou orderId.",
      });
      return;
    }

    onContinue({
      orderId,
      amount: totalAmount,
      shippingOption: buildSelectedShippingPayload(
        freshSelected,
        cleanZipcode
      ),
    });
  } finally {
    continueLockRef.current = false;
  }
};

  return (
    <Screen>
      <Container style={{ flex: 1, paddingTop: 6 }}>
        {Platform.OS === "android" ? (
          <View style={{ height: StatusBar.currentHeight ?? 0 }} />
        ) : null}

        <View style={s.header}>
          <Pressable onPress={onBack} hitSlop={12}>
            <Text style={s.backText}>‹</Text>
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={s.h1}>{title}</Text>
            <Text style={s.sub}>Selecione uma forma de entrega</Text>
          </View>
        </View>

        <View style={s.hairline} />

        {isInitialLoading ? (
          <View style={{ marginTop: 14 }}>
            <Loading />
          </View>
        ) : quoteQ.isError ? (
          <View style={{ marginTop: 14 }}>
            <ErrorState onRetry={() => quoteQ.refetch()} />
          </View>
        ) : (
          <>
            <ScrollView
              contentContainerStyle={[s.scroll, { paddingBottom: 150 + insets.bottom }]}
              showsVerticalScrollIndicator={false}
            >
              <Text style={s.sectionTitle}>Escolha uma forma de entrega</Text>

              {hasValidZipcode ? (
                <Text style={s.zipInfo}>CEP da entrega: {maskCep(cleanZipcode)}</Text>
              ) : null}

              {!hasValidZipcode ? (
                <InlineInfoCard
                  title="CEP de entrega não encontrado"
                  message="Volte para a etapa anterior e selecione um endereço válido antes de cotar o frete."
                />
              ) : noOptions ? (
                <InlineInfoCard
                  title="Nenhum método disponível"
                  message={emptyMessage}
                />
              ) : (
                quoteOptions.map((option, idx) => {
const key =
  option.id ||
  option.quoteId ||
  `${option.carrier}-${option.serviceCode}-${idx}`;

const isSelected =
  resolveOptionStableKey(selected) ===
  resolveOptionStableKey(option);

                  return (
                    <ShippingRow
                      key={key}
                      option={option}
                      selected={isSelected}
                      onPress={() => {
const isSame =
  resolveOptionStableKey(selected) ===
  resolveOptionStableKey(option);

                        if (!isSame) {
                          setSelected(option);
                        }
                      }}
                    />
                  );
                })
              )}

              <View style={s.summaryCard}>
                <Text style={s.summaryTitle}>Resumo</Text>

                <View style={s.summaryRow}>
                  <Text style={s.summaryKey}>Subtotal</Text>
                  <Text style={s.summaryVal}>
                    {formatMaybeBRL(previewQ.data?.summary?.subtotalBase ?? "0")}
                  </Text>
                </View>

                <View style={s.summaryRow}>
                  <Text style={s.summaryKey}>Desconto produtos</Text>
                  <Text style={s.summaryVal}>
                    {formatMaybeBRL(
                      previewQ.data?.summary?.discountProducts ?? "0"
                    )}
                  </Text>
                </View>

                <View style={s.summaryRow}>
                  <Text style={s.summaryKey}>Cupom</Text>
                  <Text style={s.summaryVal}>
                    {formatMaybeBRL(previewQ.data?.summary?.couponDiscount ?? "0")}
                  </Text>
                </View>

                <View style={s.summaryRow}>
                  <Text style={s.summaryKey}>Entrega</Text>
                  <Text style={s.summaryVal}>
                    {formatMaybeBRL(previewQ.data?.summary?.shipping ?? "0")}
                  </Text>
                </View>

                <View style={[s.summaryRow, s.totalRow]}>
                  <Text style={s.totalKey}>Total</Text>
                  <Text style={s.totalVal}>
                    {formatMaybeBRL(previewQ.data?.summary?.total ?? "0")}
                  </Text>
                </View>
              </View>

              <View style={{ height: 130 }} />
            </ScrollView>

            <View style={[s.ctaWrap, { paddingBottom: insets.bottom + 12 }]}>
              <View style={s.hairline} />
<Pressable
  onPress={handleContinue}
  disabled={isContinueBusy || !selected}
  style={({ pressed }) => [
    s.ctaBtn,
    pressed && { opacity: 0.92, transform: [{ scale: 0.995 }] },
    (isContinueBusy || !selected) && { opacity: 0.6 },
  ]}
>
<Text style={s.ctaText}>
  {isContinueBusy ? "..." : "Continuar para pagamento"}
</Text>
              </Pressable>
            </View>
          </>
        )}

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

const s = StyleSheet.create({
  header: {
    paddingHorizontal: 2,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backText: { color: "#000", fontSize: 28, fontWeight: "700", width: 28 },
  h1: { color: "#000", fontSize: 28, fontWeight: "900", letterSpacing: -0.6 },
  sub: {
    marginTop: 8,
    color: "#000",
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.7,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0,0,0,0.10)",
    width: "100%",
  },

  scroll: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 0 },
  sectionTitle: {
    color: "#000",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  zipInfo: {
    marginTop: 8,
    color: "rgba(0,0,0,0.55)",
    fontSize: 13,
    fontWeight: "700",
  },

  option: {
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.10)",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  optionSelected: { borderColor: "#2563EB", backgroundColor: "#F5FAFF" },
  optionDisabled: { opacity: 0.6 },

  optionTitle: { color: "#000", fontSize: 18, fontWeight: "900" },
  optionSub: {
    marginTop: 4,
    color: "rgba(0,0,0,0.65)",
    fontSize: 14,
    fontWeight: "600",
  },
  providerText: {
    marginTop: 6,
    color: "rgba(0,0,0,0.5)",
    fontSize: 12,
    fontWeight: "700",
  },
  localCountdownText: {
    marginTop: 6,
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "800",
  },
  localRuleText: {
    marginTop: 6,
    color: "#065F46",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
  },

  unavailableText: {
    marginTop: 6,
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "700",
  },

  rightWrap: { marginLeft: 12, alignItems: "flex-end", gap: 6 },
  oldPriceText: {
    color: "rgba(0,0,0,0.40)",
    fontSize: 12,
    fontWeight: "700",
    textDecorationLine: "line-through",
  },
  priceText: { color: "#000", fontSize: 18, fontWeight: "900" },

  radioCircle: {
    width: 26,
    height: 26,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.20)",
    backgroundColor: "transparent",
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
  },
  checkText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    marginTop: -1,
  },

  infoCard: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#FFF",
  },
  infoTitle: { color: "#000", fontSize: 16, fontWeight: "900" },
  infoText: {
    marginTop: 6,
    color: "rgba(0,0,0,0.70)",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },

  summaryCard: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.10)",
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#FFF",
    gap: 10,
  },
  summaryTitle: { color: "#000", fontSize: 18, fontWeight: "900" },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryKey: {
    color: "rgba(0,0,0,0.70)",
    fontSize: 14,
    fontWeight: "700",
  },
  summaryVal: { color: "#000", fontSize: 14, fontWeight: "800" },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.12)",
  },
  totalKey: { color: "#000", fontSize: 16, fontWeight: "900" },
  totalVal: { color: "#000", fontSize: 16, fontWeight: "900" },

ctaWrap: {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "#FFFFFF",
  paddingHorizontal: 20,
  paddingTop: 10,
},
  ctaBtn: {
    marginTop: 10,
    height: 58,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6C453",
  },
  ctaText: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
});