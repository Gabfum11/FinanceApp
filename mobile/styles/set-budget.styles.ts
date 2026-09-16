import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 100,
        padding: 24,
    },
    title: {
        marginBottom: 8,
    },
    subtitle: {
        opacity: 0.6,
        marginBottom: 24,
    },
    label: {
        fontWeight: "bold",
        marginBottom: 8,
    },
    input: {
        width: "100%",
        marginBottom: 20,
    },
    inputOutline: {
        borderRadius: 14,
    },
    helperText: {
        opacity: 0.6,
        fontSize: 12,
        marginTop: -14,
        marginBottom: 20,
    },
    button: {
        width: "100%",
        marginTop: 8,
    },
    buttonLabel: {
        fontSize: 18,
        fontWeight: "bold",
    },
});
