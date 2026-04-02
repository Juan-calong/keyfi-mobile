import React, { useMemo, useState } from "react";
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

type ShippingQuoteApiResponse = {
  ok?: boolean;
  options?: ShippingQuoteOption[];
  errors?: string[];
};

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

  // aceita os dois formatos para não quebrar a navegação
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

function normalizeLabel(opt: ShippingQuoteOption) {
  const carrier = String(opt.carrier || "").toUpperCase();

  if (opt.label) return opt.label;
  if (carrier === "CORREIOS" && String(opt.serviceCode).toUpperCase().includes("SEDEX")) {
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

function normalizeDeliveryAddress(
  address?: DeliveryAddressInput | null,
  fallbackZipcode?: string
) {
  if (!address && !fallbackZipcode) return null;

  return {
    zipCode: onlyDigits(address?.zipCode || address?.zipcode || fallbackZipcode || ""),
    streetName: String(address?.streetName || address?.street || "").trim(),
    streetNumber: String(address?.streetNumber || address?.number || "").trim(),
    neighborhood: String(address?.neighborhood || address?.district || "").trim(),
    city: String(address?.city || "").trim(),
    federalUnit: String(address?.federalUnit || address?.state || "").trim(),
    complement:
      address?.complement == null || String(address.complement).trim() === ""
        ? null
        : String(address.complement).trim(),
  };
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
  const price = formatBRL(Number(option.price || 0));

  return (
    <View style={{ marginTop: 14 }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={`${label}, ${option.carrier}, ${subtitle}, ${price}${selected ? ", selecionado" : ""}`}
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

          {option.available === false && option.reason ? (
            <Text style={s.unavailableText}>{option.reason}</Text>
          ) : null}
        </View>

        <View style={s.rightWrap}>
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
  const [modal, setModal] = useState<null | { title: string; message: string }>(null);

  const rawZipcode =
    zipcode ??
    zipCode ??
    deliveryAddress?.zipCode ??
    deliveryAddress?.zipcode ??
    "";

  const cleanZipcode = useMemo(() => onlyDigits(rawZipcode), [rawZipcode]);
  const hasValidZipcode = cleanZipcode.length === 8;

  const normalizedDeliveryAddress = useMemo(
    () => normalizeDeliveryAddress(deliveryAddress, cleanZipcode),
    [deliveryAddress, cleanZipcode]
  );

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
    selected
      ? `${selected.carrier}:${selected.serviceCode}:${Number(selected.price || 0)}:${selected.deadlineDays ?? ""}`
      : "no-shipping",
  ],
  enabled: items.length > 0,
  queryFn: async () => {
    const { data } = await api.post<CartPreviewResp>(endpoints.cart.preview, {
      items,
      couponCode: couponCode || undefined,
      shippingOption: selected
        ? {
            carrier: selected.carrier,
            serviceCode: selected.serviceCode,
            serviceName: selected.serviceName,
            price: Number(selected.price || 0),
            deadlineDays: selected.deadlineDays ?? null,
            zipcode: cleanZipcode,
            meta: selected.meta ?? null,
          }
        : undefined,
    });

    return data;
  },
  retry: false,
  staleTime: 10000,
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
  staleTime: 15000,
  placeholderData: (prev) => prev,
});

  const createOrderMut = useMutation({
    mutationFn: async () => {
  if (!selected) throw new Error("Escolha uma opção de entrega");

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

  payload.shippingOption = {
    carrier: selected.carrier,
    serviceCode: selected.serviceCode,
    serviceName: selected.serviceName,
    price: Number(selected.price || 0),
    deadlineDays: selected.deadlineDays ?? null,
    zipcode: cleanZipcode,
    meta: selected.meta ?? null,
  };

  console.log(
    "[SHARED_SHIPPING_METHOD][CREATE_ORDER_PAYLOAD]",
    JSON.stringify(payload, null, 2)
  );

  const { data } = await api.post(endpoints.orders.create, payload, {
    headers: { "Idempotency-Key": `order-${Date.now()}` },
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
  const availableOptions = (quoteQ.data?.options || []).filter(
    (opt) => opt.available !== false
  );

  setSelected((current) => {
    if (!availableOptions.length) return null;

    if (!current) {
      return availableOptions[0];
    }

    const stillExists = availableOptions.find(
      (opt) =>
        opt.carrier === current.carrier &&
        opt.serviceCode === current.serviceCode
    );

    return stillExists ?? availableOptions[0];
  });
}, [quoteQ.data?.options]);


const isInitialLoading =
  meQ.isLoading ||
  previewQ.isLoading ||
  (hasValidZipcode && quoteQ.isLoading && !quoteQ.data);

const isRefreshingPrices =
  previewQ.isFetching || quoteQ.isFetching;

  const totalAmount = useMemo(() => {
    return toNumberBR(previewQ.data?.summary?.total ?? "0");
  }, [previewQ.data?.summary?.total]);

  const quoteOptions = quoteQ.data?.options || [];
  const quoteErrors = quoteQ.data?.errors || [];

  const noOptions =
    hasValidZipcode &&
    !quoteQ.isLoading &&
    !quoteQ.isError &&
    quoteOptions.length === 0;

  const emptyMessage =
    quoteErrors[0] ||
    "Nenhuma transportadora retornou cotação válida para este endereço agora.";

  const handleContinue = async () => {
    if (!selected) {
      setModal({
        title: "Entrega",
        message: "Escolha uma forma de entrega para continuar.",
      });
      return;
    }

    const order = await createOrderMut.mutateAsync();
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
      shippingOption: {
        carrier: selected.carrier,
        serviceCode: selected.serviceCode,
        serviceName: selected.serviceName,
        price: Number(selected.price || 0),
        deadlineDays: selected.deadlineDays ?? null,
        zipcode: cleanZipcode,
        meta: selected.meta ?? null,
      },
    });
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
              contentContainerStyle={s.scroll}
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
                    `${option.carrier}-${option.serviceCode}-${idx}`;

                  const isSelected =
                    selected?.carrier === option.carrier &&
                    selected?.serviceCode === option.serviceCode;

                  return (
                    <ShippingRow
                      key={key}
                      option={option}
                      selected={isSelected}
                      onPress={() => {
  const isSame =
    selected?.carrier === option.carrier &&
    selected?.serviceCode === option.serviceCode;

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
                    {previewQ.data?.summary?.subtotalBase ?? "0.00"}
                  </Text>
                </View>

                <View style={s.summaryRow}>
                  <Text style={s.summaryKey}>Desconto produtos</Text>
                  <Text style={s.summaryVal}>
                    {previewQ.data?.summary?.discountProducts ?? "0.00"}
                  </Text>
                </View>

                <View style={s.summaryRow}>
                  <Text style={s.summaryKey}>Cupom</Text>
                  <Text style={s.summaryVal}>
                    {previewQ.data?.summary?.couponDiscount ?? "0.00"}
                  </Text>
                </View>

                <View style={s.summaryRow}>
                  <Text style={s.summaryKey}>Entrega</Text>
                  <Text style={s.summaryVal}>
                    {previewQ.data?.summary?.shipping ?? "0.00"}
                  </Text>
                </View>

                <View style={[s.summaryRow, s.totalRow]}>
                  <Text style={s.totalKey}>Total</Text>
                  <Text style={s.totalVal}>
                    {previewQ.data?.summary?.total ?? "0.00"}
                  </Text>
                </View>
              </View>

              <View style={{ height: 130 }} />
            </ScrollView>

            <View style={s.ctaWrap}>
              <View style={s.hairline} />
              <Pressable
                onPress={handleContinue}
                disabled={createOrderMut.isPending || meQ.isLoading || !selected}
                style={({ pressed }) => [
                  s.ctaBtn,
                  pressed && { opacity: 0.92, transform: [{ scale: 0.995 }] },
                  (createOrderMut.isPending || !selected) && { opacity: 0.6 },
                ]}
              >
<Text style={s.ctaText}>
  {createOrderMut.isPending || meQ.isLoading ? "..." : "Continuar para pagamento"}
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
  unavailableText: {
    marginTop: 6,
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "700",
  },

  rightWrap: { marginLeft: 12, alignItems: "flex-end", gap: 10 },
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
    paddingBottom: Platform.OS === "ios" ? 18 : 14,
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