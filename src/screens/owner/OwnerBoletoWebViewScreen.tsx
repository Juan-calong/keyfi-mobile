// screens/owner/OwnerBoletoWebViewScreen.tsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  StatusBar,
  Linking,
} from "react-native";
import { WebView } from "react-native-webview";
import Clipboard from "@react-native-clipboard/clipboard";

import { IosAlert } from "../../ui/components/IosAlert";

export function OwnerBoletoWebViewScreen({ route, navigation }: any) {
  const rawUrl: string | undefined = route?.params?.url;

  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [modal, setModal] = useState<null | { title: string; message: string; onClose?: () => void }>(null);

  const finalUrl = useMemo(() => {
    if (!rawUrl) return undefined;

    const lower = rawUrl.toLowerCase();
    const looksLikePdf = lower.includes("ticket.pdf") || lower.includes(".pdf");

    if (looksLikePdf) {
      return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(rawUrl)}`;
    }

    return rawUrl;
  }, [rawUrl]);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(false);
    }, 6000);

    return () => clearTimeout(t);
  }, [finalUrl]);

  const onOpenExternal = async () => {
    if (!rawUrl) return;

    try {
      const ok = await Linking.canOpenURL(rawUrl);
      if (!ok) {
        setModal({ title: "Erro", message: "Não foi possível abrir o link." });
        return;
      }
      await Linking.openURL(rawUrl);
    } catch {
      setModal({ title: "Erro", message: "Não foi possível abrir o link." });
    }
  };

  const onCopyLink = () => {
    if (!rawUrl) return;
    Clipboard.setString(rawUrl);
    setModal({ title: "Copiado!", message: "Link do boleto copiado." });
  };

  if (!finalUrl) {
    return (
      <View style={s.center}>
        <Text style={s.title}>Não foi possível abrir o boleto</Text>
        <Text style={s.sub}>URL ausente.</Text>

        <Pressable onPress={() => navigation.goBack()} style={s.btn}>
          <Text style={s.btnText}>Voltar</Text>
        </Pressable>

        <IosAlert
          visible={true}
          title="Erro"
          message="URL ausente."
          onClose={() => navigation.goBack?.()}
        />
      </View>
    );
  }

  return (
    <View style={s.root}>
      {Platform.OS === "android" ? <View style={{ height: StatusBar.currentHeight ?? 0 }} /> : null}

      <View style={s.header}>
        <Pressable hitSlop={12} onPress={() => navigation.goBack()} style={s.headerBtn}>
          <Text style={s.headerBtnText}>{"< Voltar"}</Text>
        </Pressable>

        <Text style={s.headerTitle}>Boleto</Text>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable hitSlop={12} onPress={onCopyLink} style={s.iconBtn}>
            <Text style={s.iconTxt}>⧉</Text>
          </Pressable>
          <Pressable hitSlop={12} onPress={onOpenExternal} style={s.iconBtn}>
            <Text style={s.iconTxt}>↗</Text>
          </Pressable>
        </View>
      </View>

      <View style={s.hairline} />

      {failed ? (
        <View style={s.center}>
          <Text style={s.title}>Não deu para carregar no app</Text>
          <Text style={s.sub}>
            Isso acontece quando a página vira download/PDF ou bloqueia WebView. Você pode abrir no navegador.
          </Text>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <Pressable onPress={onOpenExternal} style={s.btn}>
              <Text style={s.btnText}>Abrir no navegador</Text>
            </Pressable>

            <Pressable onPress={() => navigation.goBack()} style={[s.btn, { opacity: 0.9 }]}>
              <Text style={s.btnText}>Voltar</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          {loading ? (
            <View style={s.loadingOverlay}>
              <ActivityIndicator />
              <Text style={s.sub}>Carregando boleto…</Text>
            </View>
          ) : null}

          <WebView
            ref={webRef}
            source={{ uri: finalUrl }}
            onLoadStart={() => {
              setLoading(true);
              setFailed(false);
            }}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setFailed(true);
            }}
            onHttpError={() => {
              setLoading(false);
              setFailed(true);
            }}
            javaScriptEnabled
            domStorageEnabled
            thirdPartyCookiesEnabled={true}
            sharedCookiesEnabled={Platform.OS === "ios"}
            setSupportMultipleWindows={false}
          />
        </>
      )}

      <IosAlert
        visible={!!modal}
        title={modal?.title}
        message={modal?.message}
        onClose={() => {
          const cb = modal?.onClose;
          setModal(null);
          cb?.();
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },

  header: {
    height: 54,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
  },
  headerBtn: { minWidth: 80, height: 44, justifyContent: "center" },
  headerBtnText: { color: "#000", fontSize: 15, fontWeight: "900", letterSpacing: -0.2 },
  headerTitle: { color: "#000", fontSize: 16, fontWeight: "900", letterSpacing: -0.2 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconTxt: { color: "#000", fontSize: 14, fontWeight: "900" },

  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(0,0,0,0.18)" },

  loadingOverlay: {
    position: "absolute",
    top: 54 + (Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0),
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    zIndex: 2,
  },

  center: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    gap: 10,
  },
  title: { color: "#000", fontSize: 18, fontWeight: "900", textAlign: "center" },
  sub: { color: "#000", opacity: 0.75, fontSize: 13, fontWeight: "600", textAlign: "center" },

  btn: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  btnText: { color: "#000", fontSize: 14, fontWeight: "900" },
});