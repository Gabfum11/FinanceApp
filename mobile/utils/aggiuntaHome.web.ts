//Invito ad aggiungere il sito alla Home, sui telefoni e sui tablet.
//
//Su iPhone un sito non puo' installarsi da solo: si spiegano i passi di Safari.
//Su Android Chrome puo' installarlo con un tocco, quando decide che il sito e'
//installabile: lo annuncia con l'evento beforeinstallprompt, che si conserva
//qui per usarlo quando l'utente tocca Installa.
//
//Il sito viene anche pre-generato durante la build, dove navigator e window
//non esistono: ogni controllo li verifica prima di usarli.

/** Come spiegare l'aggiunta: passi di Safari nuovo o vecchio, oppure il messaggio per tutti. */
export type Procedura = "safari26" | "safari" | "generica";

function suIos(): boolean {
  if (typeof navigator === "undefined") return false;
  //iPadOS si presenta come un Mac: lo tradisce lo schermo touch
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function suTelefonoOTablet(): boolean {
  if (typeof navigator === "undefined") return false;
  return suIos() || /Android/.test(navigator.userAgent);
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
  return suTelefonoOTablet() && !giaAggiunta();
}

/** I passi da mostrare. Gli altri browser per iPhone (Chrome, Firefox) hanno
 *  menu propri: per loro, come su Android, vale il messaggio per tutti. */
export function procedura(): Procedura {
  if (typeof navigator === "undefined" || !suIos()) return "generica";
  const ua = navigator.userAgent;
  if (/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)) return "generica";
  //da iOS 26 il sistema dice sempre "iPhone OS 18": la versione vera e'
  //quella di Safari ("Version/26.0"). Con Safari 26 Condividi e' dentro ···
  const versione = /Version\/(\d+)/.exec(ua);
  if (!versione) return "generica";
  return Number(versione[1]) >= 26 ? "safari26" : "safari";
}

/** La barra di Safari 26 galleggia sopra il fondo della pagina: l'invito va
 *  messo piu' in alto, o finirebbe coperto. */
export function sottoBarraGalleggiante(): boolean {
  return procedura() === "safari26";
}

type EventoInstallazione = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let eventoInstallazione: EventoInstallazione | null = null;
const ascoltatori = new Set<() => void>();
const avvisa = () => ascoltatori.forEach((ascolta) => ascolta());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (evento) => {
    //senza, Chrome mostrerebbe anche la sua barretta: due inviti uguali
    evento.preventDefault();
    eventoInstallazione = evento as EventoInstallazione;
    avvisa();
  });
  window.addEventListener("appinstalled", () => {
    eventoInstallazione = null;
    avvisa();
  });
}

/** Per useSyncExternalStore: avvisa quando l'installazione diretta diventa possibile. */
export function ascoltaInstallazione(ascolta: () => void): () => void {
  ascoltatori.add(ascolta);
  return () => {
    ascoltatori.delete(ascolta);
  };
}

/** Vero se il browser installa il sito con un tocco (Chrome su Android). */
export function installazioneDiretta(): boolean {
  return eventoInstallazione !== null;
}

/** Apre la richiesta di installazione del browser. L'evento vale una volta sola. */
export async function installa(): Promise<boolean> {
  const evento = eventoInstallazione;
  if (!evento) return false;
  eventoInstallazione = null;
  avvisa();
  await evento.prompt();
  const { outcome } = await evento.userChoice;
  return outcome === "accepted";
}
