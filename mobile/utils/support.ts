import { Platform } from "react-native";
import { API_URL } from "@/config";

// Indirizzo pubblico del supporto: lo stesso a cui arrivano i messaggi del
// modulo «Scrivici» (backend: SUPPORT_EMAIL). Cambiarlo qui lo aggiorna ovunque.
export const SUPPORT_EMAIL = "gabrifu03@gmail.com";

export type Argomento = "problema" | "idea" | "domanda" | "altro";

/** Browser e sistema in breve ("Chrome 129 · Windows"), da allegare al messaggio.
 *
 * Senza, ogni segnalazione richiede due email di scambio per capire dove
 * guardare. Non l'intero user agent: e' lungo, illeggibile nella casella, e
 * dice di chi scrive piu' di quanto serva.
 */
export function descriviBrowser(): string | null {
  if (Platform.OS !== "web" || typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  //l'ordine conta: Edge e Opera si dichiarano anche Chrome, Chrome anche Safari
  const noti: [string, RegExp][] = [
    ["Edge", /Edg\/(\d+)/],
    ["Opera", /OPR\/(\d+)/],
    ["Firefox", /Firefox\/(\d+)/],
    ["Chrome", /Chrome\/(\d+)/],
    ["Safari", /Version\/(\d+).*Safari/],
  ];
  const trovato = noti.map(([nome, re]) => [nome, ua.match(re)?.[1]] as const).find(([, versione]) => versione);
  const browser = trovato ? `${trovato[0]} ${trovato[1]}` : "Altro browser";
  const sistema =
    /iPhone|iPad/.test(ua) ? "iOS"
    : /Android/.test(ua) ? "Android"
    : /Windows/.test(ua) ? "Windows"
    : /Mac OS X/.test(ua) ? "macOS"
    : /Linux/.test(ua) ? "Linux"
    : "?";
  return `${browser} · ${sistema}`;
}

/** Manda il messaggio del modulo «Scrivici». Non serve l'accesso: si usa anche dalla landing. */
export function inviaMessaggio(dati: { email: string; argomento: Argomento; messaggio: string; sito: string }) {
  return fetch(`${API_URL}/contatto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...dati, browser: descriviBrowser() }),
  });
}
