import { StyleSheet } from "react-native";
import { type Colori, cardShadow, scrim } from "./tokens";

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
    fontWeight: "700",
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
    fontSize: 14,
    color: colors.label,
    //peso costante: in grassetto il testo e' piu' largo e i due segmenti
    //cambierebbero larghezza a vicenda a ogni cambio di selezione
    fontWeight: "600",
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
    fontSize: 14,
    color: colors.textSecondary,
  },
  frequencyLabelSelected: {
    color: colors.darkGreen,
    fontWeight: "700",
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
    fontSize: 15,
    color: colors.text,
  },
  autoRenewHint: {
    fontSize: 12,
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
    fontSize: 26,
    fontWeight: "700",
    marginRight: 4,
  },
  amountValue: {
    color: colors.text,
    fontSize: 44,
    fontWeight: "700",
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
    fontWeight: "700",
    fontSize: 16,
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
    fontSize: 24,
    color: colors.keypadText,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: scrim,
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 28,
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
    borderRadius: 20,
    paddingBottom: 12,
  },
  modalTitle: {
    fontWeight: "700",
    paddingHorizontal: 20,
    paddingBottom: 8,
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
    fontSize: 12,
    fontWeight: "700",
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
    fontSize: 16,
    color: colors.text,
  },
  categoryRowSelected: {
    color: colors.green,
    fontWeight: "700",
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
  anteprima: {
    marginTop: 10,
    color: colors.label,
    fontSize: 14,
  },
  anteprimaErrore: {
    marginTop: 10,
    color: colors.error,
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  convertitoInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
});
};
