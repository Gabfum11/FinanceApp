import { StyleSheet } from "react-native";
import { type Colori, fontSize, fontWeight, radius, spacing } from "./tokens";

export const creaStili = (colors: Colori) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4, paddingTop: 8 },
    headerTitle: { flex: 1, textAlign: "center", fontWeight: fontWeight.bold },
    headerSpacer: { width: 48 },
    //sul computer: titolo allineato a sinistra, la ✕ la mette FinestraComputer
    headerComputer: { minHeight: 64, justifyContent: "center", paddingLeft: spacing.lg, paddingRight: 64 },
    headerTitoloComputer: { fontWeight: fontWeight.bold },
    passo: { textAlign: "center", fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.sm },

    // --- scelta del file ---
    scelta: { padding: spacing.lg, gap: spacing.lg },
    riquadroFile: {
      borderWidth: 2, borderStyle: "dashed", borderColor: colors.border, borderRadius: radius.lg,
      paddingVertical: spacing.xl, paddingHorizontal: spacing.md, alignItems: "center", gap: spacing.sm,
    },
    riquadroFileComputer: { paddingVertical: 40 },
    riquadroFileSopra: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    oppure: { fontSize: fontSize.sm, color: colors.textMuted, marginVertical: 2 },
    iconaFile: {
      width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primarySoft,
      alignItems: "center", justifyContent: "center",
    },
    sceltaTitolo: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.text },
    nota: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: "center" },
    notaRiga: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
    notaTesto: { flex: 1, fontSize: fontSize.sm, lineHeight: 20, color: colors.textMuted },
    pulsante: {
      minHeight: 46, borderRadius: radius.pill, backgroundColor: colors.primary, paddingHorizontal: spacing.xl,
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    },
    pulsanteTesto: { color: colors.textOnPrimary, fontWeight: fontWeight.bold, fontSize: fontSize.base },
    pulsanteBloccato: { backgroundColor: colors.msgArancioSoft, borderWidth: 1.5, borderColor: colors.msgArancio },
    pulsanteBloccatoTesto: { color: colors.msgArancio },
    pulsanteSecondario: {
      minHeight: 44, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border,
      alignItems: "center", justifyContent: "center", marginHorizontal: spacing.lg, marginBottom: spacing.lg,
    },
    pulsanteSecondarioTesto: { color: colors.text, fontWeight: fontWeight.semibold },
    premuto: { opacity: 0.7 },

    // --- caricamento ---
    stato: {
      flexDirection: "row", alignItems: "center", gap: spacing.md, margin: spacing.md, padding: spacing.md,
      backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    },
    statoTesti: { flex: 1, gap: 2 },
    statoTitolo: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
    statoNota: { fontSize: fontSize.sm, color: colors.textMuted },
    sagoma: {
      marginHorizontal: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
      borderRadius: radius.md, overflow: "hidden",
    },
    sagomaRiga: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
    sagomaSeparata: { borderTopWidth: 1, borderTopColor: colors.border },
    blocco: { backgroundColor: colors.surfaceAlt, borderRadius: 6, height: 12 },

    // --- errore ---
    errore: { alignItems: "center", gap: spacing.sm, marginTop: 48, paddingHorizontal: spacing.xl },
    erroreIcona: {
      width: 56, height: 56, borderRadius: 28, backgroundColor: colors.msgArancioSoft,
      alignItems: "center", justifyContent: "center",
    },
    erroreTitolo: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.text, textAlign: "center" },
    erroreTesto: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: "center" },
    link: { textAlign: "center", color: colors.primaryDark, fontWeight: fontWeight.semibold, padding: spacing.md },
    spazio: { flex: 1 },

    // --- controllo ---
    sezione: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "baseline",
      paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 6,
    },
    sezioneTitolo: {
      fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted,
      textTransform: "uppercase", letterSpacing: 0.5,
    },
    sezioneAzione: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primaryDark },
    lista: {
      marginHorizontal: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md,
      borderWidth: 1, borderColor: colors.border, overflow: "hidden",
    },
    riga: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 10, paddingRight: 4 },
    rigaSeparata: { borderTopWidth: 1, borderTopColor: colors.border },
    casella: { width: 40, minHeight: 44, alignItems: "center", justifyContent: "center" },
    iconaSconosciuta: {
      width: 36, height: 36, borderRadius: 18, backgroundColor: colors.textMuted,
      alignItems: "center", justifyContent: "center",
    },
    rigaTesti: { flex: 1, minWidth: 0, gap: 3 },
    rigaNome: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text },
    rigaNomeEsclusa: { color: colors.textMuted },
    rigaMeta: { fontSize: fontSize.sm, color: colors.textMuted },
    importoColonna: { alignItems: "flex-end" },
    importo: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text, fontVariant: ["tabular-nums"] },
    importoEscluso: { color: colors.textMuted },
    importoPieno: { fontSize: fontSize.xs, color: colors.textMuted, textDecorationLine: "line-through" },
    matita: { width: 40, height: 44, alignItems: "center", justifyContent: "center" },
    messaggio: {
      flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start",
      borderRadius: radius.sm, paddingVertical: 3, paddingHorizontal: 8,
    },
    messaggioTesto: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
    piede: {
      borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface,
      padding: spacing.lg, gap: spacing.sm,
    },
    piedeRiga: { flexDirection: "row", justifyContent: "space-between" },
    piedeTesto: { fontSize: fontSize.sm, color: colors.textMuted },
    piedeTotale: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.text },

    // --- foglio di modifica ---
    velo: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
    foglio: {
      backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
      padding: spacing.lg, gap: spacing.md, maxHeight: "90%", width: "100%", maxWidth: 560, alignSelf: "center",
    },
    maniglia: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center" },
    campo: { gap: 4 },
    etichetta: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted },
    testoBanca: {
      backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, padding: spacing.sm,
      fontFamily: "monospace", fontSize: fontSize.sm, color: colors.text,
    },
    input: {
      borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md,
      minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      fontSize: fontSize.base, color: colors.text,
    },
    inputSolaLettura: { color: colors.textMuted },
    dueCampi: { flexDirection: "row", gap: spacing.sm },
    interruttore: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
    interruttoreTesto: { flex: 1, fontSize: fontSize.sm, color: colors.text },
    gruppoTitolo: {
      fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textMuted, textTransform: "uppercase",
      paddingTop: spacing.md, paddingBottom: 4,
    },
    voce: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: spacing.md },
    voceTesto: { flex: 1, fontSize: fontSize.base, color: colors.text },
  });
