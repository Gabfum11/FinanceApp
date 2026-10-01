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
  if (data.toDateString() === oggi.toDateString()) return "Oggi";
  if (data.toDateString() === ieri.toDateString()) return "Ieri";
  return data.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    //una spesa di un altro anno non deve sembrare di quest'anno
    ...(data.getFullYear() !== oggi.getFullYear() && { year: "numeric" }),
  });
}
