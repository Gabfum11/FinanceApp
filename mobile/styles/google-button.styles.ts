import { StyleSheet } from "react-native";

// Misure e colori dalle linee guida Google: altezza minima 40, logo 20,
// bordo #747775 sulla variante chiara, testo #1F1F1F a 14pt medium.
export const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    paddingHorizontal: 12,
    gap: 12,
    borderRadius: 22, //forma "pill", come l'asset ufficiale
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#747775",
  },
  buttonPressed: {
    backgroundColor: "#F2F2F2",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F1F1F",
    letterSpacing: 0.25,
  },
  //bilancia la larghezza del logo, così il testo risulta centrato nel pulsante
  spacer: {
    width: 20,
  },
});
