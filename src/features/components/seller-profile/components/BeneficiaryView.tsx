import React from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { Card } from "../../../../ui/components/Card";

import type {
  BeneficiaryFormState,
  BeneficiaryPixKeyType,
  SellerBeneficiaryDTO,
} from "../sellerProfile.types";
import { beneficiaryStyles, pix, s } from "../sellerProfile.styles";
import { formatDateOnlyBR, formatDateTimeBR, maskPixCpfCnpjByType } from "../sellerProfile.utils";

type Props = {
  beneficiary: SellerBeneficiaryDTO | null;
  onBack: () => void;
  onRefresh: () => void;
  onSave: () => void;
  onDelete: () => void;
  savePending: boolean;
  deletePending: boolean;
  loading: boolean;
  form: BeneficiaryFormState;
};

export function BeneficiaryView({
  beneficiary,
  onBack,
  onRefresh,
  onSave,
  onDelete,
  savePending,
  deletePending,
  loading,
  form,
}: Props) {
  return (
    <View style={{ flex: 1 }}>
      <View style={pix.nav}>
        <Pressable hitSlop={12} onPress={onBack} style={pix.backBtn}>
          <Text style={pix.backText}>{"<"}</Text>
        </Pressable>

        <Text style={pix.navTitle}>Beneficiário</Text>

        <Pressable hitSlop={12} onPress={onRefresh} style={pix.rightBtn}>
          <Text style={pix.rightText}>{loading ? "…" : "⟳"}</Text>
        </Pressable>
      </View>

      <View style={pix.hairline} />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={pix.scroll}
      >
        <Text style={pix.sectionTitle}>Cadastro do beneficiário</Text>
        <Text style={pix.sub}>
          Esse cadastro não altera comissão automaticamente. Em caso de óbito, a análise continua manual.
        </Text>

        {beneficiary ? (
          <View style={{ marginTop: 10 }}>
            <Text style={pix.sub}>Cadastrado em: {formatDateTimeBR(beneficiary.createdAt)}</Text>
            <Text style={pix.sub}>Última atualização: {formatDateTimeBR(beneficiary.updatedAt)}</Text>
          </View>
        ) : null}

        <View style={[pix.hairline, { marginVertical: 18 }]} />

        <Text style={pix.label}>Nome completo</Text>
        <TextInput
          value={form.fullName}
          onChangeText={form.setFullName}
          placeholder="Nome do beneficiário"
          placeholderTextColor={"rgba(0,0,0,0.35)"}
          autoCapitalize="words"
          autoCorrect={false}
          style={pix.input}
        />

        <Text style={[pix.label, { marginTop: 14 }]}>CPF/CNPJ</Text>
        <TextInput
          value={form.document}
          onChangeText={form.setDocument}
          placeholder="Documento do beneficiário"
          placeholderTextColor={"rgba(0,0,0,0.35)"}
          keyboardType="numeric"
          autoCorrect={false}
          style={pix.input}
        />

        <Text style={[pix.label, { marginTop: 14 }]}>E-mail</Text>
        <TextInput
          value={form.email}
          onChangeText={form.setEmail}
          placeholder="Opcional"
          placeholderTextColor={"rgba(0,0,0,0.35)"}
          autoCapitalize="none"
          autoCorrect={false}
          style={pix.input}
        />

        <Text style={[pix.label, { marginTop: 14 }]}>Telefone</Text>
        <TextInput
          value={form.phone}
          onChangeText={form.setPhone}
          placeholder="Opcional"
          placeholderTextColor={"rgba(0,0,0,0.35)"}
          keyboardType="phone-pad"
          autoCorrect={false}
          style={pix.input}
        />

        <Text style={[pix.label, { marginTop: 14 }]}>Data de nascimento</Text>
        <TextInput
          value={form.birthDate}
          onChangeText={form.setBirthDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={"rgba(0,0,0,0.35)"}
          autoCapitalize="none"
          autoCorrect={false}
          style={pix.input}
        />

        <View style={[pix.hairline, { marginVertical: 18 }]} />

        <Text style={pix.sectionTitle}>PIX do beneficiário</Text>
        <Text style={pix.sub}>Preencha PIX, dados bancários ou ambos.</Text>

        <Text style={[pix.label, { marginTop: 14 }]}>Tipo de chave PIX</Text>
        <View style={pix.chipsRow}>
          {(["CPF", "CNPJ"] as BeneficiaryPixKeyType[]).map((tp) => (
            <Pressable
              key={tp}
              onPress={() => form.setPixKeyType(tp)}
              disabled={savePending || deletePending}
              style={({ pressed }) => [
                pix.chip,
                form.pixKeyType === tp && pix.chipActive,
                pressed && { opacity: 0.9 },
                (savePending || deletePending) && { opacity: 0.6 },
              ]}
            >
              <Text style={[pix.chipText, form.pixKeyType === tp && pix.chipTextActive]}>
                {form.pixKeyType === tp ? "✓ " : ""}
                {tp}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[pix.label, { marginTop: 14 }]}>Chave PIX</Text>
        <TextInput
          value={form.pixKey}
          onChangeText={(value) => form.setPixKey(maskPixCpfCnpjByType(form.pixKeyType, value))}
          placeholder="CPF ou CNPJ"
          placeholderTextColor={"rgba(0,0,0,0.35)"}
          keyboardType="numeric"
          autoCapitalize="none"
          autoCorrect={false}
          style={pix.input}
        />

        <View style={[pix.hairline, { marginVertical: 18 }]} />

        <Text style={pix.sectionTitle}>Conta bancária</Text>
        <Text style={pix.sub}>
          Se começar a preencher conta bancária, complete os campos obrigatórios.
        </Text>

        <Text style={[pix.label, { marginTop: 14 }]}>Código do banco</Text>
        <TextInput
          value={form.bankCode}
          onChangeText={form.setBankCode}
          placeholder="Ex: 001"
          placeholderTextColor={"rgba(0,0,0,0.35)"}
          keyboardType="numeric"
          autoCorrect={false}
          style={pix.input}
        />

        <Text style={[pix.label, { marginTop: 14 }]}>Nome do banco</Text>
        <TextInput
          value={form.bankName}
          onChangeText={form.setBankName}
          placeholder="Ex: Banco do Brasil"
          placeholderTextColor={"rgba(0,0,0,0.35)"}
          autoCapitalize="words"
          autoCorrect={false}
          style={pix.input}
        />

        <Text style={[pix.label, { marginTop: 14 }]}>Tipo de conta</Text>
        <View style={pix.chipsRow}>
          {(["CHECKING", "SAVINGS"] as const).map((tp) => (
            <Pressable
              key={tp}
              onPress={() => form.setAccountType(tp)}
              disabled={savePending || deletePending}
              style={({ pressed }) => [
                pix.chip,
                form.accountType === tp && pix.chipActive,
                pressed && { opacity: 0.9 },
                (savePending || deletePending) && { opacity: 0.6 },
              ]}
            >
              <Text style={[pix.chipText, form.accountType === tp && pix.chipTextActive]}>
                {form.accountType === tp ? "✓ " : ""}
                {tp === "CHECKING" ? "Corrente" : "Poupança"}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[pix.label, { marginTop: 14 }]}>Agência</Text>
        <TextInput
          value={form.agency}
          onChangeText={form.setAgency}
          placeholder="Agência"
          placeholderTextColor={"rgba(0,0,0,0.35)"}
          autoCorrect={false}
          style={pix.input}
        />

        <Text style={[pix.label, { marginTop: 14 }]}>Número da conta</Text>
        <TextInput
          value={form.accountNumber}
          onChangeText={form.setAccountNumber}
          placeholder="Conta"
          placeholderTextColor={"rgba(0,0,0,0.35)"}
          autoCorrect={false}
          style={pix.input}
        />

        <Text style={[pix.label, { marginTop: 14 }]}>Dígito</Text>
        <TextInput
          value={form.accountDigit}
          onChangeText={form.setAccountDigit}
          placeholder="Opcional"
          placeholderTextColor={"rgba(0,0,0,0.35)"}
          autoCorrect={false}
          style={pix.input}
        />

        <Text style={[pix.label, { marginTop: 14 }]}>Nome do titular da conta</Text>
        <TextInput
          value={form.accountHolderName}
          onChangeText={form.setAccountHolderName}
          placeholder="Titular da conta"
          placeholderTextColor={"rgba(0,0,0,0.35)"}
          autoCapitalize="words"
          autoCorrect={false}
          style={pix.input}
        />

        <Text style={[pix.label, { marginTop: 14 }]}>CPF/CNPJ do titular da conta</Text>
        <TextInput
          value={form.accountHolderDocument}
          onChangeText={form.setAccountHolderDocument}
          placeholder="Documento do titular"
          placeholderTextColor={"rgba(0,0,0,0.35)"}
          keyboardType="numeric"
          autoCorrect={false}
          style={pix.input}
        />

        <Text style={[pix.label, { marginTop: 14 }]}>Observações</Text>
        <TextInput
          value={form.notes}
          onChangeText={form.setNotes}
          placeholder="Opcional"
          placeholderTextColor={"rgba(0,0,0,0.35)"}
          multiline
          autoCorrect={false}
          style={[pix.input, { minHeight: 88, paddingVertical: 10 }]}
        />

        {beneficiary ? (
          <Card style={{ marginTop: 18, gap: 8 }}>
            <Text style={s.cardTitle}>Resumo atual</Text>

            <Text style={s.line}>
              Nome: <Text style={s.bold}>{beneficiary.fullName}</Text>
            </Text>

            <Text style={s.line}>
              Documento: <Text style={s.bold}>{beneficiary.document}</Text>
            </Text>

            {beneficiary.birthDate ? (
              <Text style={s.line}>
                Nascimento: <Text style={s.bold}>{formatDateOnlyBR(beneficiary.birthDate)}</Text>
              </Text>
            ) : null}

            {beneficiary.pixKey ? (
              <Text style={s.line}>
                PIX:{" "}
                <Text style={s.bold}>
                  {beneficiary.pixKeyType} - {beneficiary.pixKey}
                </Text>
              </Text>
            ) : null}
          </Card>
        ) : null}

        <View style={{ height: 150 }} />
      </ScrollView>

      <View style={pix.ctaWrap}>
        <View style={pix.hairline} />

        <View style={{ gap: 10 }}>
          <Pressable
            onPress={onSave}
            disabled={savePending || deletePending}
            style={({ pressed }) => [
              pix.btn,
              pressed && { opacity: 0.85 },
              (savePending || deletePending) && { opacity: 0.6 },
            ]}
          >
            <Text style={pix.btnText}>{savePending ? "..." : "Salvar beneficiário"}</Text>
          </Pressable>

          {beneficiary ? (
            <Pressable
              onPress={onDelete}
              disabled={savePending || deletePending}
              style={({ pressed }) => [
                beneficiaryStyles.deleteBtn,
                pressed && { opacity: 0.85 },
                (savePending || deletePending) && { opacity: 0.6 },
              ]}
            >
              <Text style={beneficiaryStyles.deleteBtnText}>
                {deletePending ? "..." : "Remover beneficiário"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}