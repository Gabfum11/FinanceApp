import { Linking, Platform } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Application from "expo-application";

// Indirizzo pubblico: compare nella card di supporto e finisce nella scheda
// dello store. Cambiarlo qui lo aggiorna ovunque.
export const SUPPORT_EMAIL = "gabrifu03@gmail.com";

/** Versione e dispositivo, da allegare al messaggio.
 *
 * Senza, ogni segnalazione richiede due email di scambio per capire dove
 * guardare: "che versione hai?", "su che telefono?".
 */
function infoDispositivo(): string {
  const versione = Application.nativeApplicationVersion ?? "?";
  const build = Application.nativeBuildVersion ?? "?";
  return [
    "---",
    `Versione: ${versione} (build ${build})`,
    `Sistema: ${Platform.OS} ${Platform.Version}`,
    "---",
    "",
  ].join("\n");
}

export type EsitoContatto = "aperto" | "copiato" | "errore";

/**
 * Apre l'app email con oggetto e diagnostica già compilati.
 *
 * Se nessuna app email è configurata, mailto: non apre nulla: in quel caso
 * si copia l'indirizzo negli appunti, così l'utente può comunque scrivere.
 */
export async function contattaSupporto(): Promise<EsitoContatto> {
  const oggetto = encodeURIComponent("TrackIt — Supporto");
  const corpo = encodeURIComponent(infoDispositivo());
  const url = `mailto:${SUPPORT_EMAIL}?subject=${oggetto}&body=${corpo}`;

  try {
    await Linking.openURL(url);
    return "aperto";
  } catch {
    //nessuna app email: almeno l'indirizzo resta a portata di mano
    try {
      await Clipboard.setStringAsync(SUPPORT_EMAIL);
      return "copiato";
    } catch {
      return "errore";
    }
  }
}
