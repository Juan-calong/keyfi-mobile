import type { AccountDeletionRole } from "./accountDeletion.types";

export function roleDeletionDescription(role: AccountDeletionRole) {
  if (role === "SALON_OWNER") {
    return "Sua conta de acesso será excluída e o salão ficará indisponível. Pendências financeiras podem precisar ser concluídas antes.";
  }
  if (role === "SELLER") {
    return "Sua conta de vendedor será excluída. Pagamentos e outras pendências podem precisar ser concluídos antes.";
  }
  return "Sua conta pessoal será excluída.";
}

export function blockerMessage(blocker?: string) {
  const messages: Record<string, string> = {
    PENDING_PAYOUT: "Há um pagamento pendente de conclusão.",
    BALANCE_PENDING: "Há saldo ou uma pendência de pagamento que precisa ser resolvida.",
    PAYMENT_IN_PROGRESS: "Há um pagamento em andamento.",
    REFUND_PENDING: "Há um reembolso pendente.",
    COMMERCIAL_OBLIGATION: "Há uma obrigação comercial pendente.",
    SALON_NO_RESPONSIBLE: "O salão precisa de um responsável antes da exclusão.",
    FISCAL_OR_LOGISTICS_PROCESSING: "Há um processo fiscal ou logístico em andamento.",
  };
  return (
    messages[String(blocker ?? "").trim().toUpperCase()] ??
    "Existem pendências na conta que precisam ser resolvidas antes de solicitar a exclusão."
  );
}
