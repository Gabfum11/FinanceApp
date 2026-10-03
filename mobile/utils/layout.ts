import { useWindowDimensions } from "react-native";

// Misure che decidono come l'app si adatta allo schermo.
//
// LARGHEZZA_MASSIMA: oltre questa (tablet, browser sul computer) l'app resta
// una colonna centrata invece di allungare card e pulsanti per tutto lo schermo.
// SCHERMO_STRETTO: sotto questa (es. iPhone SE, 375) alcune etichette lasciano
// il posto alla sola icona, perche' non ci stanno.
export const LARGHEZZA_MASSIMA = 560;
export const SCHERMO_STRETTO = 400;

export function useSchermoStretto(): boolean {
  return useWindowDimensions().width < SCHERMO_STRETTO;
}
