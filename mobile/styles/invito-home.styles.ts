import { StyleSheet } from "react-native";
import { type Colori, floatingShadow } from "./tokens";

export const creaStili = (colors: Colori) =>
  StyleSheet.create({
  //sopra tutto, in basso, vicino alla barra del browser dove si trova il menu
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
  //icona di TrackIt e titolo: si capisce subito di cosa parla
  intestazione: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  titolo: {
    flex: 1,
    fontSize: 17,
    fontWeight: "bold",
    color: colors.text,
  },
  testo: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  passi: {
    gap: 10,
  },
  //il messaggio per tutti, in un riquadro come i passi di Safari
  istruzioni: {
    lineHeight: 20,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
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
});
