import { StyleSheet } from "react-native";
import { radius, type Colori } from "./tokens";

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
        fontWeight: "bold",
        fontSize: 26,
        marginBottom: 16,
    },
    //frecce ai lati e date al centro, tutte sulla stessa linea
    selectorRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 20,
        gap: 12,
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
        minWidth: 44,
        height: 30,
        paddingHorizontal: 12,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
    },
    //come la pillola della scheda attiva: si vede anche nel tema scuro, dove
    //due grigi vicini si confonderebbero
    cifraScelta: {
        backgroundColor: colors.primarySoft,
    },
    cifraTesto: {
        fontSize: 13,
        fontWeight: "bold",
        color: colors.textMuted,
    },
    cifraTestoScelto: {
        color: colors.primaryDark,
    },
    //il budget del periodo mostrato, con la matita per cambiarlo
    budgetRiga: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginTop: 16,
        paddingVertical: 4,
        paddingLeft: 16,
        paddingRight: 4,
        borderRadius: 16,
        backgroundColor: colors.surface,
    },
    budgetTesti: {
        flex: 1,
    },
    budgetEtichetta: {
        fontSize: 13,
        color: colors.textMuted,
    },
    budgetValore: {
        fontSize: 16,
        fontWeight: "bold",
    },
    //stesso raggio di ConfirmDialog: quello di Paper, con il nostro roundness, e' troppo tondo
    dialog: {
        backgroundColor: colors.surface,
        borderRadius: radius.xl,
    },
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
    //staccato dal nome: con un nome lungo i due non si attaccano piu'
    legendPercentage: {
        fontWeight: "bold",
        fontSize: 14,
        marginLeft: 12,
    },
    totalLabel: {
        opacity: 0.6,
        fontSize: 12,
    },
    totalAmount: {
        fontWeight: "bold",
        fontSize: 18,
    },
    //stesso riquadro vuoto della home e della scheda Abbonamenti
    emptyState: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 28,
        paddingHorizontal: 12,
        gap: 6,
    },
    emptyTitle: {
        fontWeight: "600",
        color: colors.textSecondary,
        marginTop: 4,
        textAlign: "center",
    },
    emptyHint: {
        textAlign: "center",
        color: colors.textMuted,
        fontSize: 13,
        lineHeight: 18,
    },
    budgetHint: {
        marginTop: 16,
        textAlign: "center",
        color: colors.primary,
        fontWeight: "bold",
    },
});
