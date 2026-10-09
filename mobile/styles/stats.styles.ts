import { StyleSheet } from "react-native";
import { cardShadow, radius, type Colori, fontSize, fontWeight } from "./tokens";

export const creaStili = (colors: Colori) =>
  StyleSheet.create({
    container: {
        flex: 1,
    },
    //contenuto di PaginaScorrevole: il margine in alto lo calcola lei dalla barra di stato
    content: {
        padding: 24,
        paddingBottom: 48,
    },
    title: {
        fontWeight: fontWeight.bold,
        fontSize: fontSize.xxxl,
        marginBottom: 16,
    },
    //frecce ai lati e date al centro, tutte sulla stessa linea
    selectorRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    periodo: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.bold,
        color: colors.text,
        fontVariant: ["tabular-nums"],
    },
    freccia: {
        width: 44,
        height: 44,
        borderRadius: radius.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    frecciaSpenta: {
        backgroundColor: "transparent",
        borderColor: "transparent",
    },
    //riscontro al tocco, uguale per frecce, matita e pillole
    premuto: {
        opacity: 0.7,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 20,
        gap: 12,
        ...cardShadow,
    },
    //ciambella e legenda: affiancate, o una sopra l'altra su schermo stretto
    cardCorpo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    //interruttore € / %: in alto a destra, non sposta il resto della card
    cifreRiga: {
        flexDirection: "row",
        justifyContent: "flex-end",
    },
    cifre: {
        flexDirection: "row",
        padding: 3,
        borderRadius: 999,
        backgroundColor: colors.surfaceAlt,
    },
    cifraVoce: {
        minWidth: 48,
        height: 36,
        paddingHorizontal: 12,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
    },
    //la voce scelta in rilievo sulla guida grigia, come i controlli segmentati
    //di iOS; il testo verde scuro la distingue anche nel tema scuro
    cifraScelta: {
        backgroundColor: colors.surface,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 3,
        elevation: 2,
    },
    cifraTesto: {
        fontSize: fontSize.md,
        fontWeight: fontWeight.bold,
        color: colors.textMuted,
    },
    cifraTestoScelto: {
        color: colors.primaryDark,
    },
    //sul computer: card a sinistra, budget e resto in una colonna a destra
    rigaLarga: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 20,
    },
    cardLarga: {
        flex: 3,
        minWidth: 0,
        padding: 28,
    },
    colonnaLaterale: {
        flex: 1,
        minWidth: 240,
        gap: 20,
    },
    senzaMargine: {
        marginTop: 0,
    },
    intestazioneColonna: {
        fontSize: fontSize.xs,
        fontWeight: fontWeight.bold,
        letterSpacing: 0.4,
        color: colors.textMuted,
        textTransform: "uppercase",
    },
    colonnaImporto: {
        width: 100,
        textAlign: "right",
    },
    colonnaPercentuale: {
        width: 48,
        textAlign: "right",
        color: colors.textMuted,
        fontVariant: ["tabular-nums"],
    },
    riquadroResto: {
        padding: 20,
        gap: 8,
        borderRadius: 16,
        backgroundColor: colors.surface,
        ...cardShadow,
    },
    restoValore: {
        fontSize: fontSize.xxxl,
        fontWeight: fontWeight.bold,
        color: colors.primaryDark,
        fontVariant: ["tabular-nums"],
    },
    restoTesto: {
        fontSize: fontSize.md,
        color: colors.textSecondary,
    },
    //il budget del periodo mostrato, con la matita per cambiarlo
    budgetRiga: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginTop: 16,
        paddingVertical: 8,
        paddingLeft: 16,
        paddingRight: 8,
        borderRadius: 16,
        backgroundColor: colors.surface,
        ...cardShadow,
    },
    //matita piena su verde tenue, come la pillola "Modifica" del profilo
    matita: {
        width: 44,
        height: 44,
        borderRadius: radius.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.primarySoft,
    },
    budgetTesti: {
        flex: 1,
    },
    budgetEtichetta: {
        fontSize: fontSize.sm,
        color: colors.textMuted,
    },
    budgetValore: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.bold,
        color: colors.text,
        fontVariant: ["tabular-nums"],
    },
    //stesso raggio di ConfirmDialog: quello di Paper, con il nostro roundness, e' troppo tondo
    dialogPeriodo: {
        color: colors.textMuted,
        marginTop: -8,
        marginBottom: 12,
    },
    dialogSpiegazione: {
        marginTop: 12,
        color: colors.textSecondary,
        lineHeight: 19,
    },
    dialogErrore: {
        marginTop: 8,
        color: colors.danger,
    },
    //schermo stretto: ciambella sopra e legenda sotto, a tutta larghezza
    cardColonna: {
        flexDirection: "column",
        alignItems: "stretch",
        gap: 20,
    },
    ciambella: {
        alignSelf: "center",
    },
    //in colonna flex: 1 la schiaccerebbe a zero: prende l'altezza del suo contenuto
    legendaColonna: {
        flex: 0,
    },
    legendContainer: {
        flex: 1,
    },
    //44px: righe comode da leggere e allineate, con l'icona della categoria
    legendRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        minHeight: 44,
        paddingVertical: 4,
    },
    legendRowSeparata: {
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    legendLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        flex: 1,
        minWidth: 0, // permette al contenitore di ridursi se necessario
    },
    legendLabel: {
        fontSize: fontSize.md,
        color: colors.text,
        flexShrink: 1, // permette di ridurre la dimensione del testo se necessario
    },
    //staccato dal nome: con un nome lungo i due non si attaccano piu'
    legendPercentage: {
        fontWeight: fontWeight.bold,
        fontSize: fontSize.md,
        color: colors.text,
        marginLeft: 12,
        fontVariant: ["tabular-nums"],
    },
    //quello che resta del budget: grigio, non e' una spesa
    legendaResto: {
        color: colors.textMuted,
    },
    //largo come le icone delle categorie, cosi' i nomi restano allineati
    legendaAnello: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 7,
    },
    //colore del tema e non opacita': sul fondo scuro il 60% di bianco non bastava
    totalLabel: {
        color: colors.textMuted,
        fontSize: fontSize.sm,
    },
    totalAmount: {
        fontWeight: fontWeight.bold,
        fontSize: fontSize.xl,
        color: colors.text,
        fontVariant: ["tabular-nums"],
    },
    //stesso riquadro vuoto della home e della scheda Abbonamenti
    emptyState: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 24,
        paddingHorizontal: 12,
        gap: 6,
    },
    emptyIcona: {
        width: 56,
        height: 56,
        borderRadius: radius.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.primarySoft,
    },
    //verde pieno con testo scuro, come le conferme delle finestre
    aggiungi: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        minHeight: 44,
        marginTop: 10,
        paddingHorizontal: 18,
        borderRadius: radius.pill,
        backgroundColor: colors.primary,
    },
    aggiungiTesto: {
        fontSize: fontSize.md,
        fontWeight: fontWeight.semibold,
        color: colors.surfaceDark,
    },
    emptyTitle: {
        fontWeight: fontWeight.semibold,
        color: colors.textSecondary,
        marginTop: 4,
        textAlign: "center",
    },
    emptyHint: {
        textAlign: "center",
        color: colors.textMuted,
        fontSize: fontSize.sm,
        lineHeight: 18,
    },
    budgetHint: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "center",
        gap: 8,
        minHeight: 44,
        marginTop: 16,
        paddingHorizontal: 18,
        borderRadius: radius.pill,
        backgroundColor: colors.primarySoft,
    },
    budgetHintTesto: {
        fontSize: fontSize.md,
        fontWeight: fontWeight.semibold,
        color: colors.primaryDark,
    },
});
