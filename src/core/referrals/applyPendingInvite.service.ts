import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import {
  clearPendingInvite,
  getPendingInvite,
} from "../airbridge/invite-link.service";

function normalizeToken(v: string) {
  return String(v || "").trim().toUpperCase().replace(/\s+/g, "");
}

export async function applyPendingInvite() {
  const invite = await getPendingInvite();
  if (!invite) return { applied: false, reason: "NO_PENDING_INVITE" };

  const token = normalizeToken(invite.token);

  console.log("[REFERRAL][APPLY_PENDING][START]", {
    inviteType: invite.inviteType,
    tokenPreview: `${token.slice(0, 6)}...`,
    receivedAt: invite.receivedAt,
  });

  if (invite.inviteType === "SELLER") {
    const res = await api.post(endpoints.referrals.applySeller, {
      linkType: "SELLER_INVITE",
      sellerReferralToken: token,
    });

    if (res.data?.ok && res.data?.applied) {
      await clearPendingInvite();
      console.log("[REFERRAL][APPLY_PENDING][CLEARED_AFTER_SUCCESS]", res.data);
    } else {
      console.log("[REFERRAL][APPLY_PENDING][KEPT_PENDING]", res.data);
    }

    return res.data;
  }

  if (invite.inviteType === "SALON") {
    const res = await api.post(endpoints.referrals.applySeller, {
      linkType: "SALON_INVITE",
      salonReferralToken: token,
    });

    if (res.data?.ok && res.data?.applied) {
      await clearPendingInvite();
      console.log("[REFERRAL][APPLY_PENDING][CLEARED_AFTER_SUCCESS]", res.data);
    } else {
      console.log("[REFERRAL][APPLY_PENDING][KEPT_PENDING]", res.data);
    }

    return res.data;
  }

  return { applied: false, reason: "UNKNOWN_INVITE_TYPE" };
}