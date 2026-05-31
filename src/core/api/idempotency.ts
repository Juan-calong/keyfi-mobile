function randomFallbackId() {
  const now = Date.now().toString(36);
  const randA = Math.random().toString(36).slice(2, 10);
  const randB = Math.random().toString(36).slice(2, 10);
  return `${now}-${randA}-${randB}`;
}

export function createIdempotencyKey(scope: string) {
  const cleanScope = String(scope ?? "").trim().replace(/\s+/g, "-") || "request";
  const cryptoApi = (globalThis as any)?.crypto;
  const uuid =
    typeof cryptoApi?.randomUUID === "function" ? cryptoApi.randomUUID() : randomFallbackId();

  return `${cleanScope}-${uuid}`;
}
