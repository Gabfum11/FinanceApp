import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSchermoLargo } from "@/utils/layout";

// Misure della barra delle schede, che galleggia sopra il contenuto.
//
// Le schermate a schede scorrono dietro la barra: l'ultima riga deve poter
// salire sopra di essa, e i messaggi in basso (Snackbar) apparire sopra e non
// sotto. Questo dice quanto spazio lasciare, in un posto solo.
export const ALTEZZA_BARRA = 68;
export const DISTANZA_DAL_FONDO = 12;

/** Spazio da lasciare in fondo a una schermata a schede. */
export function useSpazioBarra(): number {
  const insets = useSafeAreaInsets();
  //sul computer la barra sta di lato: in fondo basta un po' di respiro
  const largo = useSchermoLargo();
  if (largo) return 32;
  //16 di respiro: l'ultima card non deve toccare la barra
  return ALTEZZA_BARRA + DISTANZA_DAL_FONDO + insets.bottom + 16;
}
