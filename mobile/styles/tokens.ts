// Colori, spaziature e forme dell'app, in un posto solo.
//
// Prima erano scritti a mano in ogni file di stile: 56 valori distinti su 155
// occorrenze, con duplicati che dovevano essere lo stesso colore (due verdi
// chiari quasi identici, sei grigi diversi per il testo secondario).
// Da qui si cambia una volta e vale ovunque.

export const colors = {
  // --- marchio ---
  primary: "#2ECC71",
  primaryDark: "#1B4332",
  /** sfondo tenue per icone e chip selezionati */
  primarySoft: "#E8F8F0",
  accent: "#F5C518",

  // --- superfici ---
  background: "#F9F9F9",
  surface: "#FFFFFF",
  /** sfondo di intestazioni di sezione e controlli segmentati */
  surfaceAlt: "#F0F0F2",

  // --- testo ---
  text: "#1A1A1A",
  /** testo secondario ancora pienamente leggibile: sottotitoli, etichette di campo */
  textSecondary: "#3A3A3C",
  /** etichette, metadati, testo di supporto */
  textMuted: "#8A8A8E",
  /** testo disattivato e segnaposto */
  textDisabled: "#A9A9AE",
  textOnPrimary: "#FFFFFF",

  // --- bordi e separatori ---
  border: "#E5E5EA",
  /** chevron e icone decorative */
  chevron: "#C7C7CC",

  // --- superficie scura (card del saldo in home, intestazione assistente) ---
  /** sfondo scuro: stesso verde del marchio, usato in pieno */
  surfaceDark: "#1B4332",
  /** variante ancora piu' cupa, per i blocchi annidati dentro la card scura */
  surfaceDarker: "#1B2B22",
  /** testo principale sopra le superfici scure */
  textOnDark: "rgba(255,255,255,0.85)",
  /** etichette e metadati sopra le superfici scure */
  textOnDarkMuted: "rgba(255,255,255,0.6)",
  /** riquadri e separatori appena percettibili sopra le superfici scure */
  overlayLight: "rgba(255,255,255,0.2)",
  /** elementi in secondo piano sopra le superfici scure: le barre dei giorni
   *  diversi da oggi, che non devono competere con quella evidenziata */
  overlayMuted: "rgba(255,255,255,0.15)",
  overlayFaint: "rgba(255,255,255,0.04)",

  // --- avvisi (abbonamenti in scadenza) ---
  warning: "#F5C518",
  warningSurface: "#FFFDF3",
  warningBadge: "#FCECC0",
  warningText: "#B8860B",

  // --- stati ---
  /** collegamenti e indirizzi: distinto dal verde, che segnala un'azione */
  link: "#2A6FB8",

  /** importi in uscita, azioni distruttive */
  danger: "#E74C3C",
  dangerDark: "#C0392B",
  /** sfondo tenue dei messaggi di errore */
  dangerSoft: "#FDEAEA",
  /** sfondo tenue dei messaggi informativi (istruzioni via email) */
  infoSoft: "#FDF3E7",

  // --- componenti disabilitati ---
  disabled: "#DCDCE0",
  disabledText: "#9A9AA0",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 16,
  xl: 20,
  /** pillole e cerchi */
  pill: 999,
} as const;

/** Velo scuro dietro i fogli modali. */
export const scrim = "rgba(0,0,0,0.35)";

/** Ombra leggera delle card: prima era riscritta in ogni file di stile, con
 *  opacita' che andavano da 0.05 a 0.12 senza una ragione visibile. */
export const cardShadow = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 4,
  elevation: 2,
} as const;

/** Ombra marcata degli elementi flottanti, che devono staccarsi dal contenuto
 *  sottostante invece di appoggiarvisi. */
export const floatingShadow = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 8,
  elevation: 6,
} as const;
