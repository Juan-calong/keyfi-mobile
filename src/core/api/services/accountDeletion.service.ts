import { api } from "../client";
import { endpoints } from "../endpoints";

export type AccountDeletionStatus = "REQUESTED" | "BLOCKED";

export type AccountDeletionResponse = {
  ok: true;
  status: AccountDeletionStatus;
  blocker?: string;
};

export type AccountDeletionReauthenticationConfirmResponse = {
  ok: true;
  reauthenticationProof: string;
  expiresAt: string;
};

export async function requestAccountDeletionReauthentication(): Promise<{ ok: true }> {
  const response = await api.post<{ ok: true }>(
    endpoints.auth.accountDeletionReauthenticationRequest
  );
  return response.data;
}

export async function confirmAccountDeletionReauthentication(
  code: string
): Promise<AccountDeletionReauthenticationConfirmResponse> {
  const response = await api.post<AccountDeletionReauthenticationConfirmResponse>(
    endpoints.auth.accountDeletionReauthenticationConfirm,
    { code }
  );
  return response.data;
}

export async function requestAccountDeletion(
  reauthenticationProof: string,
  idempotencyKey: string
): Promise<AccountDeletionResponse> {
  const response = await api.delete<AccountDeletionResponse>(endpoints.profiles.account, {
    data: { reauthenticationProof },
    headers: { "Idempotency-Key": idempotencyKey },
  });
  return response.data;
}
