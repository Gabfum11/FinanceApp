import { StyleSheet } from "react-native";
import { cardShadow, type Colori, radius, spacing } from "./tokens";

/** Colori dei cerchi delle voci: fissi nei due temi, come quelli delle
 *  categorie, da cui vengono. Uno per argomento, non uno per voce: le due
 *  esportazioni condividono il loro. */
export const COLORI_RIGHE = {
    promemoria: "#F5C518",
    valuta: "#2ECC71",
    lingua: "#3478E0",
    tema: "#5B5BD6",
    esporta: "#1ABC9C",
    tutorial: "#E67E22",
    supporto: "#9B59B6",
    neutro: "#6B7280",
    pericolo: "#C0392B",
} as const;

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
        minHeight: 44,
        paddingHorizontal: 14,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    logoutPremuto: {
        opacity: 0.7,
    },
    //rosso scuro: il rosso pieno su bianco arrivava a 3,8:1, sotto il minimo per il testo
    logoutTesto: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.dangerDark,
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
    profCardPremuta: {
        backgroundColor: colors.surfaceAlt,
    },
    profileInfoLarga: {
        flex: 0,
        alignSelf: "stretch",
    },
    testoCentrato: {
        textAlign: "center",
    },
    //"Modifica" come pillola verde tenue con la matita: prima era un pulsante
    //con il testo verde chiaro su bianco (2:1), che si leggeva a fatica
    modificaPillola: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        minHeight: 36,
        paddingHorizontal: 14,
        borderRadius: radius.pill,
        backgroundColor: colors.primarySoft,
    },
    modificaTesto: {
        fontSize: 14,
        fontWeight: "600",
        color: colors.primaryDark,
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
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontWeight: "700",
        fontSize: 18,
        color: colors.text,
    },
    profileEmail: {
        color: colors.textMuted,
        fontSize: 14,
        marginTop: 2,
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
        paddingVertical: 12,
        minHeight: 56,
    },
    rowPremuta: {
        backgroundColor: colors.surfaceAlt,
    },
    rowLabelDistruttiva: {
        color: colors.dangerDark,
        fontWeight: "600",
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
        fontSize: 13,
        color: colors.textMuted,
        marginTop: 2,
    },
    //separatore rientrato, allineato al testo e non all'icona
    rowDivider: {
        height: 1,
        backgroundColor: colors.border,
        marginLeft: spacing.lg + 32 + spacing.md, //rientro: cerchio piu' spazio
    },

    // --- dialoghi ---
    //finestra, titolo e testo: creaStiliFinestra in components/Dialogo
    //nota sotto le scelte: secondaria, come gli altri suggerimenti dell'app
    dialogNota: {
        marginTop: spacing.md,
        marginHorizontal: spacing.md,
        fontSize: 13,
        lineHeight: 18,
        color: colors.textMuted,
    },
    //elenco di scelte: le voci sporgono quanto il loro rientro, cosi' il testo
    //resta allineato al titolo mentre lo sfondo della voce scelta respira
    dialogScelte: {
        marginHorizontal: -spacing.md,
    },
    opzione: {
        paddingHorizontal: spacing.md,
        minHeight: 48,
        borderRadius: radius.md,
    },
    //la voce attiva si vede anche senza guardare il pallino
    opzioneScelta: {
        backgroundColor: colors.primarySoft,
    },
    opzioneTesto: {
        fontSize: 15,
        color: colors.text,
    },
    opzioneTestoScelto: {
        fontWeight: "600",
    },
    //cambio valuta: ogni scelta e' un riquadro con la sua spiegazione dentro
    sceltaRiquadro: {
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: radius.lg,
        paddingBottom: spacing.md,
        marginHorizontal: spacing.md,
        marginBottom: spacing.sm,
    },
    sceltaRiquadroScelto: {
        borderColor: colors.primary,
        backgroundColor: colors.primarySoft,
    },
    opzioneInRiquadro: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
    },
    //la spiegazione sotto una scelta, nella finestra del cambio valuta
    opzioneNota: {
        fontSize: 13,
        lineHeight: 18,
        color: colors.textSecondary,
        paddingHorizontal: spacing.lg,
    },
    //l'indirizzo staccato dal testo: si legge e si trascrive piu' facilmente.
    //Blu e non verde: il verde nell'app segnala un'azione, questo e' solo testo
    supportEmail: {
        marginTop: spacing.md,
        fontSize: 16,
        fontWeight: "600",
        color: colors.link,
        textAlign: "center",
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
    //sul computer la sezione account sta sotto la card, non in fondo alla pagina
    sezioneAccountLarga: {
        marginTop: spacing.md,
    },
})
