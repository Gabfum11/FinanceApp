import { StyleSheet } from "react-native";
import { type Colori, floatingShadow, scrim } from "./tokens";

export const creaStili = (colors: Colori) =>
  StyleSheet.create({
    //la pagina di partenza resta dietro, scurita e appena sfocata: si capisce
    //che e' una cosa veloce e che chiudendo si torna li'
    velo: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      backgroundColor: scrim,
      //solo sul web; altrove viene ignorata e resta il velo scuro
      backdropFilter: "blur(6px)",
    },
    fuori: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    finestra: {
      width: "100%",
      maxWidth: 520,
      maxHeight: "92%",
      borderRadius: 24,
      overflow: "hidden",
      backgroundColor: colors.background,
      ...floatingShadow,
    },
    chiudi: {
      position: "absolute",
      top: 8,
      right: 8,
    },
  });
