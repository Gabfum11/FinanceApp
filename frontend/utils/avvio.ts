//sul telefono non c'e' una pagina pre-generata da nascondere: la versione per
//il browser e' avvio.web.ts. Qui le stesse funzioni, che non fanno niente
export const ID_COPERTURA = "avvio-nascosto";

export function segnaTemaPronto() {}

export function segnaPaginaPronta() {}

//l'app nativa si apre sempre dall'icona
export function apertaDallaHome(): boolean {
  return true;
}
