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
})