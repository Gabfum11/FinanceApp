//Su iPhone un sito non puo' installarsi da solo: si puo' solo spiegare come
//aggiungerlo alla Home. Su Android non lo proponiamo: c'e' l'app nativa,
//piu' completa (notifiche, accesso con Google).
//
//Il sito viene anche pre-generato durante la build, dove navigator e window
//non esistono: ogni controllo li verifica prima di usarli.

function suIphone(): boolean {
  if (typeof navigator === "undefined") return false;
  //iPadOS si presenta come un Mac: lo tradisce lo schermo touch
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

//aperta dall'icona sulla Home: non c'e' piu' niente da aggiungere
function giaAggiunta(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function puoAggiungereAllaHome(): boolean {
  return suIphone() && !giaAggiunta();
}
