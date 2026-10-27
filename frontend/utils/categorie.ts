import i18n from "@/utils/i18n";

// Le categorie arrivano dal database in italiano, ed e' giusto cosi': il nome
// e' anche la chiave con cui il server le riconosce e le parole chiave della
// categorizzazione sono italiane. Si traducono solo per mostrarle.
// Un nome che non e' nell'elenco (es. una categoria nuova) si mostra com'e'.
export function nomeCategoria(nome: string | null | undefined): string {
  if (!nome) return i18n.t("categorie.nonAssegnata");
  return i18n.t(`categorie.nomi.${nome}`, { defaultValue: nome });
}
