import { router } from "expo-router";
import { API_URL } from "@/config";
import { cancellaSessione, rinnovaSessione, tokenDiAccesso } from "@/utils/session";
import { toDateString } from "@/utils/date";

//i 401 di get_current_user hanno questi messaggi: gli altri (password attuale
//errata, conferma di eliminazione sbagliata) non riguardano la sessione e non
//devono mandare al login
const SESSIONE_NON_VALIDA = ["Could not validate credentials", "Not authenticated"];

function richiesta(path: string, options: RequestInit, token: string | null) {
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      //il server gira in UTC: senza la data del telefono, all'1 di notte del 1°
      //del mese per lui sarebbe ancora il mese prima (backend/app/business_logic/oggi.py)
      "X-Local-Date": toDateString(new Date()),
    },
  });
}

async function sessioneScaduta(response: Response): Promise<boolean> {
  if (response.status !== 401) return false;
  //clone: il corpo si legge una volta sola, e chi chiama potrebbe volerlo
  const corpo = await response.clone().json().catch(() => null);
  return SESSIONE_NON_VALIDA.includes(corpo?.detail);
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const usato = await tokenDiAccesso();
  const response = await richiesta(path, options, usato);
  if (!(await sessioneScaduta(response))) return response;

  //un'altra richiesta può aver già rinnovato mentre questa era in viaggio:
  //in quel caso basta ripetere con il token nuovo
  let attuale = await tokenDiAccesso();
  if (attuale === usato) {
    const esito = await rinnovaSessione();
    //senza rete la sessione può essere ancora buona: niente logout
    if (esito === "errore") return response;
    if (esito === "rifiutato") {
      await cancellaSessione();
      router.replace("/login");
      return response;
    }
    attuale = await tokenDiAccesso();
  }

  const ripetuta = await richiesta(path, options, attuale);
  if (await sessioneScaduta(ripetuta)) {
    await cancellaSessione();
    router.replace("/login");
  }
  return ripetuta;
}
