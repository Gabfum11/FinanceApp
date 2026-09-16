import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
  },
  title: {
    marginBottom: 24,
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
  expenseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    
    padding:14,
    borderRadius:16,
    margin:5,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation:2
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
    color: "#E74C3C",
  },
  expenseMeta:{

  },
  linkExpenses:{
    color: "#2ECC71",
    fontWeight:"bold",
    textAlign:"right"
  },
  budgetCard: {
    backgroundColor: "#1B4332",
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
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  budgetLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  budgetLabel: {
    color: "#F5C518",
    fontWeight: "bold",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  budgetCycleRange: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
  },
  budgetAmountRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  budgetRemaining: {
    color: "white",
    fontSize: 34,
    fontWeight: "bold",
  },
  budgetOf: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    marginBottom: 4,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 14,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#2ECC71",
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
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
  },
});