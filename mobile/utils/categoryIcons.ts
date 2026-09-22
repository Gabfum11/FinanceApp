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
