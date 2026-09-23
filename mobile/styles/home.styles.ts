import { StyleSheet } from "react-native";
import { colors, cardShadow } from "./tokens";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
  },
  // il margine sta sulla riga, così il saluto e l'icona restano allineati
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    flex: 1,
  },
  // pillola con sfondo, bordo ed etichetta: da sola l'icona si leggeva
  // come un logo decorativo invece che come un comando
  assistantButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 6,
    paddingRight: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...cardShadow,
  },
  assistantButtonPressed: {
    backgroundColor: colors.surfaceAlt,
    opacity: 0.85,
  },
  assistantButtonLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primaryDark,
  },
  assistantIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  sectionTitle:{
    marginTop:16,
    marginBottom:8
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
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
  emptyHint: {
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  expenseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    
    padding:14,
    borderRadius:16,
    margin:5,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...cardShadow,
  },
  expenseInfo:{
    flex:1
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight:"bold"
  },
  expenseAmount: {
    fontSize: 16,
    color: colors.danger,
  },
  expenseMeta:{

  },
  linkExpenses:{
    color: colors.primary,
    fontWeight:"bold",
    textAlign:"right"
  },
  budgetCard: {
    backgroundColor: colors.primaryDark,
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
  weeklyTitle: {
    color: colors.textOnPrimary,
    fontWeight: "bold",
    fontSize: 15,
    marginBottom: 12,
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