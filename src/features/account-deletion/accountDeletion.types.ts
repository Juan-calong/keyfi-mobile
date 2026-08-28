export type AccountDeletionRole = "CUSTOMER" | "SELLER" | "SALON_OWNER";

export type AccountDeletionPhase =
  | "IDLE"
  | "CONFIRMING"
  | "REQUESTING_CODE"
  | "CODE_ENTRY"
  | "CONFIRMING_CODE"
  | "READY_TO_DELETE"
  | "DELETING"
  | "SUCCESS"
  | "ERROR";

export type AccountDeletionNotice = {
  title: string;
  message: string;
  retryDelete?: boolean;
  actionRequired?: boolean;
};
