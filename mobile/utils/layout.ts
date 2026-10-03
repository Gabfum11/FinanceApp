import { useWindowDimensions } from "react-native";

// Misure che decidono come l'app si adatta allo schermo.
//
// LARGHEZZA_MASSIMA: oltre questa (tablet, browser sul computer) l'app resta
// una colonna centrata invece di allungare card e pulsanti per tutto lo schermo.
// SCHERMO_STRETTO: sotto questa (es. iPhone SE, 375) le etichette della barra
// delle schede lasciano il posto alla sola icona, perche' non ci stanno.
// SCHERMO_MOLTO_STRETTO: sotto questa (es. vecchi telefoni da 320) anche la
// pillola dell'assistente: sopra, e' il saluto a rimpicciolirsi per farle posto.
export const LARGHEZZA_MASSIMA = 560;
export const SCHERMO_STRETTO = 400;
export const SCHERMO_MOLTO_STRETTO = 340;

export function useSchermoStretto(soglia: number = SCHERMO_STRETTO): boolean {
  return useWindowDimensions().width < soglia;
}
