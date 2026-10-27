import i18n from "@/utils/i18n";
import { localeDi, eLingua } from "@/utils/formato";

// Date -> "YYYY-MM-DD", leggendo i componenti in locale
export function toDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0"); // getMonth() è zero-based
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// "YYYY-MM-DD" -> Date, costruita in locale (non tramite parsing ISO)
export function fromDateString(s: string): Date {
  const [year, month, day] = s.split("-").map(Number);
  return new Date(year, month - 1, day); // il costruttore vuole il mese zero-based
}
//solo la data: l'orario disponibile era quello di registrazione
//(created_at), non quello della spesa, e confondeva
export function formatDataSpesa(dateString: string): string {
  const data = fromDateString(dateString);
  const oggi = new Date();
  const ieri = new Date();
  ieri.setDate(oggi.getDate() - 1);
  if (data.toDateString() === oggi.toDateString()) return i18n.t("comune.oggi");
  if (data.toDateString() === ieri.toDateString()) return i18n.t("comune.ieri");
  return data.toLocaleDateString(localeAttuale(), {
    day: "numeric",
    month: "short",
    //una spesa di un altro anno non deve sembrare di quest'anno
    ...(data.getFullYear() !== oggi.getFullYear() && { year: "numeric" }),
  });
}

//intestazione di un giorno nell'elenco delle spese: "Oggi", "Ieri" o la data
//per esteso con il giorno della settimana, che aiuta a ritrovare una spesa
export function intestazioneGiorno(dateString: string): string {
  const data = fromDateString(dateString);
  const oggi = new Date();
  const ieri = new Date();
  ieri.setDate(oggi.getDate() - 1);
  if (data.toDateString() === oggi.toDateString()) return i18n.t("comune.oggi");
  if (data.toDateString() === ieri.toDateString()) return i18n.t("comune.ieri");
  return data.toLocaleDateString(localeAttuale(), {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(data.getFullYear() !== oggi.getFullYear() && { year: "numeric" }),
  });
}

//la lingua scelta dall'utente, per le date scritte per esteso
export function localeAttuale(): string {
  return localeDi(eLingua(i18n.language) ? i18n.language : "it");
}
