import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { api } from "../../../../core/api/client";
import { endpoints } from "../../../../core/api/endpoints";

import type {
  ProfileMeDTO,
  SellerBeneficiaryResp,
  SellerReferralsResponse,
  WalletResp,
} from "../sellerProfile.types";
import { isFuture, normalizeToken } from "../sellerProfile.utils";

export function useSellerProfileQueries() {
  const meQ = useQuery<ProfileMeDTO>({
    queryKey: ["profiles-me"],
    queryFn: async () => (await api.get(endpoints.profiles.me)).data,
    retry: false,
    staleTime: 0,
  });

  const walletQ = useQuery<WalletResp>({
    queryKey: ["wallet-profile"],
    queryFn: async () =>
      (await api.get(endpoints.wallet.me, { params: { txLimit: 1, payoutLimit: 1 } })).data,
    retry: false,
    staleTime: 0,
  });

  const beneficiaryQ = useQuery<SellerBeneficiaryResp>({
    queryKey: ["seller-beneficiary-me"],
    queryFn: async () => (await api.get(endpoints.sellerBeneficiary.me)).data,
    retry: false,
    staleTime: 0,
  });

  const referralsQ = useQuery<SellerReferralsResponse>({
    queryKey: ["seller-referrals-me"],
    queryFn: async () => (await api.get(endpoints.referrals.sellerMe)).data,
    retry: false,
    staleTime: 0,
  });

  const destination = walletQ.data?.destination ?? null;
  const beneficiary = beneficiaryQ.data?.item ?? null;
  const referrals = referralsQ.data ?? null;

  const referralToken = useMemo(() => {
    const raw =
      meQ.data?.seller?.referralToken ||
      referralsQ.data?.referralToken ||
      "";
    return normalizeToken(raw);
  }, [meQ.data?.seller?.referralToken, referralsQ.data?.referralToken]);

  return {
    meQ,
    walletQ,
    beneficiaryQ,
    referralsQ,

    destination,
    beneficiary,
    referrals,

    referralToken,
    sellerId: meQ.data?.seller?.id ?? null,

    hasPix: !!destination,
    hasBeneficiary: !!beneficiary,

    isBlocked: isFuture(destination?.payoutBlockedUntil ?? null),

    loading:
      meQ.isLoading ||
      walletQ.isLoading ||
      beneficiaryQ.isLoading ||
      referralsQ.isLoading,

    anyError:
      meQ.isError ||
      walletQ.isError ||
      beneficiaryQ.isError ||
      referralsQ.isError,
  };
}