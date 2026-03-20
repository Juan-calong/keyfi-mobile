import { useEffect, useRef, useState } from "react";
import { friendlyError } from "../../core/errors/friendlyError";

export function useFriendlyAlert() {
  const [alert, setAlert] = useState<{ title: string; message: string } | null>(null);

  // anti double-submit
  const submittingRef = useRef(false);

  // cooldown 429
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const inCooldown = cooldownUntil > now;

  function secondsLeft() {
    const ms = cooldownUntil - now;
    return Math.max(0, Math.ceil(ms / 1000));
  }

  function formatLeft(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m <= 0) return `${s}s`;
    return s === 0 ? `${m} min` : `${m}m ${s}s`;
  }

  function showModal(title: string, message: string) {
    setAlert({ title, message });
  }

  function closeModal() {
    setAlert(null);
  }

  function handleCooldownFromError(e: any) {
    const retry = Number(e?.response?.data?.retryAfterSec);
    if (Number.isFinite(retry) && retry > 0) {
      setCooldownUntil(Date.now() + retry * 1000);
    }
  }

  function showError(e: any) {
    handleCooldownFromError(e);

    const retry = Number(e?.response?.data?.retryAfterSec);
    if (e?.response?.status === 429 && Number.isFinite(retry) && retry > 0) {
      showModal("Aguarde um pouco", `Muitas tentativas. Tente novamente em ${formatLeft(Math.ceil(retry))}.`);
      return;
    }

    const fe = friendlyError(e);
    showModal(fe.title, fe.message);
  }

  // helper pra envolver qualquer submit
  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    if (submittingRef.current) return;
    if (inCooldown) {
      showModal("Aguarde um pouco", `Tente novamente em ${formatLeft(secondsLeft())}.`);
      return;
    }

    submittingRef.current = true;
    try {
      return await fn();
    } catch (e: any) {
      showError(e);
      return;
    } finally {
      submittingRef.current = false;
    }
  }

  return {
    alert,
    showModal,
    closeModal,

    inCooldown,
    secondsLeft,
    formatLeft,

    showError,
    run,
  };
}