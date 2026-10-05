//sull'app nativa l'icona c'e' gia': l'invito ad aggiungerla esiste solo nel
//browser, in aggiuntaHome.web.ts. Expo sceglie il file in base alla piattaforma.
//Qui le stesse funzioni, tutte "no": servono anche al controllo dei tipi
export type Procedura = "safari26" | "safari" | "generica";

export function puoAggiungereAllaHome(): boolean {
  return false;
}

export function procedura(): Procedura {
  return "generica";
}

export function sottoBarraGalleggiante(): boolean {
  return false;
}

export function ascoltaInstallazione(_ascolta: () => void): () => void {
  return () => {};
}

export function installazioneDiretta(): boolean {
  return false;
}

export async function installa(): Promise<boolean> {
  return false;
}
