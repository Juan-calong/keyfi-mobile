// src/core/referrals/applyPendingInvite.service.ts
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import {
  clearPendingInvite,
  getPendingInvite,
} from "../airbridge/invite-link.service";

export async function applyPendingInvite() {
  const invite = await getPendingInvite();
  if (!invite) return { applied: false, reason: "NO_PENDING_INVITE" };

  if (invite.inviteType === "SELLER") {
    const res = await api.post(endpoints.referrals.applySeller, {
      linkType: "SELLER_INVITE",
      sellerReferralToken: invite.token,
    });

    if (res.data?.ok && res.data?.applied) {
      await clearPendingInvite();
    }

    return res.data;
  }

  if (invite.inviteType === "SALON") {
    const res = await api.post(endpoints.referrals.applySeller, {
      linkType: "SALON_INVITE",
      salonReferralToken: invite.token,
    });

    if (res.data?.ok && res.data?.applied) {
      await clearPendingInvite();
    }

    return res.data;
  }

  return { applied: false, reason: "UNKNOWN_INVITE_TYPE" };
}