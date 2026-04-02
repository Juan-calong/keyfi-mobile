import React, { useCallback, useState } from "react";
import { Share } from "react-native";
import Clipboard from "@react-native-clipboard/clipboard";
import axios from "axios";
import type { IosConfirmAction } from "../../ui/components/IosConfirm";

import { useAuthStore } from "../../stores/auth.store";
import Config from "react-native-config";

import { Screen } from "../../ui/components/Screen";
import { Container } from "../../ui/components/Container";
import { Loading, ErrorState } from "../../ui/components/State";
import { IosAlert } from "../../ui/components/IosAlert";
import { IosConfirm } from "../../ui/components/IosConfirm";

import type {
  ModalState,
  ViewMode,
} from "../../features/components/seller-profile/sellerProfile.types";
import { useSellerProfileQueries } from "../../features/components/seller-profile/hooks/useSellerProfileQueries";
import { useWalletPixForm } from "../../features/components/seller-profile/hooks/useWalletPixForm";
import { useBeneficiaryForm } from "../../features/components/seller-profile/hooks/useBeneficiaryForm";
import { useSellerProfileActions } from "../../features/components/seller-profile/hooks/useSellerProfileActions";

import { HomeView } from "../../features/components/seller-profile/components/HomeView";
import { TokenView } from "../../features/components/seller-profile/components/TokenView";
import { DetailsView } from "../../features/components/seller-profile/components/DetailsView";
import { LinkSalonView } from "../../features/components/seller-profile/components/LinkSalonView";
import { PixView } from "../../features/components/seller-profile/components/PixView";
import { BeneficiaryView } from "../../features/components/seller-profile/components/BeneficiaryView";
import { ReferralLinksView } from "../../features/components/seller-profile/components/ReferralLinksView";

// ajuste aqui se você já tiver um client api central
const api = axios.create({
  baseURL: Config.API_BASE_URL,
});

type ConfirmState =
  | null
  | {
      title: string;
      message: string;
      actions: IosConfirmAction[];
    };

