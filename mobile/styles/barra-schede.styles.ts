import { StyleSheet } from "react-native";
import { colors, floatingShadow } from "./tokens";
import { ALTEZZA_BARRA } from "@/utils/barraSchede";

export const styles = StyleSheet.create({
  //staccata dai bordi come una card: angoli, sfondo bianco e ombra marcata,
  //perche' galleggia sopra il contenuto che le scorre sotto
  barra: {
    position: "absolute",
    left: 16,
    right: 16,
    height: ALTEZZA_BARRA,
    borderRadius: 24,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    ...floatingShadow,
  },
  scheda: {
    flex: 1,
    height: ALTEZZA_BARRA,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  pillola: {
    width: 52,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  pillolaAttiva: {
    backgroundColor: colors.primarySoft,
  },
  nome: {
    fontSize: 11,
    color: colors.textMuted,
  },
  nomeAttivo: {
    fontWeight: "bold",
    color: colors.primaryDark,
  },
  postoPiu: {
    width: 64,
    alignItems: "center",
  },
  //il "+" sporge sopra la barra: resta il pulsante piu' visibile dell'app.
  //Giallo come il pulsante dell'assistente: i due modi di aggiungere una spesa
  piu: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginTop: -26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    ...floatingShadow,
  },
  premuto: {
    opacity: 0.85,
  },
});
