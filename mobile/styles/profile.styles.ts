import { StyleSheet } from "react-native";
import { cardShadow, colors, radius, spacing } from "./tokens";

export const styles = StyleSheet.create({
    container:{
        flex:1,
        padding: spacing.xl,
        paddingTop:60,
        backgroundColor: colors.background,
    },
    header:{
        flexDirection: "row",
        justifyContent: "space-between",  // titolo a sinistra, logout a destra
        alignItems: "center",
        marginBottom: spacing.xl,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: "700",
        color: colors.text,
    },
    logoutButton:{
        margin:0
    },
    profCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.lg,
        gap: spacing.md,
        ...cardShadow,
    },
    avatarCircle: {
        width: 48,
        height: 48,
        borderRadius: radius.pill,
        backgroundColor: colors.primarySoft,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarInitials: {
        color: colors.primary,
        fontWeight: "bold",
        fontSize: 16,
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontWeight: "bold",
        fontSize: 16,
        color: colors.text,
    },
    profileEmail: {
        color: colors.textMuted,
        fontSize: 13,
    },
    button: {
        borderColor: colors.primary,
        borderRadius: radius.xl,
    },
    //etichetta di sezione: raggruppa le voci senza pesare come un titolo
    sectionLabel: {
        fontSize: 12,
        fontWeight: "700",
        color: colors.textMuted,
        letterSpacing: 0.6,
        marginTop: spacing.xl,
        marginBottom: spacing.sm,
        marginLeft: spacing.xs,
    },
    sectionCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        overflow: "hidden",
        ...cardShadow,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: 15,
    },
    rowLabel: {
        flex: 1,
        fontSize: 15,
        color: colors.text,
    },
    //raggruppa titolo e sottotitolo, così lo switch resta allineato a destra
    rowTextGroup: {
        flex: 1,
    },
    rowHint: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 2,
    },
    //separatore rientrato, allineato al testo e non all'icona
    rowDivider: {
        height: 1,
        backgroundColor: colors.border,
        marginLeft: 48,
    },

    // --- dialoghi ---
    //Paper usa angoli e sfondo propri: li allineiamo alle card dell'app
    dialog: {
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
    },
    dialogTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
    },
    dialogText: {
        lineHeight: 20,
        color: colors.text,
    },
    //l'indirizzo staccato dal testo: si legge e si trascrive piu' facilmente.
    //Blu e non verde: il verde nell'app segnala un'azione, questo e' solo testo
    supportEmail: {
        marginTop: spacing.md,
        fontSize: 16,
        fontWeight: "600",
        color: colors.link,
    },
    deleteWarning: {
        marginBottom: spacing.lg,
        lineHeight: 20,
        color: colors.text,
    },
    deleteError: {
        color: colors.dangerDark,
        marginTop: spacing.sm,
    },

    //azioni di sicurezza in fondo, separate dal resto
    logoutAllButton: {
        marginTop: "auto",
        alignSelf: "center",
    },
    //azione distruttiva: separata dal resto e senza sfondo, per non invitare al tocco
    deleteButton: {
        alignSelf: "center",
    },
})
