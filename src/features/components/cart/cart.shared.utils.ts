import { StyleSheet } from "react-native";

export const HAIRLINE = StyleSheet.hairlineWidth;

export function toNumberBR(v: string | number | null | undefined) {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function formatBRL(value: number) {
  if (!Number.isFinite(value)) return "R$ —";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}