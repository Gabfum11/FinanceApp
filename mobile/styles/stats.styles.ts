import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        paddingTop: 60,
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
        backgroundColor: "white",
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
});
