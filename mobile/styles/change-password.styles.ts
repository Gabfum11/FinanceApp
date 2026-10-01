import { StyleSheet } from "react-native";

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
        marginBottom: 8,
    },
    subtitle: {
        opacity: 0.6,
        marginBottom: 24,
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
    inputOutline: {
        borderRadius: 14,
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
