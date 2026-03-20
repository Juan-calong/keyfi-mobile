// OwnerLinkByToken.screen.tsx  (pode renomear depois se quiser)
import React, { useMemo, useState } from "react";
import { View, Text, TextInput } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { Button } from "../../ui/components/Button";
import { t } from "../../ui/tokens";

import { api } from "../../core/api/client";
import { endpoints } from "../../core/api/endpoints";

import { IosAlert } from "../../ui/components/IosAlert";
import { friendlyError } from "../../core/errors/friendlyError";

function normalizeToken(v: string) {
  return String(v ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ""); // remove espaços do meio também
}

export function OwnerApplyReferralScreen() {
  const nav = useNavigation<any>();
  const [token, setToken] = useState("");

  const [modal, setModal] = useState<null | { title: string; message: string; onClose?: () => void }>(null);

  const cleanToken = useMemo(() => normalizeToken(token), [token]);

  const mut = useMutation({
    mutationFn: async () => {
      if (!cleanToken) throw new Error("TOKEN_EMPTY");
      const res = await api.patch(endpoints.referrals.setSalonReferrerOnce, {
        referralToken: cleanToken,
      });

      return res.data;
    },
    onSuccess: () => {
      setModal({
        title: "Pronto ✅",
        message: "Indicador definido com sucesso.",
        onClose: () => nav.goBack(),
      });
    },
    onError: (e: any) => {
      // Seu backend retorna erros no campo `error`
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        (e?.message === "TOKEN_EMPTY" ? "Informe um token." : null);

      if (msg) {
        setModal({ title: "Erro", message: String(msg) });
        return;
      }

      const fe = friendlyError(e);
      setModal({ title: fe.title || "Erro", message: fe.message || "Não foi possível aplicar esse token." });
    },
  });

  return (
    <Screen>
      <Container style={{ flex: 1 }}>
        <Text style={{ marginTop: 14, color: t.colors.text, fontWeight: "900", fontSize: 22 }}>
          Aplicar token de indicador
        </Text>

        <Text style={{ marginTop: 6, color: t.colors.text2, fontWeight: "800", fontSize: 12 }}>
          Cole o token do vendedor ou salão que vai receber a comissão (isso é permanente).
        </Text>

        <TextInput
          value={token}
          onChangeText={setToken}
          placeholder="EX: A1B2C3D4"
          placeholderTextColor={t.colors.text2}
          autoCapitalize="characters"
          autoCorrect={false}
          style={{
            marginTop: 14,
            height: 46,
            borderRadius: 14,
            paddingHorizontal: 14,
            borderWidth: 1,
            borderColor: t.colors.border,
            backgroundColor: t.colors.surface,
            color: t.colors.text,
            fontWeight: "900",
            letterSpacing: 1,
          }}
        />

        <View style={{ marginTop: 12 }}>
          <Button
            title={mut.isPending ? "..." : "Aplicar token"}
            variant="primary"
            onPress={() => mut.mutate()}
            disabled={!cleanToken || mut.isPending}
            loading={mut.isPending}
            style={{ height: 48, borderRadius: 14 }}
          />
        </View>
      </Container>

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
    </Screen>
  );
}