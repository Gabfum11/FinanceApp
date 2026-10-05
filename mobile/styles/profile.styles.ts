import { StyleSheet } from "react-native";
import { cardShadow, type Colori, radius, spacing } from "./tokens";

export const creaStili = (colors: Colori) =>
  StyleSheet.create({
    container:{
        flex:1,
        backgroundColor: colors.background,
    },
    //contenuto di PaginaScorrevole: il margine in alto lo calcola lei dalla barra di stato
    content:{
        padding: spacing.xl,
        paddingBottom: 48,
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
    //pillola con il bordo, come il pulsante dell'occhio in home: un testo
    //rosso da solo sembrerebbe un avviso, non un comando
    logoutButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        height: 40,
        paddingHorizontal: 14,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    logoutPremuto: {
        opacity: 0.7,
    },
    logoutTesto: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.danger,
    },
    dueColonne: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: spacing.xl,
    },
    colonnaAccount: {
        width: 340,
        gap: spacing.md,
    },
    colonnaImpostazioni: {
        flex: 1,
        minWidth: 0,
    },
    //la prima sezione parte in alto, alla stessa altezza della card dell'account
    primaSezioneLarga: {
        marginTop: 0,
    },
    //sul computer la card dell'account e' una colonna: nome sotto l'iniziale
    profCardLarga: {
        flexDirection: "column",
        alignItems: "center",
        paddingVertical: spacing.xl,
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
    //dentro rowTextGroup il testo e' in colonna: qui flex:1 lo farebbe
    //espandere in altezza e ne taglierebbe il contenuto, al contrario di
    //quanto fa nelle righe dove l'etichetta e' figlia diretta della riga
    rowLabelInGroup: {
        fontSize: 15,
        color: colors.text,
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
    //nota sotto le scelte: secondaria, come gli altri suggerimenti dell'app
    dialogNota: {
        marginTop: spacing.md,
        fontSize: 13,
        lineHeight: 18,
        color: colors.textMuted,
    },
    //le voci con il pallino allineate al titolo: Paper aggiunge un rientro suo
    opzione: {
        paddingHorizontal: 0,
    },
    opzioneTesto: {
        fontSize: 15,
        color: colors.text,
    },
    //la spiegazione sotto una scelta, nella finestra del cambio valuta
    opzioneNota: {
        fontSize: 13,
        lineHeight: 18,
        color: colors.textMuted,
    },
    opzioneNotaStaccata: {
        marginBottom: spacing.sm,
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
