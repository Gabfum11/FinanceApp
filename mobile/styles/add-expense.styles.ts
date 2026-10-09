import { StyleSheet } from "react-native";
import { type Colori, cardShadow, floatingShadow, radius, scrim, fontSize, fontWeight } from "./tokens";

// Alias locali sui token condivisi: i nomi restano quelli usati nella
// schermata, ma i valori vengono da un posto solo.
// Il blu del tastierino è specifico di qui: serve a non competere col verde,
// riservato all'importo e al pulsante di salvataggio.
export const coloriSpesa = (tokens: Colori) => ({
  background: tokens.background,
  surface: tokens.surface,
  green: tokens.primary,
  darkGreen: tokens.primaryDark,
  keypadText: tokens.keypad,
  label: tokens.textMuted,
  placeholder: tokens.textDisabled,
  border: tokens.border,
  chevron: tokens.chevron,
  disabled: tokens.disabled,
  disabledText: tokens.disabledText,
  text: tokens.text,
  textSecondary: tokens.textSecondary,
  surfaceAlt: tokens.surfaceAlt,
  primarySoft: tokens.primarySoft,
  error: tokens.dangerDark,
});

export const creaStili = (tokens: Colori) => {
  const colors = coloriSpesa(tokens);
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pieno: {
    flex: 1,
  },
  //sul computer: la pagina resta dietro, scurita, e la spesa e' una finestra al centro
  velo: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: scrim,
    backdropFilter: "blur(6px)",
  },
  sfondoVelo: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  //non "flex: 0": sul web vuol dire base zero, e la finestra sparirebbe
  finestra: {
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: "auto",
    width: "100%",
    maxWidth: 560,
    maxHeight: "92%",
    borderRadius: 24,
    overflow: "hidden",
    ...cardShadow,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingTop: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontWeight: fontWeight.bold,
  },
  // stessa larghezza dell'IconButton di sinistra, così il titolo resta centrato
  headerSpacer: {
    width: 48,
  },

  scrollContent: {
    paddingBottom: 24,
  },

  // selettore Spesa / Abbonamento: entrambe le opzioni restano visibili,
  // così la modalità corrente si legge senza doverla dedurre
  segmented: {
    flexDirection: "row",
    alignSelf: "center",
    marginTop: 8,
    padding: 4,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
  },
  segment: {
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 9,
  },
  segmentSelected: {
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  segmentLabel: {
    fontSize: fontSize.md,
    color: colors.label,
    //peso costante: in grassetto il testo e' piu' largo e i due segmenti
    //cambierebbero larghezza a vicenda a ogni cambio di selezione
    fontWeight: fontWeight.semibold,
  },
  segmentLabelSelected: {
    color: colors.darkGreen,
  },

  frequencyRow: {
    flexDirection: "row",
    gap: 8,
  },
  frequencyChip: {
    flex: 1,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  frequencyChipSelected: {
    borderColor: colors.green,
    backgroundColor: colors.primarySoft,
  },
  frequencyLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  frequencyLabelSelected: {
    color: colors.darkGreen,
    fontWeight: fontWeight.bold,
  },
  autoRenewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  autoRenewText: {
    flex: 1,
  },
  autoRenewLabel: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  autoRenewHint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  amountSection: {
    alignItems: "center",
    paddingVertical: 24,
  },
  amountLabel: {
    color: colors.label,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  currency: {
    color: colors.green,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    marginRight: 4,
  },
  amountValue: {
    color: colors.text,
    fontSize: fontSize.hero,
    fontWeight: fontWeight.bold,
  },
  cursor: {
    width: 2,
    height: 40,
    backgroundColor: colors.green,
    marginLeft: 4,
  },
  amountUnderline: {
    height: 2,
    width: 150,
    backgroundColor: colors.green,
    marginTop: 6,
    borderRadius: 1,
  },
  // fuori focus la riga resta come affordance, ma smette di segnalare "stai digitando"
  amountUnderlineBlurred: {
    backgroundColor: colors.border,
  },

  fields: {
    paddingHorizontal: 20,
    gap: 14,
  },
  fieldLabel: {
    color: colors.textSecondary,
    marginBottom: 6,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
  },
  fieldText: {
    flex: 1,
    color: colors.text,
  },
  fieldPlaceholder: {
    flex: 1,
    color: colors.placeholder,
  },
  // il TextInput nativo ha padding verticale proprio: lo azzeriamo per allinearlo
  descriptionInput: {
    flex: 1,
    paddingVertical: 0,
    color: colors.text,
  },

  saveButton: {
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.green,
  },
  saveButtonDisabled: {
    backgroundColor: colors.disabled,
  },
  saveButtonText: {
    color: colors.surface,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.base,
  },
  saveButtonTextDisabled: {
    color: colors.disabledText,
  },

  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: colors.background,
    paddingBottom: 8,
  },
  key: {
    width: "33.333%",
    height: 58,
    alignItems: "center",
    justifyContent: "center",
  },
  keyPressed: {
    opacity: 0.4,
  },
  keyText: {
    fontSize: fontSize.xxl,
    color: colors.keypadText,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: scrim,
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 28,
    overflow: "hidden",
    maxHeight: "75%", //con 59 voci un foglio basso obbligherebbe a scorrere troppo
  },
  modalOverlayLargo: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalSheetLargo: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "80%",
    borderRadius: 24,
    paddingTop: 12,
    paddingBottom: 12,
  },
  //segno grafico del foglio che sale dal basso
  maniglia: {
    alignSelf: "center",
    width: 36,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.chevron,
    marginBottom: 8,
  },
  //titolo a sinistra, chiusura a destra: senza la X l'unico modo per uscire
  //era toccare il velo scuro, che non tutti scoprono
  modalIntestazione: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 20,
    paddingRight: 12,
    paddingBottom: 8,
  },
  modalTitle: {
    fontWeight: fontWeight.bold,
    fontSize: fontSize.lg,
    color: colors.text,
  },
  //44px: la X e' piccola, ma il bersaglio per il dito no
  modalChiudi: {
    margin: 0,
    width: 44,
    height: 44,
  },
  //intestazione di gruppo: deve leggersi come etichetta, non come voce da toccare
  categoryGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  categoryGroupTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.label,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingLeft: 32, //rientro: distingue la voce dall'intestazione del gruppo
    paddingRight: 20,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  categoryRowText: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.text,
  },
  //la voce gia' scelta: sfondo tenue e spunta, non solo il testo colorato
  categoryRowScelta: {
    backgroundColor: colors.primarySoft,
  },
  categoryRowPremuta: {
    backgroundColor: colors.surfaceAlt,
  },
  categoryRowSelected: {
    color: colors.darkGreen,
    fontWeight: fontWeight.bold,
  },
  errorText: {
    color: colors.error,
    textAlign: "center",
    marginTop: 12,
    paddingHorizontal: 20,
  },
  //il simbolo si tocca per cambiare valuta: la freccia lo fa capire
  valutaTocco: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingRight: 2,
  },
  //menu della valuta: card con angoli e ombra dell'app, non il rettangolo di Paper
  menu: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    ...floatingShadow,
  },
  menuVoce: {
    minHeight: 44,
    marginHorizontal: 6,
    borderRadius: radius.sm,
  },
  menuVoceScelta: {
    backgroundColor: colors.primarySoft,
  },
  menuTesto: {
    fontSize: fontSize.md,
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  menuTestoScelto: {
    fontWeight: fontWeight.bold,
    color: colors.darkGreen,
  },
  anteprima: {
    marginTop: 10,
    color: colors.label,
    fontSize: fontSize.md,
  },
  anteprimaErrore: {
    marginTop: 10,
    color: colors.error,
    fontSize: fontSize.sm,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  convertitoInput: {
    flex: 1,
    fontSize: fontSize.base,
    paddingVertical: 0,
  },
});
};
