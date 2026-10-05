import { Platform, useWindowDimensions } from "react-native";

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
//SCHERMO_LARGO: da qui in su, nel browser, l'app diventa la versione per
//computer: barra laterale al posto di quella in basso e schermate a piu'
//colonne. Solo sul web: un tablet con l'app nativa resta come il telefono
export const SCHERMO_LARGO = 1024;
//le schermate per computer non vanno oltre questa larghezza: su un monitor
//grande righe lunghe un metro sarebbero scomode da leggere
export const LARGHEZZA_CONTENUTO = 1120;
//le schermate gia' pensate per il computer: le altre (login, moduli) restano
//nella colonna stretta, dove un campo largo tutto lo schermo sarebbe scomodo
export const PAGINE_LARGHE = ["/home", "/stats", "/budget", "/profile", "/all_expenses", "/add_expense", "/assistant",
  //moduli brevi: sul computer sono card sopra la pagina, che deve restare larga dietro
  "/set_budget", "/modify_profile", "/changePassw"];

export function useSchermoLargo(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === "web" && width >= SCHERMO_LARGO;
}

export function useSchermoStretto(soglia: number = SCHERMO_STRETTO): boolean {
  return useWindowDimensions().width < soglia;
}
