import { StyleSheet } from "react-native";
import { colors } from "./tokens";

export const styles = StyleSheet.create({
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
  voce: {
    minWidth: 44,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
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
  testoSceltoScuro: {
    color: colors.primaryDark,
  },
});
