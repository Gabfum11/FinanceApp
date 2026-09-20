import { StyleSheet } from "react-native";

// Palette della schermata: il verde resta riservato all'importo e al CTA,
// i tasti del tastierino usano il blu scuro per non competere con essi.
export const colors = {
  background: "#F9F9F9",
  surface: "#FFFFFF",
  green: "#2ECC71",
  darkGreen: "#1B4332",
  keypadText: "#1B3A6B",
  label: "#8A8A8E",
  placeholder: "#A9A9AE",
  border: "#E5E5EA",
  disabled: "#DCDCE0",
  disabledText: "#9A9AA0",
};

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    backgroundColor: "#EFEFF2",
  },
  segment: {
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 9,
  },
  segmentSelected: {
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentLabel: {
    fontSize: 14,
    color: colors.label,
  },
  segmentLabelSelected: {
    color: colors.darkGreen,
    fontWeight: "700",
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
    backgroundColor: "#EAF9F0",
  },
  frequencyLabel: {
    fontSize: 14,
    color: "#3A3A3C",
  },
  frequencyLabelSelected: {
    color: colors.darkGreen,
    fontWeight: "700",
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
    color: "#111111",
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
    color: "#3A3A3C",
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
    color: "#111111",
  },
  fieldPlaceholder: {
    flex: 1,
    color: colors.placeholder,
  },
  // il TextInput nativo ha padding verticale proprio: lo azzeriamo per allinearlo
  descriptionInput: {
    flex: 1,
    paddingVertical: 0,
    color: "#111111",
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
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 28,
    maxHeight: "60%",
  },
  modalTitle: {
    fontWeight: "700",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  categoryRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  categoryRowText: {
    fontSize: 16,
    color: "#111111",
  },
  categoryRowSelected: {
    color: colors.green,
    fontWeight: "700",
  },
  errorText: {
    color: "#C0392B",
    textAlign: "center",
    marginTop: 12,
    paddingHorizontal: 20,
  },
});
