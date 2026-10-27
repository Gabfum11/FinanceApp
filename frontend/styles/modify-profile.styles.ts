import { StyleSheet } from "react-native";
import { cardShadow, radius, spacing, type Colori, fontSize, fontWeight } from "./tokens";

export const creaStili = (colors: Colori) =>
  StyleSheet.create({
    container: {
        flex: 1,
    },
    //contenuto di PaginaScorrevole: il margine in alto lo calcola lei dalla barra di stato
    content: {
        padding: spacing.xl,
        paddingBottom: 48,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    headerTitle: {
        flex: 1,
        textAlign: "center",
        fontSize: fontSize.base,
        fontWeight: fontWeight.bold,
        color: colors.text,
    },
    //44px di altezza: il minimo per il dito, anche in un'intestazione
    headerPulsante: {
        minHeight: 44,
        paddingHorizontal: spacing.xs,
    },
    headerEtichetta: {
        fontSize: fontSize.md,
        fontWeight: fontWeight.semibold,
        marginHorizontal: spacing.sm,
    },
    salva: {
        borderRadius: radius.pill,
    },
    anteprima: {
        alignItems: "center",
        marginBottom: spacing.lg,
    },
    formSection: {
        marginBottom: spacing.xl,
    },
    label: {
        fontSize: fontSize.md,
        fontWeight: fontWeight.semibold,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    },
    labelStaccata: {
        marginTop: spacing.lg,
    },
    input: {
        width: "100%",
        backgroundColor: colors.surface,
    },
    inputDisabled: {
        width: "100%",
        backgroundColor: colors.surfaceAlt,
    },
    helper: {
        paddingHorizontal: spacing.xs,
    },
    //13 e non 12: e' l'unica spiegazione del perche' il campo e' bloccato
    helperText: {
        color: colors.textMuted,
        fontSize: fontSize.sm,
        marginTop: 6,
        marginLeft: spacing.xs,
    },
    //stessa etichetta di sezione del profilo
    sectionLabel: {
        fontSize: fontSize.xs,
        fontWeight: fontWeight.bold,
        color: colors.textMuted,
        letterSpacing: 0.6,
        marginBottom: spacing.sm,
        marginLeft: spacing.xs,
    },
    settingsItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        minHeight: 56,
        gap: spacing.md,
        ...cardShadow,
    },
    settingsItemPremuto: {
        backgroundColor: colors.surfaceAlt,
    },
    settingsInfo: {
        flex: 1,
    },
    settingsLabel: {
        fontSize: fontSize.base,
        color: colors.text,
    },
});
