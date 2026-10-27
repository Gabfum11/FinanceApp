import i18n from "@/utils/i18n";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { apiFetch } from "@/utils/apiFetch";

// L'esportazione risponde al diritto di portabilità (art. 20 GDPR) oltre che
// all'uso pratico: i dati devono poter uscire dall'app in un formato leggibile.
//
// Il CSV arriva già formattato dal server (separatore ";", BOM per Excel):
// qui lo si salva in cache e si apre il pannello di condivisione, da cui
// l'utente sceglie dove mandarlo.

export type RisultatoEsportazione =
  | { esito: "ok" }
  | { esito: "vuoto" }
  | { esito: "errore"; messaggio: string };

type Tipo = "expenses" | "subscriptions";

//nome del file e titolo nella lingua dell'utente
const NOMI: Record<Tipo, string> = {
  expenses: "esportazione.spese",
  subscriptions: "esportazione.abbonamenti",
};

export async function esportaCsv(tipo: Tipo): Promise<RisultatoEsportazione> {
  try {
    if (!(await Sharing.isAvailableAsync())) {
      return { esito: "errore", messaggio: i18n.t("esportazione.nonDisponibile") };
    }

    //apiFetch e non fetch: il token di accesso dura pochi minuti, e senza il
    //rinnovo automatico l'esportazione fallirebbe dopo ogni pausa
    const response = await apiFetch(`/export/${tipo}.csv`);
    if (!response.ok) {
      //401 = sessione scaduta, 404 = rotta assente, 500 = errore del server:
      //a schermo il messaggio resta uno solo, nei log si distinguono
      console.error("[export] risposta del server:", response.status);
      return { esito: "errore", messaggio: i18n.t("esportazione.errore") };
    }

    const contenuto = await response.text();
    //solo l'intestazione: senza questo controllo l'utente condividerebbe
    //un file vuoto senza capire perché
    if (contenuto.trim().split("\n").length <= 1) {
      return { esito: "vuoto" };
    }

    const oggi = new Date().toISOString().slice(0, 10);
    const file = new File(Paths.cache, `trackit-${i18n.t(NOMI[tipo])}-${oggi}.csv`);
    //la cache si svuota da sola: il file non resta a occupare spazio
    if (file.exists) file.delete();
    file.create();
    file.write(contenuto);

    await Sharing.shareAsync(file.uri, {
      mimeType: "text/csv",
      dialogTitle: i18n.t("esportazione.titolo", { cosa: i18n.t(NOMI[tipo]) }),
      UTI: "public.comma-separated-values-text", //serve su iOS
    });

    return { esito: "ok" };
  } catch (errore) {
    //il messaggio a schermo resta generico, ma la causa va lasciata nei log:
    //senza, ogni problema diverso sembra lo stesso all'utente e a chi sviluppa
    console.error("[export] esportazione fallita:", errore);
    return { esito: "errore", messaggio: i18n.t("esportazione.erroreGenerico") };
  }
}
