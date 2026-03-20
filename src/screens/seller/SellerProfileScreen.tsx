import React, { useCallback, useState } from "react";
import type { IosConfirmAction } from "../../ui/components/IosConfirm";

import { useAuthStore } from "../../stores/auth.store";

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

type ConfirmState =
  | null
  | {
      title: string;
      message: string;
      actions: IosConfirmAction[];
    };

export function SellerProfileScreen() {
  const logout = useAuthStore((s) => s.logout);

  const [view, setView] = useState<ViewMode>("HOME");
  const [salonId, setSalonId] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

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
    shareToken,
    savePixMut,
    saveBeneficiaryMut,
    deleteBeneficiaryMut,
    requestPermMut,
  } = useSellerProfileActions(setModal);

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
            onOpenToken={() => setView("TOKEN")}
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
            onBack={() => setView("HOME")}
            onCopy={copyToken}
            onShare={() => shareToken(referralToken)}
            onRefresh={() => meQ.refetch()}
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