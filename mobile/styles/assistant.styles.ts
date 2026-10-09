import { StyleSheet } from "react-native";
import { type Colori, cardShadow, floatingShadow, fontSize, fontWeight } from "./tokens";

export const creaStili = (colors: Colori) =>
  StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    pieno: {
        flex: 1,
    },
    //sul computer: la pagina a sinistra, appena scurita, e il pannello a destra
    rigaPannello: {
        flex: 1,
        flexDirection: "row",
    },
    fuoriPannello: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.2)",
        backdropFilter: "blur(4px)",
    },
    //non "flex: 0": sul web vuol dire base zero, e il pannello sarebbe largo zero
    pannello: {
        flexGrow: 0,
        flexShrink: 0,
        flexBasis: "auto",
        width: 440,
        borderLeftWidth: 1,
        borderLeftColor: colors.border,
    },
    // intestazione: dice dove si è e dà un modo esplicito per chiudere il modale
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingLeft: 16,
        paddingRight: 4,
        paddingVertical: 8,
        gap: 12,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    headerText: {
        flex: 1,
    },
    headerTitle: {
        fontWeight: fontWeight.bold,
        color: colors.text,
    },
    headerSubtitle: {
        color: colors.textMuted,
    },
    chatContainer:{
        padding:16, // i messaggi non toccano i bordi dello schermo
        gap:12, //spazio tra un messaggio e l'altro
        //i messaggi partono dal fondo, vicino al campo di testo, come nelle app di chat:
        //il benvenuto con gli esempi resta leggibile mentre l'utente scrive
        flexGrow:1,
        justifyContent:"flex-end",
    },
    messageBubble:{
        maxWidth:"85%",
        paddingVertical:10, //spazio interno tra il bordo e il testo
        paddingHorizontal:14,
        borderRadius:18, //bordi arrotondati, tipico delle chat
    },
    userBubble: {
        backgroundColor: colors.surfaceDark,
        alignSelf:"flex-end", //allineato a destra
        borderBottomRightRadius: 4, // "coda" verso chi ha scritto
    },
    systemBubble: {
        backgroundColor:colors.surface,
        alignSelf: "flex-start",       // allineato a sinistra
        borderBottomLeftRadius: 4,
        // eventualmente una leggera ombra, per farla "staccare" dallo sfondo chiaro
        ...cardShadow,
    },
    // esempi dentro il benvenuto, separati dal testo da una linea sottile
    examples: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: 4,
    },
    examplesLabel: {
        fontSize: fontSize.xs,
        fontWeight: fontWeight.semibold,
        color: colors.textMuted,
        marginBottom: 2,
    },
    //in corsivo e a 15 si leggevano poco: dritti, piu' grandi e marcati
    example: {
        color: colors.primaryDark,
        fontSize: fontSize.base,
        fontWeight: fontWeight.semibold,
        lineHeight: 24,
    },
    // card di esito dopo il salvataggio
    savedCard: {
        alignSelf: "stretch",
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.primarySoft,
        overflow: "hidden",
        ...cardShadow,
    },
    savedHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: colors.primarySoft,
    },
    savedTitle: {
        fontWeight: fontWeight.bold,
        color: colors.primaryDark,
    },
    savedBody: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
    },
    savedInfo: {
        flex: 1,
    },
    savedDescription: {
        fontWeight: fontWeight.semibold,
        color: colors.text,
    },
    savedMeta: {
        fontSize: fontSize.xs,
        color: colors.textMuted,
        marginTop: 2,
    },
    savedAmount: {
        fontWeight: fontWeight.bold,
        fontSize: fontSize.base,
        color: colors.text,
    },
    //spesa da confermare: la card dell'esito, staccata dalla chat come
    //elemento flottante e con l'intestazione grigia finche' non si conferma
    pendingCard: {
        marginHorizontal: 16, // allineata ai messaggi della chat
        marginVertical: 8,
        borderRadius: 20,
        borderWidth: 0,
        ...floatingShadow,
    },
    pendingHeader: {
        backgroundColor: colors.surfaceAlt,
    },
    pendingTitle: {
        fontWeight: fontWeight.bold,
        color: colors.textSecondary,
    },
    //righe modificabili sotto la spesa: data e rinnovo
    pendingLine: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        minHeight: 48,
        paddingHorizontal: 14,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    pendingLineLabel: {
        flex: 1,
        fontSize: fontSize.md,
        color: colors.textSecondary,
    },
    pendingLineValue: {
        fontSize: fontSize.md,
        fontWeight: fontWeight.semibold,
        color: colors.text,
    },
    cardActions: {
        flexDirection: "row",
        flexWrap: "wrap", // tre azioni non sempre entrano su una riga sola
        justifyContent: "flex-end",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingTop: 12,
        paddingBottom: 14,
    },
    userText:{
        color:colors.textOnPrimary
    },
    systemText:{
        color:colors.textSecondary
    },
    inputRow:{
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        gap: 8,
    },
    textInput:{
        flex:1,
        borderRadius:16
    },
    sendButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.primary,
    },
    sendButtonDisabled: {
        backgroundColor: colors.disabled,
    },
    puntini: {
        flexDirection: "row",
        gap: 5,
        paddingVertical: 16,
    },
    puntino: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.textMuted,
    },
})