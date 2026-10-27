import { StyleSheet } from "react-native";
import { cardShadow, type Colori, fontSize, fontWeight, radius, spacing } from "./tokens";

export const creaStili = (colors: Colori) =>
  StyleSheet.create({
    lista: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
      gap: spacing.md,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.lg,
      gap: spacing.sm,
      ...cardShadow,
    },
    cima: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
      gap: spacing.sm,
    },
    quando: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.bold,
      color: colors.text,
      flexShrink: 1,
    },
    totale: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.bold,
      color: colors.text,
      fontVariant: ["tabular-nums"],
    },
    dettagli: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
    },
    azioni: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    pulsante: {
      minHeight: 44,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs + 2,
    },
    vedi: {
      flex: 1,
      backgroundColor: colors.surfaceAlt,
    },
    vediTesto: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
      color: colors.text,
    },
    elimina: {
      backgroundColor: colors.dangerSoft,
    },
    eliminaTesto: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
      color: colors.dangerDark,
    },
    premuto: {
      opacity: 0.7,
    },
  });
