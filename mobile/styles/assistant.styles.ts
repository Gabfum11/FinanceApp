import { StyleSheet } from "react-native";
import { colors, cardShadow, floatingShadow } from "./tokens";

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
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
        fontWeight: "700",
        color: colors.text,
    },
    headerSubtitle: {
        color: colors.textMuted,
    },
    chatContainer:{
        padding:16, // i messaggi non toccano i bordi dello schermo
        gap:12, //spazio tra un messaggio e l'altro
    },
    messageBubble:{
        maxWidth:"85%",
        paddingVertical:10, //spazio interno tra il bordo e il testo
        paddingHorizontal:14,
        borderRadius:18, //bordi arrotondati, tipico delle chat
    },
    userBubble: {
        backgroundColor:colors.primaryDark,
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
        fontSize: 12,
        fontWeight: "600",
        color: colors.textMuted,
        marginBottom: 2,
    },
    example: {
        color: colors.primaryDark,
        fontStyle: "italic",
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
        fontWeight: "700",
        color: colors.primaryDark,
    },
    savedBody: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 14,
    },
    savedIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.surfaceAlt,
    },
    savedInfo: {
        flex: 1,
    },
    savedDescription: {
        fontWeight: "600",
        color: colors.text,
    },
    savedMeta: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 2,
    },
    savedAmount: {
        fontWeight: "700",
        fontSize: 16,
        color: colors.text,
    },
    expenseCard:{
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 20,
        marginVertical: 8,
        marginHorizontal: 16, // allineata ai messaggi della chat
        gap: 6,
        ...floatingShadow,
    },
    cardLabel: {
    opacity: 0.5,
    },
    cardAmount: {
    color: colors.primary,
    fontWeight: "700",
    },
    confirmationDetail: {
    marginTop: 4,
    },
    undoButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    },
    cardActions: {
        flexDirection: "row",
        flexWrap: "wrap", // tre azioni non sempre entrano su una riga sola
        justifyContent: "flex-end",
        alignItems: "center",
        gap: 6,
        marginTop: 12,
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
    switchRow:{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 8,
        marginBottom: 4,
    },
    categoryRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 4,
    },
    dateRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 4,
    },
    dateChevron: {
        marginLeft: "auto",
    },
})