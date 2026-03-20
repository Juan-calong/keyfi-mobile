// src/ui/theme.ts
export const theme = {
    colors: {
        bg: "#0B0F1A",
        surface: "#11182A",
        surface2: "#0F1524",
        text: "#EAF0FF",
        text2: "#AAB6D3",
        muted: "#7F8BA7",
        border: "rgba(255,255,255,0.08)",
        primary: "#6C7CFF",
        primary2: "#4F5DFF",
        danger: "#FF5C7A",
        warning: "#FFB020",
        success: "#3CE6B1",
    },
    radius: {
        sm: 12,
        md: 16,
        lg: 22,
    },
    spacing: (n: number) => n * 8,
    shadow: {
        card: {
            shadowColor: "#000",
            shadowOpacity: 0.35,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 10,
        },
    },
    text: {
        h1: { fontSize: 22, fontWeight: "800" as const },
        h2: { fontSize: 16, fontWeight: "700" as const },
        body: { fontSize: 14, fontWeight: "500" as const },
        small: { fontSize: 12, fontWeight: "600" as const },
    },
};
