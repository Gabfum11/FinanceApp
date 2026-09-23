import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    container:{
        flex:1,
        padding:24,
        paddingTop:60,
    },
    header:{
        flexDirection: "row",
        justifyContent: "flex-end",  // spinge il contenuto verso la fine (destra, in una riga)
        alignItems: "center",
        marginBottom: 24,
    },
    logoutButton:{
        margin:0
    },
    profCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "white",
        borderRadius: 16,
        padding: 16,
        gap: 12,
    },
    avatarCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#E8F8F0",
        justifyContent: "center",
        alignItems: "center",
    },
    avatarInitials: {
        color: "#2ECC71",
        fontWeight: "bold",
        fontSize: 16,
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontWeight: "bold",
        fontSize: 16,
    },
    profileEmail: {
        color: "#999",
        fontSize: 13,
    },
    button: {
        borderColor: "#2ECC71",
        borderRadius: 20,
    },
    //etichetta di sezione: raggruppa le voci senza pesare come un titolo
    sectionLabel: {
        fontSize: 12,
        fontWeight: "700",
        color: "#8A8A8E",
        letterSpacing: 0.6,
        marginTop: 24,
        marginBottom: 8,
        marginLeft: 4,
    },
    sectionCard: {
        backgroundColor: "white",
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 15,
    },
    rowLabel: {
        flex: 1,
        fontSize: 15,
        color: "#1a1a1a",
    },
    //raggruppa titolo e sottotitolo, così lo switch resta allineato a destra
    rowTextGroup: {
        flex: 1,
    },
    rowHint: {
        fontSize: 12,
        color: "#8A8A8E",
        marginTop: 2,
    },
    supportText: {
        lineHeight: 20,
    },
    //l'indirizzo staccato dal testo: si legge e si trascrive piu' facilmente
    supportEmail: {
        marginTop: 8,
        fontSize: 16,
        fontWeight: "600",
        color: "#2ECC71",
    },
    //separatore rientrato, allineato al testo e non all'icona
    rowDivider: {
        height: 1,
        backgroundColor: "#EFEFF2",
        marginLeft: 48,
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
    deleteWarning: {
        marginBottom: 16,
        lineHeight: 20,
    },
    deleteError: {
        color: "#C0392B",
        marginTop: 8,
    },
})