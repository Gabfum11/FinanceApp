import { StyleSheet } from "react-native";
import { type Colori } from "./tokens";

export const creaStili = (colors: Colori) =>
  StyleSheet.create({
  pillola: {
    flexDirection: "row",
    alignSelf: "flex-end",
    padding: 3,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
  },
  //sulla prima pagina della presentazione, che e' verde scuro
  pillolaScura: {
    backgroundColor: colors.overlayMuted,
  },
  //bandiera e codice affiancati: a sinistra un po' meno spazio, la bandiera e' tonda
  voce: {
    minWidth: 44,
    height: 32,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  voceScelta: {
    backgroundColor: colors.surface,
  },
  voceSceltaScura: {
    backgroundColor: colors.textOnPrimary,
  },
  testo: {
    fontSize: 13,
    fontWeight: "bold",
    color: colors.textMuted,
  },
  testoScuro: {
    color: colors.textOnDark,
  },
  testoScelto: {
    color: colors.text,
  },
  //sulla pillola bianca della pagina scura: resta verde scuro in entrambi i temi
  testoSceltoScuro: {
    color: colors.surfaceDark,
  },
});
