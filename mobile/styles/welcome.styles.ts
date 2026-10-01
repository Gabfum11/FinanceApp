import { StyleSheet } from "react-native";
import { colors, radius, cardShadow } from "./tokens";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  dots: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  //il passaggio corrente e' una pillola: si vede a colpo d'occhio a che punto sei
  dotActive: {
    width: 22,
    backgroundColor: colors.primary,
  },
  skip: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: "500",
    paddingVertical: 8,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 16,
  },
  slide: {
    alignItems: "center",
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  botLogo: {
    width: 72,
    height: 72,
    marginBottom: 12,
  },
  title: {
    textAlign: "center",
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    opacity: 0.6,
    maxWidth: 280,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 4,
  },
  button: {
    width: "100%",
  },
  buttonLabel: {
    fontSize: 18,
    fontWeight: "bold",
  },

  // --- passaggio 1: card degli abbonamenti ---
  infoCard: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 24,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.warningBadge,
    justifyContent: "center",
    alignItems: "center",
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "bold",
  },
  infoHint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  //copia ferma del selettore di add_expense: qui spiega, non si tocca
  segmented: {
    flexDirection: "row",
    alignSelf: "flex-start",
    marginTop: 10,
    padding: 3,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
  },
  segment: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  segmentSelected: {
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  segmentLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
  },
  segmentLabelSelected: {
    color: colors.primaryDark,
  },

  // --- passaggio 2: budget ---
  field: {
    width: "100%",
    marginTop: 24,
  },
  label: {
    fontWeight: "bold",
    marginBottom: 8,
  },
  input: {
    width: "100%",
  },
  inputOutline: {
    borderRadius: 14,
  },
  helperText: {
    opacity: 0.6,
    fontSize: 12,
    marginTop: 8,
  },

  // --- passaggio 3: assistente ---
  chat: {
    width: "100%",
    marginTop: 20,
    gap: 8,
  },
  userBubble: {
    alignSelf: "flex-end",
    maxWidth: "82%",
    backgroundColor: colors.primaryDark,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userText: {
    color: colors.textOnPrimary,
  },
  replyCard: {
    alignSelf: "flex-start",
    width: "86%",
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    padding: 14,
    ...cardShadow,
  },
  replyLabel: {
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 0.6,
    color: colors.textMuted,
    marginBottom: 6,
  },
  replyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  replyDesc: {
    fontSize: 15,
  },
  replyAmount: {
    fontSize: 15,
    fontWeight: "bold",
  },
  replyMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  whereRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 20,
  },
  whereText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  //stessa pillola gialla della home, ferma
  assistantPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 6,
    paddingRight: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.accent,
  },
  assistantPillIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  assistantPillLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "black",
  },

  // --- passaggio 4: abbonamenti ---
  groups: {
    width: "100%",
    marginTop: 16,
    gap: 12,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 0.6,
    color: colors.textMuted,
    marginBottom: 4,
    marginLeft: 2,
  },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  dueRow: {
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.warningSurface,
  },
  pausedRow: {
    backgroundColor: colors.surfaceAlt,
  },
  subIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  pausedIcon: {
    backgroundColor: colors.border,
  },
  subInfo: {
    flex: 1,
  },
  subDesc: {
    fontSize: 14,
    fontWeight: "bold",
  },
  subMeta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  subAmount: {
    fontSize: 14,
    marginRight: 6,
  },
  dueBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.warningBadge,
    color: colors.warningText,
    fontSize: 10,
    fontWeight: "bold",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    overflow: "hidden",
    marginTop: 2,
  },
  reactivate: {
    color: colors.primary,
    fontWeight: "bold",
    fontSize: 13,
    marginRight: 8,
  },
  caption: {
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.textSecondary,
    opacity: 0.8,
    marginTop: 4,
    marginLeft: 2,
  },
});
