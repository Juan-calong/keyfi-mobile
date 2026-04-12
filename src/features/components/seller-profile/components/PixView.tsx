import React from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import type { DestinationDTO, WalletPixFormState, WalletPixKeyType } from "../sellerProfile.types";
import { formatDateTimeBR, maskPixCpfCnpjByType } from "../sellerProfile.utils";
import { pix } from "../sellerProfile.styles";

type Props = {
  destination: DestinationDTO | null;
  isBlocked: boolean;
  walletIsRefetching: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onSave: () => void;
  savePending: boolean;
  form: WalletPixFormState;
};

export function PixView({
  destination,
  isBlocked,
  walletIsRefetching,
  onBack,
  onRefresh,
  onSave,
  savePending,
  form,
}: Props) {
  return (
    <View style={{ flex: 1 }}>
      <View style={pix.nav}>
        <Pressable hitSlop={12} onPress={onBack} style={pix.backBtn}>
          <Text style={pix.backText}>{"<"}</Text>
        </Pressable>

        <Text style={pix.navTitle}>Recebimento (PIX)</Text>

        <Pressable hitSlop={12} onPress={onRefresh} style={pix.rightBtn}>
          <Text style={pix.rightText}>{walletIsRefetching ? "…" : "⟳"}</Text>
        </Pressable>
      </View>

      <View style={pix.hairline} />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={pix.scroll}
      >
        <Text style={pix.sectionTitle}>PIX</Text>
        <Text style={pix.sub}>
          Atual: {destination?.pixKey ? String(destination.pixKey) : "não cadastrado"}
        </Text>

        {isBlocked ? (
          <View style={{ marginTop: 10 }}>
            <Text style={[pix.sub, { fontWeight: "900", opacity: 1 }]}>
              Bloqueado por segurança até {formatDateTimeBR(destination?.payoutBlockedUntil ?? null)}
            </Text>
            <Text style={pix.sub}>
              Após alterar o PIX, pagamentos podem ficar bloqueados por algumas horas por segurança.
            </Text>
          </View>
        ) : null}

        <View style={[pix.hairline, { marginVertical: 18 }]} />

        <Text style={pix.label}>Tipo de chave</Text>
        <View style={pix.chipsRow}>
          {(["CPF", "CNPJ"] as WalletPixKeyType[]).map((tp) => (
            <Pressable
              key={tp}
              onPress={() => form.setPixKeyType(tp)}
              disabled={savePending}
              style={({ pressed }) => [
                pix.chip,
                form.pixKeyType === tp && pix.chipActive,
                pressed && { opacity: 0.9 },
                savePending && { opacity: 0.6 },
              ]}
            >
              <Text style={[pix.chipText, form.pixKeyType === tp && pix.chipTextActive]}>
                {form.pixKeyType === tp ? "✓ " : ""}
                {tp}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ height: 14 }} />

        <Text style={pix.label}>Chave PIX</Text>
        <TextInput
          value={form.pixKey}
          onChangeText={(value) => form.setPixKey(maskPixCpfCnpjByType(form.pixKeyType, value))}
          placeholder="Digite CPF ou CNPJ"
          placeholderTextColor={"rgba(0,0,0,0.35)"}
          keyboardType="numeric"
          autoCapitalize="none"
          autoCorrect={false}
          style={pix.input}
        />

        <Text style={[pix.label, { marginTop: 14 }]}>Nome do titular</Text>
        <TextInput
          value={form.holderName}
          onChangeText={form.setHolderName}
          placeholder="Ex: Fulano de Tal"
          placeholderTextColor={"rgba(0,0,0,0.35)"}
          autoCapitalize="words"
          autoCorrect={false}
          style={pix.input}
        />

        <Text style={[pix.label, { marginTop: 14 }]}>CPF/CNPJ do titular</Text>
        <TextInput
          value={form.holderDoc}
          onChangeText={form.setHolderDoc}
          placeholder="Somente números"
          placeholderTextColor={"rgba(0,0,0,0.35)"}
          keyboardType="numeric"
          autoCorrect={false}
          style={pix.input}
        />

        <Text style={[pix.label, { marginTop: 14 }]}>Banco</Text>
        <TextInput
          value={form.bankName}
          onChangeText={form.setBankName}
          placeholder="Ex: Inter"
          placeholderTextColor={"rgba(0,0,0,0.35)"}
          autoCapitalize="words"
          autoCorrect={false}
          style={pix.input}
        />

        <Text style={[pix.label, { marginTop: 14 }]}>Observações (opcional)</Text>
        <TextInput
          value={form.notes}
          onChangeText={form.setNotes}
          placeholder="Opcional"
          placeholderTextColor={"rgba(0,0,0,0.35)"}
          multiline
          autoCorrect={false}
          style={[pix.input, { minHeight: 88, paddingVertical: 10 }]}
        />

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={pix.ctaWrap}>
        <View style={pix.hairline} />

        <Pressable
          onPress={onSave}
          disabled={savePending}
          style={({ pressed }) => [
            pix.btn,
            pressed && { opacity: 0.85 },
            savePending && { opacity: 0.6 },
          ]}
        >
          <Text style={pix.btnText}>{savePending ? "..." : "Salvar PIX"}</Text>
        </Pressable>
      </View>
    </View>
  );
}