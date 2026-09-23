import * as SecureStore from "expo-secure-store";
import { API_URL } from "@/config";

// Il token scade dopo 30 giorni. Senza rinnovo, alla scadenza l'utente si
// ritroverebbe al login senza spiegazione: qui lo sostituiamo quando è a metà
// vita, così chi apre l'app almeno una volta al mese resta sempre autenticato.
const GIORNI_PRIMA_DEL_RINNOVO = 15;

/** Data di scadenza scritta dentro il token, o null se illeggibile. */
function scadenzaDelToken(token: string): Date | null {
  try {
    //un JWT è "intestazione.contenuto.firma": il contenuto è base64
    const contenuto = token.split(".")[1];
    if (!contenuto) return null;
    //base64url -> base64, e il padding che atob richiede
    const base64 = contenuto.replace(/-/g, "+").replace(/_/g, "/");
    const riempito = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(riempito));
    return typeof payload.exp === "number" ? new Date(payload.exp * 1000) : null;
  } catch {
    //un token malformato non deve far fallire l'avvio: se ne accorge il server
    return null;
  }
}

/**
 * Sostituisce il token se manca poco alla scadenza.
 *
 * Silenziosa di proposito: è un'ottimizzazione, non un requisito. Se fallisce
 * il token attuale resta valido, e l'utente non deve vedere errori.
 */
export async function refreshTokenIfNeeded(): Promise<void> {
  try {
    const token = await SecureStore.getItemAsync("token");
    if (!token) return;

    const scadenza = scadenzaDelToken(token);
    if (!scadenza) return;

    const giorniRimasti = (scadenza.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    //già scaduto: il rinnovo verrebbe rifiutato, tanto vale lasciar fare al 401
    if (giorniRimasti <= 0) return;
    if (giorniRimasti > GIORNI_PRIMA_DEL_RINNOVO) return;

    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;

    const data = await response.json();
    if (data?.access_token) {
      await SecureStore.setItemAsync("token", data.access_token);
    }
  } catch {
    //senza rete il rinnovo salta: si riproverà alla prossima apertura
  }
}
