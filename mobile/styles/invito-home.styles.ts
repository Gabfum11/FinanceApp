import { StyleSheet } from "react-native";
import { type Colori, floatingShadow } from "./tokens";

export const creaStili = (colors: Colori) =>
  StyleSheet.create({
  //sopra tutto, in basso: su iPhone il pulsante Condividi di Safari e' li' sotto
  card: {
    position: "absolute",
    left: 16,
    right: 16,
    padding: 18,
    paddingBottom: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    ...floatingShadow,
  },
  titolo: {
    fontSize: 17,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 4,
  },
  testo: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  passi: {
    gap: 10,
    marginTop: 14,
  },
  passo: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  numero: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 10,
    textAlign: "center",
    lineHeight: 22,
    fontSize: 12,
    fontWeight: "bold",
    color: colors.primaryDark,
    backgroundColor: colors.primarySoft,
    overflow: "hidden",
  },
  evidenza: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.text,
  },
  azioni: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  //quadrato ruotato che sporge per meta' sotto la card, come nel tour
  punta: {
    position: "absolute",
    bottom: -7,
    left: "50%",
    marginLeft: -7,
    width: 14,
    height: 14,
    borderRadius: 2,
    backgroundColor: colors.surface,
    transform: [{ rotate: "45deg" }],
  },
});
