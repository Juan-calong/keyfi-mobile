import React, { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useAuthStore } from "../../stores/auth.store";

import { IosAlert } from "../../ui/components/IosAlert";
import { IosConfirm, type IosConfirmAction } from "../../ui/components/IosConfirm";
import { friendlyError } from "../../core/errors/friendlyError";

export function SellerPendingScreen() {
  const syncMe = useAuthStore((s) => s.syncMe);
  const logout = useAuthStore((s) => s.logout);

  const [loading, setLoading] = useState(false);
  const [auto, setAuto] = useState(true);

  const [modal, setModal] = useState<null | { title: string; message: string }>(null);
  const [confirm, setConfirm] = useState<null | { title: string; message: string; actions: IosConfirmAction[] }>(null);

  async function refreshNow() {
    setLoading(true);
    try {
      const changed = await syncMe();
      if (!changed) {
        setModal({
          title: "Ainda em análise",
          message: "Seu cadastro ainda não foi aprovado. Tente novamente em instantes.",
        });
      }
    } catch (e: any) {
      const fe = friendlyError(e);
      setModal({ title: fe.title || "Erro", message: fe.message || "Falha ao atualizar status." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!auto) return;

    let alive = true;
    let t: any;

    const loop = async () => {
      if (!alive) return;
      try {
        const changed = await syncMe();
        if (changed) return;
      } catch {
        // silencioso
      }
      t = setTimeout(loop, 25000);
    };

    t = setTimeout(loop, 6000);
    return () => {
      alive = false;
      if (t) clearTimeout(t);
    };
  }, [auto, syncMe]);

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: "center" }}>
      <View style={{ padding: 18, borderRadius: 16, backgroundColor: "#fff" }}>
        <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 6 }}>Cadastro em análise</Text>
        <Text style={{ color: "#555", marginBottom: 16 }}>
          Seu cadastro foi criado, mas precisa ser aprovado pelo admin. Assim que for aprovado, você entra automaticamente no painel.
        </Text>

        <Pressable
          onPress={refreshNow}
          disabled={loading}
          style={{
            height: 44,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: loading ? "#999" : "#111",
            marginBottom: 10,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>{loading ? "Atualizando..." : "Atualizar status"}</Text>
        </Pressable>

        <Pressable
          onPress={() => setAuto((v) => !v)}
          style={{
            height: 40,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f2f2f2",
            marginBottom: 10,
          }}
        >
          <Text style={{ color: "#111", fontWeight: "700" }}>{auto ? "Desativar auto atualização" : "Ativar auto atualização"}</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setConfirm({
              title: "Sair",
              message: "Deseja sair da conta?",
              actions: [
                { text: "Cancelar", style: "cancel" },
                { text: "Sair", style: "destructive", onPress: () => logout() },
              ],
            });
          }}
          style={{ height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: "#d00", fontWeight: "700" }}>Sair</Text>
        </Pressable>
      </View>

      <IosAlert visible={!!modal} title={modal?.title} message={modal?.message} onClose={() => setModal(null)} />

      <IosConfirm
        visible={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        actions={confirm?.actions || []}
        onClose={() => setConfirm(null)}
      />
    </View>
  );
}