import { StyleSheet } from "react-native";

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
    backgroundColor: "#F0F0F2",
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
    borderColor: "#E5E5EA",
    backgroundColor: "white",
  },
  chipSelected: {
    backgroundColor: "#EAF9F0",
    borderColor: "#2ECC71",
  },
  chipLabel: {
    fontSize: 13,
    color: "#3A3A3C",
    //il peso resta invariato tra selezionato e non: il grassetto e' piu' largo
    //e farebbe cambiare larghezza al chip, spostando quelli accanto
    fontWeight: "600",
  },
  chipLabelSelected: {
    color: "#1B4332",
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
    color: "#8a8a8a",
  },
  summaryTotal: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 32,
    gap: 6,
  },
  emptyTitle: {
    fontWeight: "600",
    color: "#3A3A3C",
  },
  emptyHint: {
    textAlign: "center",
    color: "#8A8A8E",
    fontSize: 13,
  },
  expenseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  //cerchio con l'icona del gruppo, come nella schermata Abbonamenti
  expenseIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF9F0",
    marginRight: 12,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  expenseMeta: {
    fontSize: 13,
    color: "#8a8a8a",
    marginTop: 3,
  },
  expenseAmount: {
    fontSize: 17,
    fontWeight: "700",
    color: "#E74C3C",
  },
})