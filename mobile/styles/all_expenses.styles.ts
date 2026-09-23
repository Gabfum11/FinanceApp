import { StyleSheet } from "react-native";
import { colors, cardShadow } from "./tokens";

export const styles = StyleSheet.create({
    container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 8,
    paddingTop:60
  },
  //stessa larghezza dell'IconButton, così il titolo resta centrato
  headerSpacer: {
    width: 48,
  },
  list: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
  },
  searchbar: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
  },
  searchbarInput: {
    fontSize: 15,
    minHeight: 0,
  },
  //la ScrollView orizzontale senza altezza esplicita si adatta al contenuto:
  //cambiando selezione il layout si riassesta e le righe sembrano dilatarsi
  chipScroll: {
    flexGrow: 0,
    flexShrink: 0,
    height: 46,
  },
  chipRow: {
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    //il peso resta invariato tra selezionato e non: il grassetto e' piu' largo
    //e farebbe cambiare larghezza al chip, spostando quelli accanto
    fontWeight: "600",
  },
  chipLabelSelected: {
    color: colors.primaryDark,
  },
  //risponde alla domanda che segue sempre un filtro: "quanto ho speso in questo?"
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    height: 32, //fissa: altrimenti comparendo e sparendo sposta la lista sotto
  },
  summaryCount: {
    fontSize: 13,
    color: colors.textMuted,
  },
  summaryTotal: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 32,
    gap: 6,
  },
  emptyTitle: {
    fontWeight: "600",
    color: colors.textSecondary,
  },
  emptyHint: {
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 13,
  },
  expenseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    ...cardShadow,
  },
  //cerchio con l'icona del gruppo, come nella schermata Abbonamenti
  expenseIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
    marginRight: 12,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  expenseMeta: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 3,
  },
  expenseAmount: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.danger,
  },
})