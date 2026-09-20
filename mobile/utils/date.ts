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