import { StyleSheet } from "react-native";
import { type Colori, fontSize, fontWeight } from "./tokens";

export const creaStili = (colors: Colori) =>
  StyleSheet.create({
    container: {
    flex: 1,
  },
  //sul computer: colonna centrata, la tabella non si allunga per tutto il monitor
  containerLargo: {
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 24,
  },
  intestazioneTabella: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  intestazioneColonna: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.4,
    color: colors.textMuted,
    textTransform: "uppercase",
  },
  rigaTabella: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginBottom: 6,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  colonnaIcona: {
    width: 38,
    marginRight: 0,
  },
  colonnaDescrizione: {
    flex: 2,
    minWidth: 0,
  },
  colonnaCategoria: {
    flex: 1.5,
    minWidth: 0,
  },
  colonnaImporto: {
    width: 120,
    textAlign: "right",
  },
  colonnaAzioni: {
    width: 96,
  },
  azioni: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 8,
    //paddingTop lo aggiunge la schermata dalla barra di stato
  },
  //stessa larghezza dell'IconButton, così il titolo resta centrato
  headerSpacer: {
    width: 48,
  },
  list: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  //"Oggi", "Ieri", "lunedì 6 ottobre": sopra il riquadro delle spese di quel giorno
  dayHeader: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginTop: 14,
    marginBottom: 6,
    marginLeft: 4,
  },
  searchbar: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
  },
  searchbarInput: {
    fontSize: fontSize.md,
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
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    //il peso resta invariato tra selezionato e non: il grassetto e' piu' largo
    //e farebbe cambiare larghezza al chip, spostando quelli accanto
    fontWeight: fontWeight.semibold,
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
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  summaryTotal: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 32,
    gap: 6,
  },
  emptyTitle: {
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  emptyHint: {
    textAlign: "center",
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  //le righe di uno stesso giorno si toccano e formano un riquadro solo:
  //bordo esterno sulle righe, angoli arrotondati solo sulla prima e l'ultima
  expenseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 4,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  expenseRowPrima: {
    borderTopWidth: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  expenseRowSeparata: {
    borderTopWidth: 1,
  },
  expenseRowUltima: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  //il margine predefinito di IconButton allargherebbe troppo la riga
  azioneRiga: {
    margin: 0,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  expenseMeta: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 3,
  },
  //importo convertito sopra, cifra originale in piccolo sotto
  amountColumn: {
    alignItems: "flex-end",
  },
  expenseOriginal: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  //colore neutro: in un elenco di sole uscite il rosso non distingueva nulla
  expenseAmount: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
})