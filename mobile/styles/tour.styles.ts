import { StyleSheet } from "react-native";
import { type Colori, radius } from "./tokens";

export const VELO = "rgba(12,22,17,0.68)";

export const creaStili = (colors: Colori) =>
  StyleSheet.create({
  ring: {
    position: "absolute",
    borderWidth: 2,
    borderColor: colors.accent,
  },
  // --- benvenuto ---
  introCard: {
    position: "absolute",
    left: 20,
    right: 20,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingTop: 26,
    paddingHorizontal: 22,
    paddingBottom: 14,
  },
  introLogo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    marginBottom: 12,
  },
  introTitle: {
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 6,
  },
  introText: {
    textAlign: "center",
    color: colors.textSecondary,
    opacity: 0.8,
    maxWidth: 250,
    marginBottom: 16,
  },
  introButton: {
    width: "100%",
  },
  introButtonLabel: {
    fontSize: 16,
    fontWeight: "bold",
  },
  // --- fumetto ---
  tip: {
    position: "absolute",
    left: 12,
    right: 12,
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  //quadrato ruotato: sporge per meta' dal fumetto e indica il pulsante
  arrow: {
    position: "absolute",
    width: 14,
    height: 14,
    backgroundColor: colors.surface,
    borderRadius: 2,
    transform: [{ rotate: "45deg" }],
  },
  count: {
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 0.6,
    color: colors.textMuted,
  },
  tipTitle: {
    fontSize: 17,
    fontWeight: "bold",
    marginTop: 4,
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  tipFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  pips: {
    flexDirection: "row",
    gap: 5,
  },
  pip: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  pipActive: {
    width: 16,
    backgroundColor: colors.primary,
  },
  tipButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  skipLabel: {
    color: colors.textMuted,
  },
});
