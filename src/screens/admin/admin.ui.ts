import { StyleSheet } from "react-native";
import { t } from "../../ui/tokens";

export const adminS = StyleSheet.create({
    // header
    headerRow: {
        marginTop: 10,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
    },
    hTitle: {
        color: t.colors.text,
        fontWeight: "900",
        fontSize: 20,
        letterSpacing: 0.5,
    },
    hSub: {
        color: t.colors.text2,
        fontWeight: "700",
        marginTop: 4,
    },

    // refresh pill
    refreshPill: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: t.colors.surface,
        borderWidth: 1,
        borderColor: t.colors.border,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 2,
    },
    refreshPillText: {
        color: t.colors.text,
        fontWeight: "900",
        fontSize: 16,
        lineHeight: 16,
    },

    // stats
    statsRow: {
        paddingVertical: 12,
        paddingRight: 6,
        gap: 10,
    },
    statCard: {
        minWidth: 140,
        backgroundColor: t.colors.surface,
        borderWidth: 1,
        borderColor: t.colors.border,
        borderRadius: 16,
        padding: 12,
    },
    statLabel: {
        color: t.colors.text2,
        fontWeight: "700",
        fontSize: 12,
    },
    statValue: {
        color: t.colors.text,
        fontWeight: "900",
        fontSize: 20,
        marginTop: 6,
    },

    // search
    searchWrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: t.colors.surface,
        borderWidth: 1,
        borderColor: t.colors.border,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    searchIcon: {
        color: t.colors.text2,
        fontWeight: "900",
        fontSize: 14,
    },
    searchInput: {
        flex: 1,
        color: t.colors.text,
        fontWeight: "800",
        paddingVertical: 0,
    },

    // section header
    sectionHead: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    sectionTitle: {
        color: t.colors.text,
        fontWeight: "900",
        fontSize: 16,
    },

    // cards text (p/ tab usar tbm)
    cardTitle: {
        color: t.colors.text,
        fontWeight: "900",
        fontSize: 14,
    },
    cardSub: {
        color: t.colors.text2,
        fontWeight: "700",
        marginTop: 6,
    },

    rowWrap: {
        marginTop: 12,
        flexDirection: "row",
        gap: 10,
        flexWrap: "wrap",
    },

    // FAB
    fabWrap: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: 12,
        paddingTop: 8,
        backgroundColor: "transparent",
    },
});
