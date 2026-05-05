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

  if (invite.inviteType === "SELLER") {
    const res = await api.post(endpoints.referrals.applyInviteForCurrentUser, {
      linkType: "SELLER_INVITE",
      sellerReferralToken: token,
    });

    if (res.data?.ok && res.data?.applied) {
      await clearPendingInvite();
    }

    return res.data;
  }

  if (invite.inviteType === "SALON") {
    const res = await api.post(endpoints.referrals.applyInviteForCurrentUser, {
      linkType: "SALON_INVITE",
      salonReferralToken: token,
    });

    if (res.data?.ok && res.data?.applied) {
      await clearPendingInvite();
    }

    return res.data;
  }

  return { applied: false, reason: "UNKNOWN_INVITE_TYPE" };
}