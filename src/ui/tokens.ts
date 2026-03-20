// src/ui/tokens.ts
import { Platform } from "react-native";

const SERIF = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: "serif",
});

const SANS = Platform.select({
  ios: "System",
  android: "sans-serif",
  default: "System",
});

export const t = {
  colors: {
    bg: "#F6F7FB",

    surface: "#EEF1F7",
    surface2: "#EEF1F7",
    surface3: "#E3E8F2",

    text: "#0F172A",
    text2: "#475569",
    muted: "#64748B",

    border: "rgba(15, 23, 42, 0.10)",

    primary: "#000000",
    onPrimary: "#FFFFFF",

    danger: "#E11D48",
    warning: "#F59E0B",
    success: "#10B981",
  },

  fonts: {
    serif: SERIF,
    sans: SANS,
  },

  text: {
    // ✅ SERIF (grossinha)
    brand: { fontFamily: SERIF, fontSize: 20, fontWeight: "800", letterSpacing: 0.6 },
    heroTitle: { fontFamily: SERIF, fontSize: 36, fontWeight: "800" },

    // ✅ SANS (mais fina)
    section: { fontFamily: SANS, fontSize: 14, fontWeight: "500" },
    productName: { fontFamily: SANS, fontSize: 12, fontWeight: "500" },

    // (se você já usa em outros lugares, deixa também)
    h1: { fontFamily: SANS, fontSize: 28, fontWeight: "800" },
    h2: { fontFamily: SANS, fontSize: 18, fontWeight: "700" },
    h3: { fontFamily: SANS, fontSize: 16, fontWeight: "600" },
    body: { fontFamily: SANS, fontSize: 14, fontWeight: "500" },
    caption: { fontFamily: SANS, fontSize: 12, fontWeight: "500" },
    muted: { fontFamily: SANS, fontSize: 12, fontWeight: "500", opacity: 0.75 },
  },

  radius: { sm: 10, md: 14, lg: 18, pill: 999 },
  space: { xs: 6, sm: 10, md: 14, lg: 18, xl: 24 },
} as const;