export function SellerProfileScreen() {
  const logout = useAuthStore((s) => s.logout);
  const token = useAuthStore((s) => s.token);

  const [view, setView] = useState<ViewMode>("HOME");
  const [salonId, setSalonId] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  const {
    meQ,
    walletQ,
    beneficiaryQ,
    referralsQ,
    referrals,
    destination,
    beneficiary,
    referralToken,
    sellerId,
    hasPix,
    hasBeneficiary,
    isBlocked,
    loading,
    anyError,
  } = useSellerProfileQueries();

  const walletForm = useWalletPixForm(destination);
  const beneficiaryForm = useBeneficiaryForm(beneficiary);

  const {
    copyText,
    savePixMut,
    saveBeneficiaryMut,
    deleteBeneficiaryMut,
    requestPermMut,
  } = useSellerProfileActions(setModal);

  const loadInviteLink = useCallback(async () => {
    try {
      setInviteLoading(true);
      console.log("[INVITE][LOAD][START]", {
  baseURL: Config.API_BASE_URL,
  hasToken: !!token,
});

      const res = await api.get("/seller/invite-link", {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : undefined,
      });
      console.log("[INVITE][LOAD][RESPONSE]", res?.data);

      const url = String(res.data?.url || "").trim();

      if (!url) {
        throw new Error("INVITE_URL_EMPTY");
      }

      setInviteUrl(url);
      return url;
    } catch (err: any) {
      console.log("[INVITE][LOAD][ERROR]", {
  message: err?.message,
  status: err?.response?.status,
  data: err?.response?.data,
});
      setModal({
        title: "Erro ao carregar link",
        message:
          err?.response?.data?.error ||
          err?.message ||
          "Não foi possível gerar seu link de convite.",
          
      });
      return "";
    } finally {
      setInviteLoading(false);
    }
  }, [token]);

  const copyToken = useCallback(() => {
    if (!referralToken) {
      setModal({
        title: "Sem token",
        message: "Seu token não apareceu. Verifique o /profiles/me.",
      });
      return;
    }

    copyText(referralToken, "Token copiado");
  }, [referralToken, copyText]);

  const copyInviteLink = useCallback(() => {
    if (!inviteUrl) {
      setModal({
        title: "Sem link",
        message: "Seu link ainda não foi carregado.",
      });
      return;
    }

    Clipboard.setString(inviteUrl);
    setModal({
      title: "Link copiado",
      message: "O link do convite foi copiado.",
    });
  }, [inviteUrl]);

  const shareInviteLink = useCallback(async () => {
    if (!inviteUrl) {
      setModal({
        title: "Sem link",
        message: "Seu link ainda não foi carregado.",
      });
      return;
    }

    await Share.share({
      message: inviteUrl,
    });
  }, [inviteUrl]);

  const refreshTokenArea = useCallback(async () => {
    await meQ.refetch();
    await loadInviteLink();
  }, [meQ, loadInviteLink]);

  return (
    <Screen>
      <Container style={{ flex: 1 }}>
        {loading ? (
          <Loading />
        ) : anyError ? (
          <ErrorState
            onRetry={() => {
              meQ.refetch();
              walletQ.refetch();
              beneficiaryQ.refetch();
              referralsQ.refetch();
            }}
          />
        ) : view === "HOME" ? (
          <HomeView
            referralToken={referralToken}
            hasPix={hasPix}
            hasBeneficiary={hasBeneficiary}
            isBlocked={isBlocked}
            onOpenDetails={() => setView("DETAILS")}
            onOpenToken={async () => {
                console.log("[INVITE][UI][OPEN_TOKEN]", {
    inviteUrl,
    inviteLoading,
    referralToken,
  });
              setView("TOKEN");
              if (!inviteUrl && !inviteLoading) {
                await loadInviteLink();
              }
            }}
            onOpenReferrals={() => setView("REFERRALS")}
            onOpenPix={() => setView("PIX")}
            onOpenBeneficiary={() => setView("BENEFICIARY")}
            onOpenLinkSalon={() => setView("LINK_SALON")}
            onLogout={() =>
              setConfirm({
                title: "Sair",
                message: "Deseja sair da conta?",
                actions: [
                  { text: "Cancelar", style: "cancel" },
                  { text: "Sair", style: "destructive", onPress: () => logout() },
                ],
              })
            }
          />
        ) : view === "TOKEN" ? (
          <TokenView
            referralToken={referralToken}
            inviteUrl={inviteUrl}
            onBack={() => setView("HOME")}
            onCopyToken={copyToken}
            onCopyLink={copyInviteLink}
            onShareLink={shareInviteLink}
            onRefresh={refreshTokenArea}
          />
        ) : view === "DETAILS" ? (
          <DetailsView
            email={String(meQ.data?.email ?? "—")}
            sellerId={String(sellerId ?? "—")}
            onBack={() => setView("HOME")}
          />
        ) : view === "PIX" ? (
          <PixView
            destination={destination}
            isBlocked={isBlocked}
            walletIsRefetching={walletQ.isRefetching}
            onBack={() => setView("HOME")}
            onRefresh={() => walletQ.refetch()}
            onSave={() =>
              savePixMut.mutate({
                pixKeyType: walletForm.pixKeyType,
                pixKey: walletForm.pixKey,
                normalizedPixKey: walletForm.normalizedPixKey,
                holderName: walletForm.holderName,
                holderDoc: walletForm.holderDoc,
                bankName: walletForm.bankName,
                notes: walletForm.notes,
              })
            }
            savePending={savePixMut.isPending}
            form={walletForm}
          />
        ) : view === "BENEFICIARY" ? (
          <BeneficiaryView
            beneficiary={beneficiary}
            onBack={() => setView("HOME")}
            onRefresh={() => beneficiaryQ.refetch()}
            onSave={() => saveBeneficiaryMut.mutate(beneficiaryForm.payload)}
            onDelete={() =>
              setConfirm({
                title: "Remover beneficiário",
                message: "Deseja remover o cadastro do beneficiário?",
                actions: [
                  { text: "Cancelar", style: "cancel" },
                  {
                    text: "Remover",
                    style: "destructive",
                    onPress: () =>
                      deleteBeneficiaryMut.mutate(undefined, {
                        onSuccess: () => setView("HOME"),
                      }),
                  },
                ],
              })
            }
            savePending={saveBeneficiaryMut.isPending}
            deletePending={deleteBeneficiaryMut.isPending}
            loading={beneficiaryQ.isRefetching}
            form={beneficiaryForm}
          />
        ) : view === "REFERRALS" ? (
          <ReferralLinksView
            data={referrals}
            onBack={() => setView("HOME")}
            onRefresh={() => referralsQ.refetch()}
          />
        ) : view === "LINK_SALON" ? (
          <LinkSalonView
            salonId={salonId}
            setSalonId={setSalonId}
            requestPermPending={requestPermMut.isPending}
            onRequestPermission={() =>
              requestPermMut.mutate(salonId, {
                onSuccess: () => {
                  setSalonId("");
                  setView("HOME");
                },
              })
            }
            onBack={() => setView("HOME")}
            setModal={setModal}
          />
        ) : null}

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
      </Container>
    </Screen>
  );
}