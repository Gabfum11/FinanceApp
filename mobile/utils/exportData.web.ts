import i18n from "@/utils/i18n";
import { apiFetch } from "@/utils/apiFetch";

// Versione per il browser di exportData.ts: stessa funzione e stessi esiti,
// cosi' il profilo non cambia. Nel browser non c'e' un file system del telefono
// ne', su molti computer, il pannello di condivisione: il CSV si scarica.
// Sul computer finisce in Download, su iPhone Safari chiede dove salvarlo.

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
    const response = await apiFetch(`/export/${tipo}.csv`);
    if (!response.ok) {
      console.error("[export] risposta del server:", response.status);
      return { esito: "errore", messaggio: i18n.t("esportazione.errore") };
    }

    const contenuto = await response.text();
    if (contenuto.trim().split("\n").length <= 1) {
      return { esito: "vuoto" };
    }

    const oggi = new Date().toISOString().slice(0, 10);
    const url = URL.createObjectURL(new Blob([contenuto], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `trackit-${i18n.t(NOMI[tipo])}-${oggi}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    //revocato dopo un attimo: subito, alcuni browser annullerebbero il download
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    return { esito: "ok" };
  } catch (errore) {
    console.error("[export] esportazione fallita:", errore);
    return { esito: "errore", messaggio: i18n.t("esportazione.erroreGenerico") };
  }
}
