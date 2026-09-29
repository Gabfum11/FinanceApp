import * as SecureStore from "expo-secure-store";
import { API_URL } from "@/config";

// La sessione è fatta di due token:
// - il token di accesso dura 15 minuti e va in ogni richiesta
// - il refresh token dura 30 giorni e serve solo a ottenere una coppia nuova
// Ogni rinnovo consuma il refresh token: se il server ne vede uno già usato,
// pensa a un furto e chiude tutte le sessioni. Per questo il rinnovo deve
// partire una volta sola anche quando più richieste scoprono insieme che il
// token è scaduto.

//"token" è la chiave usata prima dei refresh token: tenendola, chi aggiorna
//l'app resta dentro finché il suo vecchio token è valido
const CHIAVE_ACCESSO = "token";
const CHIAVE_RINNOVO = "refresh_token";

//il rinnovo anticipato evita che la prima richiesta dopo una pausa fallisca
//con 401 e debba essere ripetuta
const SECONDI_PRIMA_DEL_RINNOVO = 60;

export type Sessione = { access_token: string; refresh_token?: string | null };

export function tokenDiAccesso(): Promise<string | null> {
  return SecureStore.getItemAsync(CHIAVE_ACCESSO);
}

/** C'è una sessione da riprendere? Basta uno dei due token. */
export async function haSessione(): Promise<boolean> {
  return !!(await tokenDiAccesso()) || !!(await SecureStore.getItemAsync(CHIAVE_RINNOVO));
}

/** Salva i token ricevuti da login, Google, verifica email o cambio password. */
export async function salvaSessione(dati: Sessione): Promise<void> {
  await SecureStore.setItemAsync(CHIAVE_ACCESSO, dati.access_token);
  if (dati.refresh_token) {
    await SecureStore.setItemAsync(CHIAVE_RINNOVO, dati.refresh_token);
  }
}

/** Butta i token dal telefono, senza avvisare il server. */
export async function cancellaSessione(): Promise<void> {
  await SecureStore.deleteItemAsync(CHIAVE_ACCESSO);
  await SecureStore.deleteItemAsync(CHIAVE_RINNOVO);
}

/**
 * Logout di questo dispositivo: il server revoca il refresh token.
 *
 * I token locali vengono cancellati comunque: senza rete il refresh token
 * resta valido sul server, ma nessuno sul telefono lo possiede più.
 */
export async function chiudiSessione(): Promise<void> {
  const refresh = await SecureStore.getItemAsync(CHIAVE_RINNOVO);
  if (refresh) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });
    } catch {
      //senza rete si esce lo stesso: l'utente ha chiesto di uscire
    }
  }
  await cancellaSessione();
}

// "rifiutato": il server non riconosce il refresh token, si torna al login.
// "errore": rete assente o server in difficoltà; il refresh token potrebbe
// essere ancora buono, quindi non si butta la sessione.
export type EsitoRinnovo = "ok" | "rifiutato" | "errore";

let rinnovoInCorso: Promise<EsitoRinnovo> | null = null;

/**
 * Scambia il refresh token con una coppia nuova.
 *
 * Chi chiama mentre un rinnovo è già partito riceve lo stesso esito invece di
 * avviarne un secondo, che userebbe un refresh token appena consumato.
 */
export function rinnovaSessione(): Promise<EsitoRinnovo> {
  if (!rinnovoInCorso) {
    rinnovoInCorso = eseguiRinnovo().finally(() => {
      rinnovoInCorso = null;
    });
  }
  return rinnovoInCorso;
}

async function eseguiRinnovo(): Promise<EsitoRinnovo> {
  const refresh = await SecureStore.getItemAsync(CHIAVE_RINNOVO);
  //sessione di una versione precedente dell'app: non c'è niente da rinnovare
  if (!refresh) return "rifiutato";
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (response.status === 401) return "rifiutato";
    if (!response.ok) return "errore";
    await salvaSessione(await response.json());
    return "ok";
  } catch {
    return "errore";
  }
}

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
 * Rinnova in anticipo se il token di accesso è scaduto o sta per scadere.
 *
 * È un'ottimizzazione: senza, ci pensa apiFetch al primo 401. Qui si evita
 * che all'apertura dell'app tutte le richieste della Home falliscano insieme
 * e vadano ripetute.
 */
export async function rinnovaSeInScadenza(): Promise<void> {
  const token = await tokenDiAccesso();
  const scadenza = token ? scadenzaDelToken(token) : null;
  if (scadenza && scadenza.getTime() - Date.now() > SECONDI_PRIMA_DEL_RINNOVO * 1000) return;
  await rinnovaSessione();
}
