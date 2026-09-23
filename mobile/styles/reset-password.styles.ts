import { StyleSheet } from "react-native";
import { colors } from "./tokens";

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        paddingTop: 100,
        padding: 24,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 16,
        backgroundColor: colors.infoSoft,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    successIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: colors.primary,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    erroriconContainer: {
        width: 64,
        height: 64,
        borderRadius: 16,
        backgroundColor: colors.dangerSoft,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    title: {
        textAlign: "center",
        marginBottom: 8,
    },
    subtitle: {
        textAlign: "center",
        opacity: 0.6,
        marginBottom: 24,
    },
    input: {
        width: "100%",
        marginBottom: 16,
    },
    inputOutline: {
        borderRadius: 14,
    },
    codeRow: {
        flexDirection: "row",
        gap: 8,
        marginBottom: 24,
    },
    codeBox: {
        width: 45,
        height: 55,
        borderWidth: 1,
        borderColor: colors.chevron,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.surface,
    },
    codeBoxActive: {
        borderColor: colors.primary,
        borderWidth: 2,
    },
    codeDigit: {
        fontSize: 22,
        fontWeight: "700",
    },
    hiddenInput: {
        position: "absolute",
        opacity: 0,
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
    },
    button: {
        width: "100%",
        marginTop: 8,
    },
    buttonLabel: {
        fontSize: 18,
        fontWeight: "bold",
    },
    resendCodeText: {
        color: colors.primary,
        fontWeight: "bold",
    },
    remainingTime: {
        opacity: 0.6,
    },
});
