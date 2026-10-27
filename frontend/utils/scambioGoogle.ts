import { salvaSessione } from "@/utils/session";
import { API_URL } from "@/config";
import i18n from "@/utils/i18n";
import { traduciErrore } from "@/utils/messaggioErrore";

// Il token di Google non è il nostro: lo scambiamo con un token dell'app.
// Comune all'app e al browser, che ottengono l'id_token in modi diversi.
// Restituisce null se è andato tutto bene, altrimenti il messaggio da mostrare.
export async function scambiaTokenGoogle(idToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: idToken, remember_me: true }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      console.error("[google] scambio token rifiutato:", res.status, body);
      return traduciErrore(typeof body?.detail === "string" ? body.detail : null, i18n.t("google.nonRiuscito"));
    }

    const data = await res.json();
    await salvaSessione(data);
    return null;
  } catch (errore) {
    console.error("[google] rete non raggiungibile:", API_URL, errore);
    return i18n.t("errori.rete");
  }
}
