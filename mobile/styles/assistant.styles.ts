import { StyleSheet } from "react-native";
import { colors, cardShadow, floatingShadow } from "./tokens";

export const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    // esempi toccabili: riempiono il campo di testo, l'utente li corregge e invia
    suggestions: {
        flexDirection: "row",
        flexWrap: "wrap", // vanno a capo invece di uscire dallo schermo
        gap: 8,
    },
    suggestion: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    suggestionPressed: {
        opacity: 0.6,
    },
    suggestionText: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    chatContainer:{
        padding:12, // i messaggi non toccano i bordi dello schermo
        gap:12, //spazio tra un messaggio e l'altro
    },
    messageBubble:{
        maxWidth:"80%",
        padding:12, //spazio interno tra il bordo e il testo
        borderRadius:16, //bordi arrotondati, tipico delle chat
    },
    userBubble: {
        backgroundColor:colors.primaryDark,
        alignSelf:"flex-end" //allineato a destra
    },
    systemBubble: {
        backgroundColor:colors.surface,
        alignSelf: "flex-start",       // allineato a sinistra
        // eventualmente una leggera ombra, per farla "staccare" dallo sfondo chiaro
        ...cardShadow,
    },
    expenseCard:{
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 20,
        marginVertical: 8,
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