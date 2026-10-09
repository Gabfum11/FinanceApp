import { StyleSheet } from "react-native";
import { type Colori, cardShadow, fontSize, fontWeight } from "./tokens";
export const creaStili = (colors: Colori) =>
  StyleSheet.create({
    container:{
        flex: 1, //deve occupare tutto lo spazio disponibile
    },
    //contenuto di PaginaScorrevole: il margine in alto lo calcola lei dalla barra di stato
    content:{
        paddingBottom: 48,
    },
    //sul computer: card affiancate, due per riga sulle finestre comuni
    griglia: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginBottom: 16,
    },
    cella: {
        flexGrow: 1,
        flexBasis: 440,
        maxWidth: 560,
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
        marginRight: 12,
    },
    //quanto costano in tutto gli abbonamenti attivi: la prima cosa che si vuole sapere
    riepilogo: {
        flexDirection: "row",
        flexWrap: "wrap",
        backgroundColor: colors.primarySoft,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 16,
        marginTop: 8,
        marginBottom: 16,
    },
    riepilogoVoce: {
        flex: 1,
        gap: 2,
    },
    riepilogoSeconda: {
        borderLeftWidth: 1,
        borderLeftColor: colors.border,
        paddingLeft: 16,
    },
    riepilogoEtichetta: {
        fontSize: fontSize.xs,
        fontWeight: fontWeight.bold,
        letterSpacing: 0.5,
        textTransform: "uppercase",
        color: colors.primaryDark,
    },
    //titoli delle sezioni (attivi, in pausa, da rinnovare): come quelli della home.
    //Erano headlineMedium, alti come il titolo di una schermata
    sezioneTitolo: {
        fontSize: fontSize.base,
        fontWeight: fontWeight.bold,
        color: colors.text,
    },
    riepilogoValore: {
        fontSize: fontSize.xxl,
        fontWeight: fontWeight.bold,
        color: colors.primaryDark,
        fontVariant: ["tabular-nums"],
    },
    riepilogoNota: {
        width: "100%",
        marginTop: 8,
        fontSize: fontSize.xs,
        color: colors.textMuted,
    },
    subInfo:{
        flex:1
    },
    subDesc:{
        fontSize: fontSize.base,
        fontWeight: fontWeight.bold
    },
    subAmount:{
        fontSize: fontSize.base,
        fontVariant: ["tabular-nums"],
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
    fontSize: fontSize.sm,
    },
    reactivateButton: {
        borderColor: colors.primary,
        borderRadius: 999,
    },
    subMeta: {
        color: colors.textMuted,
        fontSize: fontSize.sm,
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
        fontSize: fontSize.xxs,
        fontWeight: fontWeight.bold,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        overflow: "hidden",
    },
    dueOverdue: {
        color: colors.textMuted,
        fontSize: fontSize.xs,
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
    emptyState: {
        alignItems: "center",
        paddingVertical: 28,
        paddingHorizontal: 32,
        gap: 6,
    },
    emptyTitle: {
        fontWeight: fontWeight.semibold,
        color: colors.textSecondary,
        marginTop: 4,
    },
    emptyHint: {
        textAlign: "center",
        color: colors.textMuted,
        fontSize: fontSize.sm,
        lineHeight: 18,
    },
    loader: {
        marginTop: 28,
    },
})
