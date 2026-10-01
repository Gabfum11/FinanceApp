import { StyleSheet } from "react-native";
import { colors } from "./tokens";

export const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    //contenuto di PaginaScorrevole: il margine in alto lo calcola lei dalla barra di stato
    content: {
        padding: 24,
        paddingBottom: 48,
    },
    title: {
        fontWeight: "bold",
        fontSize: 26,
        marginBottom: 16,
    },
    selectorRow: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 16,
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 20,
        gap: 16,
    },
    legendContainer: {
        flex: 1,
        gap: 10,
    },
    legendRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    legendLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        flex: 1,
        minWidth: 0, // permette al contenitore di ridursi se necessario
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendLabel: {
        fontSize: 14,
        flexShrink: 1, // permette di ridurre la dimensione del testo se necessario
    },
    legendPercentage: {
        fontWeight: "bold",
        fontSize: 14,
    },
    totalLabel: {
        opacity: 0.6,
        fontSize: 12,
    },
    totalAmount: {
        fontWeight: "bold",
        fontSize: 18,
    },
    //stesso riquadro vuoto della home e della scheda Abbonamenti
    emptyState: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 28,
        paddingHorizontal: 12,
        gap: 6,
    },
    emptyTitle: {
        fontWeight: "600",
        color: colors.textSecondary,
        marginTop: 4,
        textAlign: "center",
    },
    emptyHint: {
        textAlign: "center",
        color: colors.textMuted,
        fontSize: 13,
        lineHeight: 18,
    },
    budgetHint: {
        marginTop: 16,
        textAlign: "center",
        color: colors.primary,
        fontWeight: "bold",
    },
});
