import i18n from "@/utils/i18n";

// Il server risponde con messaggi fissi (in inglese o in italiano, scritti prima
// che l'app avesse le lingue): qui diventano testi nella lingua dell'utente.
// Un messaggio che non e' in elenco si mostra cosi' com'e': meglio un testo
// vero in un'altra lingua che uno generico che nasconde il problema.
const NOTI: Record<string, string> = {
  "Invalid credentials": "errori.credenziali",
  "User not verified": "errori.nonVerificato",
  "User not active": "errori.nonAttivo",
  "Invalid code": "errori.codiceNonValido",
  "code Expired": "errori.codiceScaduto",
  "Too many attempts": "errori.troppiTentativi",
  "Email already registered": "errori.emailRegistrata",
  "Current password is incorrect": "errori.passwordAttuale",
  "Could not reset password": "errori.resetNonRiuscito",
  "Questo account accede con Google e non ha una password": "errori.soloGoogle",
  "Troppe richieste in questo momento. Riprova tra qualche istante.": "errori.troppeRichieste",
  "Non sono riuscito a capire la spesa": "errori.nonCapito",
  "Il prossimo addebito deve essere una data futura": "errori.dataFutura",
  "Exchange rate unavailable": "errori.cambio",
  "Expense not found": "errori.nonTrovato",
  "Subscription not found": "errori.nonTrovato",
  "Category not found": "errori.nonTrovato",
};

/** Il testo da mostrare per il detail di un errore del server. */
export function traduciErrore(detail: string | null | undefined, predefinito: string): string {
  if (!detail) return predefinito;
  if (NOTI[detail]) return i18n.t(NOTI[detail]);
  //contiene un numero che cambia: si riconosce dall'inizio
  if (detail.startsWith("Troppi rinnovi")) return i18n.t("errori.troppiRinnovi");
  return detail;
}

//il detail di FastAPI è una stringa per gli errori nostri, ma con un 422 di
//validazione è un array di oggetti: messo nello Snackbar fa crashare l'app
export async function messaggioErrore(response: Response, predefinito: string): Promise<string> {
  //il limite di richieste (slowapi) risponde senza detail
  if (response.status === 429) return i18n.t("errori.troppeRichieste");
  const detail = await response
    .json()
    .then((body) => (typeof body?.detail === "string" ? body.detail : null))
    .catch(() => null);
  return traduciErrore(detail, predefinito);
}
