// Importi scritti in un modo solo, nella valuta e nella lingua dell'utente.
//
// Prima ogni schermata li scriveva a modo suo: "€412.50" nella home, "412,50 €"
// nelle notifiche del server. Le regole sono le stesse di
// backend/app/business_logic/formato.py, cosi' app e notifiche coincidono.
//
// Fatto a mano e non con Intl.NumberFormat: su Android il motore JavaScript
// (Hermes) non supporta tutte le opzioni di Intl, e un'opzione mancante
// manderebbe in errore la schermata.

//lo stesso tetto del server (le=1000000 in schemas.py) per spese, abbonamenti e
//budget: controllandolo qui l'utente legge un messaggio preciso invece di un 422
export const IMPORTO_MASSIMO = 1000000;

export const VALUTE = ["EUR", "USD", "GBP", "CHF"] as const;
export type Valuta = (typeof VALUTE)[number];

export const LINGUE = ["it", "en"] as const;
export type Lingua = (typeof LINGUE)[number];

const SIMBOLI: Record<Valuta, string> = { EUR: "€", USD: "$", GBP: "£", CHF: "CHF" };

//per toLocaleDateString: inglese britannico, con il giorno prima del mese come in italiano
export function localeDi(lingua: Lingua): string {
  return lingua === "en" ? "en-GB" : "it-IT";
}

export function eValuta(valore: unknown): valore is Valuta {
  return typeof valore === "string" && (VALUTE as readonly string[]).includes(valore);
}

export function eLingua(valore: unknown): valore is Lingua {
  return typeof valore === "string" && (LINGUE as readonly string[]).includes(valore);
}

export function simbolo(valuta: Valuta): string {
  return SIMBOLI[valuta];
}

//separa le migliaia con "separatore", da "soglia" in su
function raggruppa(intero: string, separatore: string, soglia: number): string {
  if (Number(intero) < soglia) return intero;
  return intero.replace(/\B(?=(\d{3})+(?!\d))/g, separatore);
}

export function formattaImporto(valore: number, valuta: Valuta = "EUR", lingua: Lingua = "it", decimali = 2): string {
  const s = simbolo(valuta);
  const [intero, parteDecimale] = Math.abs(valore).toFixed(decimali).split(".");
  //il segno meno tipografico, largo quanto le cifre: il trattino era piu' corto
  const segno = valore < 0 ? "−" : "";
  if (lingua === "en") {
    //1,234.50: virgola per le migliaia, punto per i decimali, simbolo davanti
    const numero = raggruppa(intero, ",", 1000) + (parteDecimale ? `.${parteDecimale}` : "");
    //un simbolo fatto di lettere (CHF) va staccato dal numero, uno grafico no
    return /^[A-Z]+$/.test(s) ? `${segno}${s} ${numero}` : `${segno}${s}${numero}`;
  }
  //in italiano le migliaia si separano solo da 10.000 in su: 1234,50 ma 12.345,00
  const numero = raggruppa(intero, ".", 10000) + (parteDecimale ? `,${parteDecimale}` : "");
  return `${segno}${numero} ${s}`;
}

//l'occhio della home nasconde le cifre ma lascia la valuta, al posto giusto
export function importoNascosto(valuta: Valuta = "EUR", lingua: Lingua = "it"): string {
  const s = simbolo(valuta);
  return lingua === "en" ? `${s} ••••` : `•••• ${s}`;
}
