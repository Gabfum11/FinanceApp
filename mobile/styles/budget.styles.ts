import { StyleSheet } from "react-native";
import { colors, cardShadow } from "./tokens";
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
        backgroundColor: colors.surface,
        ...cardShadow,
    },
    subIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.primarySoft,
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
        backgroundColor: colors.surfaceAlt,   // grigio molto tenue
        ...cardShadow,
    },
    pausedIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.border,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    pausedMeta: {
    color: colors.textMuted,
    fontSize: 13,
    },
    reactivateLink: {
    color: colors.primary,
    fontWeight: "bold",
    },
    subMeta: {
        color: colors.textMuted,
        fontSize: 13,
    },
    dueCard: {
        borderWidth: 1,
        borderColor: colors.accent,
        borderRadius: 16,
        padding: 14,
        margin: 5,
        backgroundColor: colors.warningSurface,
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
        backgroundColor: colors.warningBadge,
        color: colors.warningText,
        fontSize: 11,
        fontWeight: "bold",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        overflow: "hidden",
    },
    dueOverdue: {
        color: colors.textMuted,
        fontSize: 12,
    },
    dueQuestion: {
        marginTop: 10,
        marginBottom: 12,
        color: colors.textSecondary,
    },
    dueActions: {
        flexDirection: "row",
        gap: 10,
    },
})