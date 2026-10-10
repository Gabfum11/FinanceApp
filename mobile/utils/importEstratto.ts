import { Platform } from "react-native";
import { apiFetch } from "@/utils/apiFetch";

// L'import dell'estratto conto parla con tre chiamate del backend
// (backend/app/routers/import_estratto.py): qui stanno i tipi delle risposte
// e le funzioni che le fanno, cosi' la schermata pensa solo a cosa mostrare.

export type Messaggio =
  | "categoria"
  | "rimborso_parziale"
  | "rimborso_totale"
  | "doppione"
  | "abbonamento"
  | "non_spesa";

export type RigaImport = {
  indice: number;
  /** AAAA-MM-GG */
  data: string;
  /** testo originale della banca: si vede solo nel foglio di modifica */
  testo: string;
  /** chiave dell'esercente: le righe con la stessa chiave sono "le altre spese di" */
  esercente: string;
  nome: string;
  importo: number;
  /** prezzo pieno, solo se un rimborso parziale ha ridotto l'importo */
  importo_originale: number | null;
  categoria_id: number | null;
  categoria_nome: string | null;
  categoria_gruppo: string | null;
  messaggio: Messaggio | null;
  rimborso_data: string | null;
  rimborso_importo: number | null;
  selezionata: boolean;
};

export type Anteprima = { codice: string; dal: string; al: string; righe: RigaImport[] };

export type ErroreImport =
  | "non_riconosciuto"
  | "troppo_grande"
  | "troppe_righe"
  | "valuta"
  | "nessuna_uscita"
  | "rete"
  | "lento";

const ERRORI_DEL_SERVER = new Set(["non_riconosciuto", "troppe_righe", "valuta", "nessuna_uscita"]);

/** Apre il selettore di file del browser. null = chiuso senza scegliere. */
export function scegliFile(): Promise<File | null> {
  return new Promise((resolve) => {
    //l'app e' solo web: sul telefono nativo il selettore non c'e'
    if (Platform.OS !== "web") {
      resolve(null);
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    //niente accept: sul telefono i file arrivati da WhatsApp o dalla mail
    //possono avere un tipo generico e il filtro li nasconderebbe. Un file
    //sbagliato lo scarta comunque il server con "non_riconosciuto"
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.addEventListener("cancel", () => resolve(null));
    input.click();
  });
}

/** Rilancia l'errore se la richiesta e' stata annullata: chi chiama lo ignora. */
export async function chiediAnteprima(file: File, segnale: AbortSignal): Promise<Anteprima | ErroreImport> {
  const corpo = new FormData();
  corpo.append("file", file);
  let risposta: Response;
  try {
    risposta = await apiFetch("/import/anteprima", { method: "POST", body: corpo, signal: segnale });
  } catch (errore) {
    if (segnale.aborted) throw errore;
    return "rete";
  }
  if (risposta.ok) return (await risposta.json()) as Anteprima;
  if (risposta.status === 413) return "troppo_grande";
  const dettaglio = (await risposta.json().catch(() => null))?.detail;
  return typeof dettaglio === "string" && ERRORI_DEL_SERVER.has(dettaglio)
    ? (dettaglio as ErroreImport)
    : "non_riconosciuto";
}

export async function confermaImport(codice: string, righe: RigaImport[]): Promise<number | null> {
  const scelte = righe
    .filter((r) => r.selezionata && r.categoria_id !== null)
    .map((r) => ({
      data: r.data,
      importo: r.importo,
      //lo stesso tetto del server: un nome piu' lungo farebbe fallire tutto l'import
      descrizione: r.nome.trim().slice(0, 100),
      categoria_id: r.categoria_id,
      testo_banca: r.testo.slice(0, 300),
    }));
  try {
    const risposta = await apiFetch("/import/conferma", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codice, righe: scelte }),
    });
    if (!risposta.ok) return null;
    return (await risposta.json()).importate as number;
  } catch {
    return null;
  }
}

export async function annullaImport(codice: string): Promise<boolean> {
  try {
    const risposta = await apiFetch(`/import/${codice}`, { method: "DELETE" });
    return risposta.ok;
  } catch {
    return false;
  }
}

/** Le righe che bloccano "Importa": selezionate ma ancora senza categoria. */
export function daScegliere(righe: RigaImport[]): RigaImport[] {
  return righe.filter((r) => r.selezionata && r.categoria_id === null);
}
