import React, { useMemo, useRef, useState } from "react";
import { View, Text, ActivityIndicator, Pressable, Platform } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { useNavigation, useRoute } from "@react-navigation/native";
import Config from "react-native-config";
import { CUSTOMER_SCREENS } from "../../navigation/customer.routes";
import { OWNER_SCREENS } from "../../navigation/owner.routes";

function normalizeBaseUrl(raw: string) {
  const base = String(raw || "").trim();
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

export function CardTokenizeWebViewScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();

  const orderId: string | undefined = route?.params?.orderId;

  // ✅ nomes de rota “genéricos” (cada stack passa os seus)
  const successRouteName: string = route?.params?.successRouteName;
  const cancelRouteName: string | null = route?.params?.cancelRouteName || null;

  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const baseURL = normalizeBaseUrl(Config.API_BASE_URL || "");
  const pageUrl = useMemo(() => {
    if (!baseURL) return "";
    return `${baseURL}/cielo/sop/page?orderId=${encodeURIComponent(orderId || "")}`;
  }, [baseURL, orderId]);

  const injected = useMemo(() => {
    return `
      (function() {
        try {
          window.__rn_postMessage = function(payload) {
            try {
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
                typeof payload === 'string' ? payload : JSON.stringify(payload)
              );
            } catch (e) {}
          };

          const originalPostMessage = window.postMessage;
          window.postMessage = function(data) {
            window.__rn_postMessage(data);
            if (originalPostMessage) return originalPostMessage.apply(window, arguments);
          };

          window.__rn_postMessage({ type: "RN_WEBVIEW_READY" });
        } catch (e) {}
      })();
      true;
    `;
  }, []);

  function goBackSafe() {
    if (cancelRouteName) {
      nav.navigate(cancelRouteName, route?.params?.cancelParams || undefined);
      return;
    }
    if (nav.canGoBack()) nav.goBack();
  }

  function onMessage(ev: WebViewMessageEvent) {
    try {
      const raw = ev?.nativeEvent?.data;
      if (!raw) return;

      const msg = typeof raw === "string" ? JSON.parse(raw) : raw;
      const token = msg?.cardToken || msg?.PaymentToken || msg?.paymentToken;
      const routeName = String(route?.name || "");
      const resolvedSuccessRouteName =
        typeof successRouteName === "string" && successRouteName.trim()
          ? successRouteName
          : routeName === CUSTOMER_SCREENS.CardTokenize
          ? CUSTOMER_SCREENS.CardEntry
          : routeName === OWNER_SCREENS.CardTokenize
          ? OWNER_SCREENS.CardEntry
          : null;

      if (msg?.type === "CIELO_CARD_TOKEN" && token) {
        if (!resolvedSuccessRouteName) {
          setErr("Token recebido, mas rota de retorno não configurada.");
          goBackSafe();
          return;
        }

        nav.replace(resolvedSuccessRouteName, {
          ...(route?.params?.successParams || {}),
          orderId,
          cardToken: token,
          brand: msg.brand,
          cardBin: msg.cardBin || msg.firstSixDigits || msg.firstSix,
          cardLast4Digits: msg.cardLast4Digits || msg.last4,
        });
        return;
      }

      if (msg?.type === "CIELO_ERROR") {
        setErr(msg?.message || "Falha ao tokenizar cartão.");
      }
    } catch {
    }
  }

  if (!baseURL) {
    return (
      <View style={{ flex: 1, padding: 16, justifyContent: "center" }}>
        <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>API_BASE_URL vazio</Text>
        <Text style={{ marginBottom: 12 }}>Configure no .env do app e faça rebuild.</Text>
        <Pressable onPress={goBackSafe} style={{ padding: 12, borderWidth: 1, borderRadius: 10, alignSelf: "flex-start" }}>
          <Text>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  if (!orderId) {
    return (
      <View style={{ flex: 1, padding: 16, justifyContent: "center" }}>
        <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>orderId não informado</Text>
        <Text style={{ marginBottom: 12 }}>Navegue para esta tela passando {"{ orderId }"}.</Text>
        <Pressable onPress={goBackSafe} style={{ padding: 12, borderWidth: 1, borderRadius: 10, alignSelf: "flex-start" }}>
          <Text>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ paddingTop: Platform.OS === "android" ? 12 : 18, paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 1, borderColor: "#eee" }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable onPress={goBackSafe} style={{ paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderRadius: 10, borderColor: "#ddd" }}>
            <Text>Voltar</Text>
          </Pressable>

          <Text style={{ fontSize: 16, fontWeight: "700" }}>Adicionar cartão</Text>
          <View style={{ width: 60 }} />
        </View>

        {!!err && (
          <View style={{ marginTop: 10, padding: 10, borderWidth: 1, borderColor: "#f3c2c2", borderRadius: 12, backgroundColor: "#fff5f5" }}>
            <Text style={{ fontWeight: "700", marginBottom: 4 }}>Erro</Text>
            <Text>{err}</Text>
          </View>
        )}
      </View>

      {loading && (
        <View style={{ position: "absolute", top: 110, left: 0, right: 0, alignItems: "center", zIndex: 2 }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8 }}>Carregando tokenização…</Text>
        </View>
      )}

      <WebView
        ref={webRef}
        source={{ uri: pageUrl }}
        onLoadStart={() => {
          setErr(null);
          setLoading(true);
        }}
        onLoadEnd={() => setLoading(false)}
        onMessage={onMessage}
        injectedJavaScript={injected}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
        mixedContentMode="always"
        allowsInlineMediaPlayback
        setSupportMultipleWindows={false}
      />
    </View>
  );
}