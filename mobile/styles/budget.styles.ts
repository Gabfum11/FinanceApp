import { StyleSheet } from "react-native";
export const styles=StyleSheet.create({
    container:{
        flex: 1, //deve occupare tutto lo spazio disponibile
        paddingTop:60
    },
    subRow:{
        flexDirection:"row",
        alignItems: "center",
        justifyContent: "space-between",
        padding:14,
        borderRadius:16,
        margin:5,
        backgroundColor: "white",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation:2
    },
    subIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "#E8F8F0",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    subInfo:{
        flex:1
    },
    subDesc:{
        fontSize:16,
        fontWeight:"bold"
    },
    subAmount:{
        fontSize:16
    },
    pausedRow:{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 14,
        borderRadius: 16,
        margin: 5,
        backgroundColor: "#F5F5F5",   // grigio molto tenue
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    pausedIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "#E5E5E5",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    pausedMeta: {
    color: "#999",
    fontSize: 13,
    },
    reactivateLink: {
    color: "#2ECC71",
    fontWeight: "bold",
    },
    subMeta: {
        color: "#666",
        fontSize: 13,
    },
    dueCard: {
        borderWidth: 1,
        borderColor: "#F5C518",
        borderRadius: 16,
        padding: 14,
        margin: 5,
        backgroundColor: "#FFFDF3",
    },
    dueHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    dueBadgeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 4,
    },
    dueBadge: {
        backgroundColor: "#FCECC0",
        color: "#B8860B",
        fontSize: 11,
        fontWeight: "bold",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        overflow: "hidden",
    },
    dueOverdue: {
        color: "#999",
        fontSize: 12,
    },
    dueQuestion: {
        marginTop: 10,
        marginBottom: 12,
        color: "#333",
    },
    dueActions: {
        flexDirection: "row",
        gap: 10,
    },
})