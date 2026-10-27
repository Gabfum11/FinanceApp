//nel browser non c'e' un archivio cifrato: localStorage e' la scelta comune
//per le web app. try/catch perche' in navigazione privata puo' non funzionare
export async function leggi(chiave: string): Promise<string | null> {
  try {
    return localStorage.getItem(chiave);
  } catch {
    return null;
  }
}

export async function scrivi(chiave: string, valore: string): Promise<void> {
  try {
    localStorage.setItem(chiave, valore);
  } catch {}
}

export async function cancella(chiave: string): Promise<void> {
  try {
    localStorage.removeItem(chiave);
  } catch {}
}
