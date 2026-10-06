import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import {
  clearPendingInvite,
  getPendingInvite,
  type PendingInvite,
} from "../airbridge/invite-link.service";

function normalizeToken(v: string) {
  return String(v || "").trim().toUpperCase().replace(/\s+/g, "");
}

async function clearAppliedInvite(invite: PendingInvite) {
  const pending = await getPendingInvite();
  if (pending?.inviteType === invite.inviteType && pending.token === invite.token) {
    await clearPendingInvite();
  }
}

export async function applyPendingInvite(receivedInvite?: PendingInvite) {
  // Use this delivery's snapshot so another invite cannot replace its POST payload.
  const invite = receivedInvite ?? (await getPendingInvite());
  if (!invite) return { applied: false, reason: "NO_PENDING_INVITE" };

  const token = normalizeToken(invite.token);

  if (invite.inviteType === "SELLER") {
    const res = await api.post(endpoints.referrals.applyInviteForCurrentUser, {
      linkType: "SELLER_INVITE",
      sellerReferralToken: token,
    });

    if (res.data?.ok && res.data?.applied) {
      await clearAppliedInvite(invite);
    }

    return res.data;
  }

  if (invite.inviteType === "SALON") {
    const res = await api.post(endpoints.referrals.applyInviteForCurrentUser, {
      linkType: "SALON_INVITE",
      salonReferralToken: token,
    });

    if (res.data?.ok && res.data?.applied) {
      await clearAppliedInvite(invite);
    }

    return res.data;
  }

  return { applied: false, reason: "UNKNOWN_INVITE_TYPE" };
}
