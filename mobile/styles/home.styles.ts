import { StyleSheet } from "react-native";
import { type Colori, cardShadow, radius } from "./tokens";

export const creaStili = (colors: Colori) =>
  StyleSheet.create({
  screen: {
    flex: 1,
  },
  //contenuto dello ScrollView: il margine in alto lo calcola la schermata
  //dalla barra di stato, quello in basso tiene l'ultima riga lontana dal +
  container: {
    padding: 24,
    paddingBottom: 48,
  },
  //sul computer: colonna centrata con margini piu' ampi
  containerLargo: {
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 40,
    paddingTop: 32,
  },
  //blocchi affiancati: a sinistra il principale, a destra quello di supporto
  rigaLarga: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 20,
  },
  rigaLargaDistanziata: {
    marginTop: 8,
  },
  colonnaPrincipale: {
    flex: 3,
    minWidth: 0,
  },
  colonnaLaterale: {
    flex: 2,
    minWidth: 0,
    gap: 20,
  },
  //nella riga le due card stanno alla stessa altezza, senza margini propri
  cardInRiga: {
    marginTop: 0,
    marginBottom: 0,
    minHeight: 190,
  },
  budgetRemainingLargo: {
    fontSize: 42,
  },
  sectionTitleLargo: {
    marginTop: 8,
  },
  //riquadri bianchi della colonna laterale: categorie e rinnovi
  riquadro: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 12,
  },
  riquadroTesta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  riquadroTitolo: {
    fontSize: 16,
    fontWeight: "bold",
  },
  miniStatistiche: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  miniTotale: {
    fontSize: 13,
    fontWeight: "bold",
  },
  miniLegenda: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  //righe con il cerchio dell'icona: un po' piu' alte, per non stringerlo
  miniRiga: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 32,
  },
  miniNome: {
    flex: 1,
    fontSize: 14,
  },
  miniImporto: {
    fontSize: 14,
    fontWeight: "bold",
    fontVariant: ["tabular-nums"],
  },
  rinnovoData: {
    fontSize: 13,
    color: colors.textMuted,
  },
  // il margine sta sulla riga, così il saluto e l'icona restano allineati
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    //il saluto non deve mai toccare la pillola dell'assistente
    gap: 12,
    marginBottom: 24,
  },
  title: {
    flex: 1,
  },
  // pillola con sfondo ed etichetta: da sola l'icona si leggeva
  // come un logo decorativo invece che come un comando.
  // Giallo e nero come il "+" della tab bar: i due modi di aggiungere una spesa si somigliano
  assistantButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 6,
    paddingRight: 12,
    paddingVertical: 6,
    borderRadius: 20,
    //niente ombra: su Android l'elevation disegnava un alone grigio attorno alla pillola gialla
    backgroundColor: colors.accent,
  },
  assistantButtonPressed: {
    opacity: 0.8,
  },
  assistantButtonLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "black",
  },
  assistantIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  //titolo a sinistra, "Vedi tutte" a destra
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  //il margine predefinito di IconButton lo staccherebbe dal pulsante accanto
  eyeButton: {
    margin: 0,
    //stesso grigio dell'icona: con il colore di bordo del tema sembravano due elementi
    borderColor: colors.textSecondary,
  },
  budgButt: {
    borderRadius: 20,
  },
  buttonLabel: {
    fontSize: 13,
  },
  //primo avvio: la lista vuota da sola non spiega nulla, questo indica cosa fare
  emptyState: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 32,
    gap: 6,
  },
  emptyTitle: {
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: 4,
  },
  //icona su cerchio verde tenue, come nelle statistiche: il grigio chiaro di
  //prima arrivava a 1,6:1
  emptyIcona: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  //pulsante vero al posto di "tocca + ...": verde pieno con testo scuro
  emptyPulsante: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    marginTop: 10,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  emptyPulsanteTenue: {
    backgroundColor: colors.primarySoft,
  },
  emptyPulsanteTesto: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.surfaceDark,
  },
  emptyPulsanteTestoTenue: {
    color: colors.primaryDark,
  },
  emptyHint: {
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  //le ultime spese stanno in un riquadro solo, le righe divise da una linea
  expenseList: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...cardShadow,
  },
  expenseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  expenseRowSeparata: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  expenseInfo:{
    flex:1
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight:"bold"
  },
  //importo convertito sopra, cifra originale in piccolo sotto
  amountColumn: {
    alignItems: "flex-end",
  },
  expenseOriginal: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    //cifre della stessa larghezza: gli importi restano allineati in colonna
    fontVariant: ["tabular-nums"],
  },
  expenseMeta:{
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  //verde scuro e non verde chiaro: sul fondo grigio si legge (5:1 contro 2:1)
  linkExpenses: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    paddingLeft: 12,
  },
  linkExpensesTesto: {
    color: colors.primaryDark,
    fontWeight: "600",
    fontSize: 15,
  },
  premuto: {
    opacity: 0.7,
  },
  budgetCard: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    overflow: "hidden",
  },
  budgetDecorCircle: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.overlayFaint,
  },
  budgetLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  budgetLabel: {
    color: colors.accent,
    fontWeight: "bold",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  budgetCycleRange: {
    color: colors.textOnDarkMuted,
    fontSize: 12,
  },
  budgetAmountRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  budgetRemaining: {
    color: colors.textOnPrimary,
    fontSize: 34,
    fontWeight: "bold",
    fontVariant: ["tabular-nums"],
  },
  budgetOf: {
    color: colors.textOnDarkMuted,
    fontSize: 14,
    marginBottom: 4,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: colors.overlayLight,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 14,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  budgetLegendRow: {
    flexDirection: "row",
    gap: 20,
  },
  budgetLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  budgetLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  budgetLegendText: {
    color: colors.textOnDark,
    fontSize: 13,
  },
  weeklyCard: {
    backgroundColor: colors.surfaceDarker,
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    marginBottom: 16,
    overflow:"visible"
  },
  weeklyTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 12,
  },
  weeklyTitle: {
    color: colors.textOnPrimary,
    fontWeight: "bold",
    fontSize: 15,
  },
  weeklyTotal: {
    color: colors.textOnDarkMuted,
    fontSize: 12,
  },
  weeklyTotalValue: {
    color: colors.textOnPrimary,
    fontWeight: "bold",
    fontSize: 15,
    fontVariant: ["tabular-nums"],
  },
  weeklyChartWrapper: {
    alignItems: "center",
    overflow: "visible",
  },
  weeklyBarLabel: {
    color: colors.textOnDark,
    fontSize: 10,
    textAlign: "center",
  },
  weeklyBarLabelContainer: {
    width: 56,
    marginLeft: -10,
    overflow: "visible",
  },
});