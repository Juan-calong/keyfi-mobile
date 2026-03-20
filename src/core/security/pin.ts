import { sha256 } from "js-sha256";

export function normalizePin(pin: string) {
  return String(pin || "").replace(/\D/g, "");
}

export function isValidPin(pin: string) {
  return /^\d{6}$/.test(normalizePin(pin));
}

export function generatePinSalt() {
  return [
    Date.now().toString(36),
    Math.random().toString(36).slice(2),
    Math.random().toString(36).slice(2),
  ].join("_");
}

export function hashPin(pin: string, salt: string) {
  const normalized = normalizePin(pin);
  return sha256(`${salt}:${normalized}`);
}

export function verifyPin(pin: string, salt: string, expectedHash: string) {
  return hashPin(pin, salt) === expectedHash;
}