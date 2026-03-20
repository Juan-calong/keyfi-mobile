// core/errors/friendlyError.ts
type Friendly = { title: string; message: string };

function pickStatus(e: any): number | undefined {
  return e?.response?.status ?? e?.status;
}

function pickCode(e: any): string | undefined {
  return e?.response?.data?.code ?? e?.code;
}

function data(e: any) {
  return e?.response?.data;
}

function pickMsg(e: any): string | undefined {
  const d = data(e);
  return d?.message || d?.error || e?.message;
}

function formatWait(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r}s`;
  if (r === 0) return `${m} min`;
  return `${m} min ${r}s`;
}

export function friendlyError(e: any): Friendly {
  const status = pickStatus(e);
  const code = String(pickCode(e) ?? "").toUpperCase();
  const d = data(e);
  const raw = String(pickMsg(e) ?? "").trim();

  // rede
  if (e?.message === "Network Error" || /network|timeout|failed to fetch/i.test(raw)) {
    return { title: "Sem conexão", message: "Verifique sua internet e tente novamente." };
  }

  // codes (se existir)
  switch (code) {
    case "INVALID_CREDENTIALS":
      return { title: "Login inválido", message: "Email ou senha incorretos." };
  }

  // 429 do seu backend (vem sem code)
  if (status === 429) {
    const retry = Number(d?.retryAfterSec);
    if (Number.isFinite(retry) && retry > 0) {
      return {
        title: "Aguarde um pouco",
        message: `Muitas tentativas. Tente novamente em ${formatWait(retry)}.`,
      };
    }
    return {
      title: "Aguarde um pouco",
      message: "Muitas tentativas. Tente novamente mais tarde.",
    };
  }

  // fallback por status
  if (status === 401 || status === 403) {
    return { title: "Login inválido", message: "Email ou senha incorretos." };
  }
  if (status && status >= 500) {
    return { title: "Instabilidade", message: "Tente novamente em instantes." };
  }

  // fallback final
  if (!raw) return { title: "Algo deu errado", message: "Tente novamente." };

  const looksTechnical = /prisma|sql|stack|trace|ecconn|axios|exception/i.test(raw);
  if (looksTechnical) return { title: "Algo deu errado", message: "Tente novamente em instantes." };

  return { title: "Não foi possível", message: raw };
}