import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        paddingTop: 60,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
    },
    headerAction: {
        color: "#999",
    },
    headerActionPrimary: {
        color: "#2ECC71",
        fontWeight: "bold",
    },
    formSection: {
        marginBottom: 24,
    },
    label: {
        fontWeight: "bold",
        marginBottom: 8,
        marginTop: 12,
    },
    input: {
        width: "100%",
    },
    inputDisabled: {
        width: "100%",
        backgroundColor: "#F0F0F0",
    },
    helperText: {
        color: "#999",
        fontSize: 12,
        marginTop: 4,
    },
    settingsItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "white",
        borderRadius: 16,
        padding: 14,
        gap: 12,
    },
    settingsInfo: {
        flex: 1,
    },
    settingsLabel: {
        fontWeight: "bold",
        fontSize: 15,
    },
});
