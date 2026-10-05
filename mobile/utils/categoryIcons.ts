// Le icone stanno sui gruppi, non sulle 46 sottocategorie: a 20px "Bolletta
// acqua" e "Bolletta energia" sarebbero indistinguibili, mentre il gruppo ha
// un significato visivo netto. La sottocategoria resta nel testo.
//
// I nomi sono di MaterialCommunityIcons, già usato altrove nell'app.
const ICONE_GRUPPO: Record<string, string> = {
  "Acquisti": "shopping-outline",
  "Altro": "dots-horizontal",
  "Animali": "paw-outline",
  "Casa": "home-outline",
  "Cibo e bevande": "silverware-fork-knife",
  "Cura personale": "content-cut",
  "Famiglia": "account-child-outline",
  "Salute": "medical-bag",
  "Sport": "dumbbell",
  "Svago": "movie-open-outline",
  "Trasporti": "car-outline",
  "Viaggi": "airplane",
};

const ICONA_PREDEFINITA = "tag-outline";

/** Icona del gruppo indicato. Un gruppo sconosciuto ricade sulla predefinita. */
export function iconaPerGruppo(nomeGruppo: string | null | undefined): string {
  if (!nomeGruppo) return ICONA_PREDEFINITA;
  return ICONE_GRUPPO[nomeGruppo] ?? ICONA_PREDEFINITA;
}

// Ogni gruppo ha il suo colore nelle statistiche, sempre lo stesso: prima il
// colore andava per posizione (la categoria piu' spesa era verde), quindi Sport
// poteva essere verde un mese e blu quello dopo, e confrontare due mesi era
// difficile. Altro e' grigio scuro: e' la voce "senza colore", ma deve restare
// ben distinta dal grigio chiaro della parte non spesa.
const COLORI_GRUPPO: Record<string, string> = {
  "Sport": "#2ECC71",
  "Acquisti": "#F5C518",
  "Salute": "#3478E0",
  "Cibo e bevande": "#E74C3C",
  "Trasporti": "#9B59B6",
  "Svago": "#1ABC9C",
  "Casa": "#E67E22",
  "Cura personale": "#EC6FA6",
  "Viaggi": "#00B4D8",
  "Famiglia": "#A0785A",
  "Animali": "#A3B518",
  "Altro": "#6B7280",
};

/** Colore del gruppo nelle statistiche. Un gruppo sconosciuto prende quello di Altro. */
export function colorePerGruppo(nomeGruppo: string | null | undefined): string {
  if (!nomeGruppo) return COLORI_GRUPPO["Altro"];
  return COLORI_GRUPPO[nomeGruppo] ?? COLORI_GRUPPO["Altro"];
}
