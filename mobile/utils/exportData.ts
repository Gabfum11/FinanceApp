import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "@/config";

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

const NOMI: Record<Tipo, string> = {
  expenses: "spese",
  subscriptions: "abbonamenti",
};

export async function esportaCsv(tipo: Tipo): Promise<RisultatoEsportazione> {
  try {
    if (!(await Sharing.isAvailableAsync())) {
      return { esito: "errore", messaggio: "Condivisione non disponibile su questo dispositivo." };
    }

    const token = await SecureStore.getItemAsync("token");
    const response = await fetch(`${API_URL}/export/${tipo}.csv`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      //401 = sessione scaduta, 404 = rotta assente, 500 = errore del server:
      //a schermo il messaggio resta uno solo, nei log si distinguono
      console.error("[export] risposta del server:", response.status);
      return { esito: "errore", messaggio: "Non è stato possibile esportare i dati. Riprova." };
    }

    const contenuto = await response.text();
    //solo l'intestazione: senza questo controllo l'utente condividerebbe
    //un file vuoto senza capire perché
    if (contenuto.trim().split("\n").length <= 1) {
      return { esito: "vuoto" };
    }

    const oggi = new Date().toISOString().slice(0, 10);
    const file = new File(Paths.cache, `trackit-${NOMI[tipo]}-${oggi}.csv`);
    //la cache si svuota da sola: il file non resta a occupare spazio
    if (file.exists) file.delete();
    file.create();
    file.write(contenuto);

    await Sharing.shareAsync(file.uri, {
      mimeType: "text/csv",
      dialogTitle: `Esporta ${NOMI[tipo]}`,
      UTI: "public.comma-separated-values-text", //serve su iOS
    });

    return { esito: "ok" };
  } catch (errore) {
    //il messaggio a schermo resta generico, ma la causa va lasciata nei log:
    //senza, ogni problema diverso sembra lo stesso all'utente e a chi sviluppa
    console.error("[export] esportazione fallita:", errore);
    return { esito: "errore", messaggio: "Errore durante l'esportazione. Riprova." };
  }
}
