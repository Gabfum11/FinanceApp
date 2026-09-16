import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    introContainer: {
        alignItems:"center",
        marginTop:50
    },
    title:{
        fontWeight:"bold"
        
    },
    sectionParagraph:{
        textAlign:"center"
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
        backgroundColor:"#1B4332",
        alignSelf:"flex-end" //allineato a destra
    },
    systemBubble: {
        backgroundColor:"white",
        alignSelf: "flex-start",       // allineato a sinistra
        // eventualmente una leggera ombra, per farla "staccare" dallo sfondo chiaro
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    expenseCard:{
        backgroundColor: "white",
        borderRadius: 20,
        padding: 20,
        marginVertical: 8,
        gap: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
    },
    cardLabel: {
    opacity: 0.5,
    },
    cardAmount: {
    color: "#2ECC71",
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
        justifyContent: "flex-end",
        gap: 8,
        marginTop: 12,
    },
    userText:{
        color:"white"
    },
    systemText:{
        color:"#333333"
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
    }
})