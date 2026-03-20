// src/core/api/apiResult.ts
export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = {
  ok: false;
  code: string;
  message: string;      // mensagem "amigável" (já mapeada)
  error?: string;       // mensagem bruta do backend (se quiser)
  details?: any;        // { fields?: Record<string,string>, ... }
  status?: number;      // HTTP status (quando existir)
  raw?: any;            // payload original (debug)
};

export type ApiResult<T> = ApiOk<T> | ApiErr;

export function isApiErr<T>(r: ApiResult<T>): r is ApiErr {
  return r.ok === false;
}

export function isValidationErr(e: ApiErr) {
  return e.code === "VALIDATION_ERROR" && e.status === 422;
}

export function fieldErrorsFrom(e: ApiErr): Record<string, string> {
  const fields = e?.details?.fields;
  return fields && typeof fields === "object" ? fields : {};
}