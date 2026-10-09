import { StyleSheet } from "react-native";
import { type Colori, fontSize, fontWeight } from "./tokens";

export const creaStili = (colors: Colori) =>
  StyleSheet.create({
    pagina: {
      flex: 1,
      flexDirection: "row",
      backgroundColor: colors.background,
    },
    //a sinistra: il verde scuro della presentazione, che non cambia con il tema
    marchio: {
      flex: 1,
      paddingVertical: 48,
      paddingHorizontal: 56,
      justifyContent: "space-between",
      gap: 40,
      backgroundColor: colors.surfaceDark,
      overflow: "hidden",
    },
    //gli stessi cerchi sottili che circondano il logo nella presentazione
    cerchio: {
      position: "absolute",
      borderWidth: 1,
      borderColor: colors.overlayLight,
    },
    cerchioGrande: {
      top: -120,
      right: -120,
      width: 380,
      height: 380,
      borderRadius: 190,
      opacity: 0.5,
    },
    cerchioPiccolo: {
      top: -60,
      right: -60,
      width: 260,
      height: 260,
      borderRadius: 130,
    },
    logoRiga: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    logo: {
      width: 44,
      height: 44,
      borderRadius: 11,
    },
    nomeApp: {
      fontSize: fontSize.xxl,
      fontWeight: fontWeight.bold,
      color: colors.textOnPrimary,
    },
    messaggio: {
      gap: 14,
      maxWidth: 460,
    },
    titolo: {
      fontSize: fontSize.hero,
      lineHeight: 46,
      fontWeight: fontWeight.bold,
      color: colors.textOnPrimary,
    },
    sottotitolo: {
      fontSize: fontSize.base,
      lineHeight: 25,
      color: colors.textOnDark,
    },
    card: {
      maxWidth: 400,
      padding: 20,
      gap: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.overlayLight,
      backgroundColor: colors.overlayFaint,
    },
    cardRiga: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
    },
    cardEtichetta: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.bold,
      letterSpacing: 0.5,
      color: colors.accent,
    },
    cardImporto: {
      fontSize: fontSize.xxxl,
      fontWeight: fontWeight.bold,
      color: colors.textOnPrimary,
    },
    cardTotale: {
      fontSize: fontSize.sm,
      marginBottom: 4,
      color: colors.textOnDarkMuted,
    },
    barra: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.overlayLight,
    },
    barraPiena: {
      width: "52%",
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    //a destra: il modulo, non piu' largo di quanto serve per leggerlo
    lato: {
      flex: 1,
      paddingVertical: 32,
      paddingHorizontal: 48,
    },
    lingua: {
      alignItems: "flex-end",
    },
    modulo: {
      flex: 1,
      width: "100%",
      maxWidth: 480,
      alignSelf: "center",
    },
  });
