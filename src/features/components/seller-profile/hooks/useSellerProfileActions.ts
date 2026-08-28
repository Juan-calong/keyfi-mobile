import { useCallback } from "react";
import { Share } from "react-native";
import Clipboard from "@react-native-clipboard/clipboard";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "../../../../core/api/client";
import { endpoints } from "../../../../core/api/endpoints";
import { SellerService } from "../../../../core/api/services/seller.service";
import { friendlyError } from "../../../../core/errors/friendlyError";
import { createIdempotencyKey } from "../../../../core/api/idempotency";

import type {
  BeneficiaryPayload,
  ModalState,
  WalletPixKeyType,
} from "../sellerProfile.types";
import { buildWalletDestinationPayload } from "../sellerProfile.utils";
import { validateBeneficiaryPayload } from "../sellerProfile.beneficiary";

type SetModal = (v: ModalState) => void;

type SavePixInput = {
  pixKeyType: WalletPixKeyType;
  pixKey: string;
  normalizedPixKey: string;
  holderName: string;
  holderDoc: string;
  bankName: string;
  notes: string;
};

function showFriendlyError(
  e: unknown,
  setModal: SetModal,
  fallbackMessage: string
) {
  const fe = friendlyError(e);
  setModal({
    title: fe.title || "Erro",
    message: fe.message || fallbackMessage,
  });
}

export function useSellerProfileActions(setModal: SetModal) {
  const qc = useQueryClient();

  const copyText = useCallback(
    (text: string, title = "Copiado") => {
      Clipboard.setString(text);
      setModal({ title, message: "Já está na área de transferência." });
    },
    [setModal]
  );

  const shareToken = useCallback(async (referralToken: string) => {
    if (!referralToken) return;

    try {
      await Share.share({
        message:
          `Meu token de indicação (KeyFi): ${referralToken}\n\n` +
          `Cole esse token no salão: Configurações > Aplicar token`,
      });
    } catch {}
  }, []);

  const savePixMut = useMutation({
    mutationFn: async (input: SavePixInput) => {
      const payload = buildWalletDestinationPayload(input);

      const idem = createIdempotencyKey("wallet-dest");

      const res = await api.post(endpoints.wallet.destination, payload, {
        headers: { "Idempotency-Key": idem, "X-Idempotency-Key": idem },
      });

      return res.data;
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet-profile"] });
      qc.invalidateQueries({ queryKey: ["wallet-me-seller"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      setModal({ title: "Salvo", message: "Seu PIX foi atualizado." });
    },

    onError: (e) => showFriendlyError(e, setModal, "Falha ao salvar PIX."),
  });

  const saveBeneficiaryMut = useMutation({
    mutationFn: async (payload: BeneficiaryPayload) => {
      const err = validateBeneficiaryPayload(payload);
      if (err) throw new Error(err);

      const res = await api.put(endpoints.sellerBeneficiary.me, payload);
      return res.data;
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seller-beneficiary-me"] });
      setModal({
        title: "Beneficiário salvo",
        message: "Os dados do beneficiário foram atualizados com sucesso.",
      });
    },

    onError: (e) => showFriendlyError(e, setModal, "Falha ao salvar beneficiário."),
  });

  const deleteBeneficiaryMut = useMutation({
    mutationFn: async () => {
      const res = await api.delete(endpoints.sellerBeneficiary.me);
      return res.data;
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seller-beneficiary-me"] });
      setModal({
        title: "Beneficiário removido",
        message: "O cadastro do beneficiário foi removido.",
      });
    },

    onError: (e) => showFriendlyError(e, setModal, "Falha ao remover beneficiário."),
  });

  const requestPermMut = useMutation({
    mutationFn: async (salonId: string) => {
      const id = String(salonId || "").trim();
      if (!id) throw new Error("Cole o código do salão.");

      return SellerService.requestPermission(id);
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seller-permissions"] });
      setModal({ title: "Pedido enviado", message: "Agora é só aguardar o salão aprovar." });
    },

    onError: (e) => showFriendlyError(e, setModal, "Falha ao pedir acesso."),
  });

  return {
    copyText,
    shareToken,
    savePixMut,
    saveBeneficiaryMut,
    deleteBeneficiaryMut,
    requestPermMut,
  };
}
