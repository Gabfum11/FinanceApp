// La pagina principale arriva gia' scritta nell'HTML (la landing), cosi' Google
// e chi visita per la prima volta la vedono subito. Ma a chi ha gia' fatto
// l'accesso, a chi apre TrackIt dall'icona sulla Home e a chi usa il tema scuro
// la landing non va mostrata: lo script in +html.tsx la nasconde prima che
// compaia, e qui la si fa riapparire quando l'app ha deciso cosa mostrare.
//
// Servono due conferme, che arrivano in ordine qualsiasi:
// - il tema letto e applicato (TemaProvider), o si vedrebbe un lampo chiaro
// - la pagina giusta sullo schermo (la landing confermata, o un'altra schermata)

//stesso id dello script in +html.tsx
export const ID_COPERTURA = "avvio-nascosto";

let temaPronto = false;
let paginaPronta = false;

function mostra() {
  if (!temaPronto || !paginaPronta) return;
  document.getElementById(ID_COPERTURA)?.remove();
}

export function segnaTemaPronto() {
  temaPronto = true;
  mostra();
}

export function segnaPaginaPronta() {
  paginaPronta = true;
  mostra();
}

//aperta dall'icona sulla Home (PWA installata) e non da una scheda del browser
export function apertaDallaHome(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
