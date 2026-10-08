// Ogni gruppo ha la sua icona, e anche le sottocategorie che si riconoscono a
// colpo d'occhio. Le voci "(generico)" e quelle non elencate qui prendono
// l'icona del gruppo.
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
  "Svago": "party-popper",
  "Trasporti": "car-outline",
  "Viaggi": "airplane",
};

// La chiave e' il nome italiano che arriva dal database, come per i gruppi
const ICONE_CATEGORIA: Record<string, string> = {
  "Spesa alimentare": "cart-outline",
  "Pranzi e cene": "food-fork-drink",
  "Bar e caffè": "coffee-outline",
  "Abbigliamento": "tshirt-crew-outline",
  "Scarpe": "shoe-sneaker",
  "Tecnologia": "cellphone-link",
  "Regali": "gift-outline",
  "Tabacchi": "smoking",
  "Carburante": "gas-station",
  "Mezzi pubblici": "bus",
  "Automobile": "car-wrench",
  "Assicurazione auto": "shield-car",
  "Parcheggi e pedaggi": "parking",
  "Affitto o mutuo": "key-variant",
  "Bolletta energia": "lightning-bolt-outline",
  "Bolletta acqua": "water-outline",
  "Bolletta rifiuti": "trash-can-outline",
  "Internet e telefono": "wifi",
  "Spese condominiali": "office-building-outline",
  "Visite mediche": "stethoscope",
  "Farmacia": "pill",
  "Parrucchiere": "hair-dryer-outline",
  "Estetista": "lipstick",
  "Libri e giornali": "book-open-variant",
  "Cinema e spettacoli": "movie-open-outline",
  "Abbonamenti digitali": "play-box-outline",
  "Palestra": "weight-lifter",
  "Attrezzatura sportiva": "basketball",
  "Alloggio": "bed-outline",
  "Trasporti viaggio": "train-car",
  "Bambini": "baby-face-outline",
  "Istruzione": "school-outline",
  "Cibo animali": "food-drumstick-outline",
  "Veterinario": "dog",
};

const ICONA_PREDEFINITA = "tag-outline";

/** Icona del gruppo indicato. Un gruppo sconosciuto ricade sulla predefinita. */
export function iconaPerGruppo(nomeGruppo: string | null | undefined): string {
  if (!nomeGruppo) return ICONA_PREDEFINITA;
  return ICONE_GRUPPO[nomeGruppo] ?? ICONA_PREDEFINITA;
}

/** Icona della sottocategoria; se non ne ha una propria, quella del suo gruppo. */
export function iconaPerCategoria(
  nomeCategoria: string | null | undefined,
  nomeGruppo: string | null | undefined,
): string {
  if (nomeCategoria && ICONE_CATEGORIA[nomeCategoria]) return ICONE_CATEGORIA[nomeCategoria];
  return iconaPerGruppo(nomeGruppo);
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
