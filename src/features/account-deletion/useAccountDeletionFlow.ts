import { useCallback, useEffect, useRef, useState } from "react";
import { createIdempotencyKey } from "../../core/api/idempotency";
import {
  confirmAccountDeletionReauthentication,
  requestAccountDeletion,
  requestAccountDeletionReauthentication,
} from "../../core/api/services/accountDeletion.service";
import { useAuthStore } from "../../stores/auth.store";
import { blockerMessage } from "./accountDeletion.messages";
import type {
  AccountDeletionNotice,
  AccountDeletionPhase,
  AccountDeletionRole,
} from "./accountDeletion.types";

function errorStatus(error: any) {
  return Number(error?.response?.status);
}

function errorCode(error: any) {
  return String(error?.response?.data?.code ?? "").trim().toUpperCase();
}

function isUncertainNetworkError(error: any) {
  return !error?.response || error?.code === "ECONNABORTED";
}

export function useAccountDeletionFlow(role: AccountDeletionRole) {
  const [phase, setPhase] = useState<AccountDeletionPhase>("IDLE");
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState<AccountDeletionNotice | null>(null);
  const proofRef = useRef<string | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const submittingRef = useRef(false);
  const logoutScheduledRef = useRef(false);

  const clearSensitiveValues = useCallback(() => {
    proofRef.current = null;
    idempotencyKeyRef.current = null;
    submittingRef.current = false;
    setCode("");
  }, []);

  useEffect(() => clearSensitiveValues, [clearSensitiveValues]);

  const close = useCallback(() => {
    if (submittingRef.current) return;
    clearSensitiveValues();
    setNotice(null);
    setPhase("IDLE");
  }, [clearSensitiveValues]);

  const logoutForExpiredSession = useCallback(async () => {
    clearSensitiveValues();
    setNotice({ title: "Sessão expirada", message: "Sua sessão expirou. Entre novamente para continuar." });
    await useAuthStore.getState().logout();
  }, [clearSensitiveValues]);

  const scheduleLogoutAfterAcceptedDeletion = useCallback(() => {
    if (logoutScheduledRef.current) return;
    logoutScheduledRef.current = true;
    setTimeout(() => {
      useAuthStore.getState().logout().catch(() => {
        // A limpeza local já é tratada pelo logout canônico; não há UI para esta falha tardia.
      });
    }, 1200);
  }, []);

  const requestCode = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setNotice(null);
    setPhase("REQUESTING_CODE");
    try {
      await requestAccountDeletionReauthentication();
      setCode("");
      setPhase("CODE_ENTRY");
    } catch (error: any) {
      if (errorStatus(error) === 401) {
        await logoutForExpiredSession();
        return;
      }
      setNotice({ title: "Erro", message: "Não foi possível enviar o código. Tente novamente." });
      setPhase("ERROR");
    } finally {
      submittingRef.current = false;
    }
  }, [logoutForExpiredSession]);

  const begin = useCallback(() => setPhase("CONFIRMING"), []);

  const confirmCode = useCallback(async () => {
    if (code.length !== 6 || submittingRef.current) return;
    submittingRef.current = true;
    setNotice(null);
    setPhase("CONFIRMING_CODE");
    try {
      const result = await confirmAccountDeletionReauthentication(code);
      proofRef.current = result.reauthenticationProof;
      setPhase("READY_TO_DELETE");
    } catch (error: any) {
      if (errorStatus(error) === 401) {
        await logoutForExpiredSession();
        return;
      }
      const codeValue = errorCode(error);
      const locked = codeValue === "REAUTHENTICATION_LOCKED";
      setNotice({
        title: locked ? "Muitas tentativas" : "Código inválido",
        message: locked
          ? "Muitas tentativas. Solicite um novo código."
          : "Código inválido ou expirado. Solicite um novo código.",
      });
      if (locked) setCode("");
      setPhase("CODE_ENTRY");
    } finally {
      submittingRef.current = false;
    }
  }, [code, logoutForExpiredSession]);

  const deleteAccount = useCallback(async () => {
    const proof = proofRef.current;
    if (!proof || submittingRef.current) return;

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = createIdempotencyKey("account-deletion");
    }

    submittingRef.current = true;
    setNotice(null);
    setPhase("DELETING");
    try {
      const result = await requestAccountDeletion(proof, idempotencyKeyRef.current);
      const message =
        result.status === "BLOCKED"
          ? `Sua solicitação foi registrada, mas existem pendências que precisam ser concluídas antes da exclusão definitiva.${result.blocker ? ` ${blockerMessage(result.blocker)}` : ""}`
          : "Sua solicitação de exclusão foi recebida. Sua sessão será encerrada.";
      clearSensitiveValues();
      setNotice({ title: "Solicitação registrada", message });
      setPhase("SUCCESS");
      scheduleLogoutAfterAcceptedDeletion();
    } catch (error: any) {
      const status = errorStatus(error);
      const codeValue = errorCode(error);
      if (codeValue === "INVALID_REAUTHENTICATION_PROOF") {
        clearSensitiveValues();
        setNotice({ title: "Confirmação expirada", message: "A confirmação expirou ou não é mais válida. Solicite um novo código." });
        setPhase("CODE_ENTRY");
      } else if (codeValue === "ACCOUNT_DELETION_ALREADY_REQUESTED") {
        clearSensitiveValues();
        setNotice({ title: "Solicitação já registrada", message: "A solicitação de exclusão já foi iniciada. Sua sessão será encerrada." });
        setPhase("SUCCESS");
        scheduleLogoutAfterAcceptedDeletion();
      } else if (status === 409 && codeValue === "ACCOUNT_DELETION_ACTION_REQUIRED") {
        setNotice({
          title: "Pendências na conta",
          message: blockerMessage(error?.response?.data?.blocker),
          actionRequired: true,
        });
        setPhase("READY_TO_DELETE");
      } else if (isUncertainNetworkError(error)) {
        setNotice({ title: "Resposta não confirmada", message: "Não foi possível confirmar a resposta do servidor.", retryDelete: true });
        setPhase("ERROR");
      } else {
        setNotice({ title: "Erro", message: "Não foi possível solicitar a exclusão agora. Tente novamente." });
        setPhase("READY_TO_DELETE");
      }
    } finally {
      submittingRef.current = false;
    }
  }, [clearSensitiveValues, scheduleLogoutAfterAcceptedDeletion]);

  return {
    role,
    phase,
    code,
    notice,
    begin,
    close,
    requestCode,
    confirmCode,
    deleteAccount,
    setCode: (value: string) => setCode(value.replace(/\D+/g, "").slice(0, 6)),
  };
}
