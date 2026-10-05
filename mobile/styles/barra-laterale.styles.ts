import { StyleSheet } from "react-native";
import { type Colori } from "./tokens";

export const creaStili = (colors: Colori) =>
  StyleSheet.create({
    //sempre aperta e ferma: il contenuto scorre accanto, non sotto
    barra: {
      width: 248,
      paddingVertical: 28,
      paddingHorizontal: 18,
      gap: 6,
      backgroundColor: colors.surface,
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    marchio: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 10,
      paddingBottom: 22,
    },
    logo: {
      width: 36,
      height: 36,
      borderRadius: 9,
    },
    nomeApp: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
    },
    //giallo come il "+" della barra del telefono: e' lo stesso comando
    nuova: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      height: 48,
      marginBottom: 14,
      borderRadius: 24,
      backgroundColor: colors.accent,
    },
    nuovaTesto: {
      fontSize: 15,
      fontWeight: "bold",
      color: "black",
    },
    premuto: {
      opacity: 0.85,
    },
    scheda: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      height: 46,
      paddingHorizontal: 14,
      borderRadius: 14,
    },
    //sul computer c'e' il mouse: passandoci sopra si capisce che e' cliccabile
    schedaSopra: {
      backgroundColor: colors.surfaceAlt,
    },
    //la stessa pillola verde chiaro della barra del telefono
    schedaAttiva: {
      backgroundColor: colors.primarySoft,
    },
    nome: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    nomeAttivo: {
      fontWeight: "bold",
      color: colors.primaryDark,
    },
  });
