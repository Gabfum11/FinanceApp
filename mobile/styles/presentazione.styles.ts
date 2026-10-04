import { StyleSheet } from "react-native";
import { type Colori, cardShadow, floatingShadow } from "./tokens";

export const creaStili = (colors: Colori) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // --- struttura comune alle pagine ---
  pagina: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  paginaScura: {
    backgroundColor: colors.surfaceDark,
  },
  intestazione: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 48,
  },
  //l'IconButton ha un margine suo: senza, la freccia non si allinea al testo sotto
  indietro: {
    marginLeft: -10,
  },
  illustrazione: {
    flex: 1,
    justifyContent: "center",
    gap: 12,
    paddingVertical: 16,
  },
  titolo: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 10,
  },
  testo: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  punti: {
    flexDirection: "row",
    gap: 6,
    marginTop: 24,
    marginBottom: 20,
  },
  punto: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.disabled,
  },
  puntoAttivo: {
    width: 24,
    backgroundColor: colors.primary,
  },
  puntoScuro: {
    backgroundColor: colors.overlayLight,
  },
  buttonLabel: {
    fontSize: 18,
    fontWeight: "bold",
  },
  // --- pagina 1: benvenuto ---
  logoArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  //due cerchi sottili attorno al logo: danno respiro alla pagina senza immagini
  cerchioEsterno: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  cerchioInterno: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: colors.overlayLight,
    alignItems: "center",
    justifyContent: "center",
  },
  logoGrande: {
    width: 112,
    height: 112,
    borderRadius: 28,
  },
  nomeApp: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.textOnDark,
  },
  titoloScuro: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "bold",
    color: colors.textOnPrimary,
    marginBottom: 10,
  },
  testoScuro: {
    fontSize: 17,
    lineHeight: 25,
    color: "rgba(255,255,255,0.75)",
  },
  // --- pagina 2: spese ---
  fumetto: {
    alignSelf: "flex-end",
    maxWidth: "85%",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    backgroundColor: colors.surfaceDark,
  },
  fumettoTesto: {
    color: colors.textOnPrimary,
  },
  esito: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    overflow: "hidden",
    ...cardShadow,
  },
  esitoTesta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.primarySoft,
  },
  esitoTitolo: {
    fontWeight: "700",
    color: colors.primaryDark,
  },
  esitoCorpo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  esitoIcona: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceAlt,
  },
  esitoInfo: {
    flex: 1,
  },
  esitoDescrizione: {
    fontWeight: "600",
    color: colors.text,
  },
  esitoMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  esitoImporto: {
    fontWeight: "700",
    fontSize: 16,
    color: colors.text,
  },
  // --- pagina 3: budget ---
  budgetCard: {
    backgroundColor: colors.surfaceDark,
    borderRadius: 20,
    padding: 20,
    overflow: "hidden",
  },
  budgetCerchio: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.overlayFaint,
  },
  budgetRiga: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  budgetEtichetta: {
    color: colors.accent,
    fontWeight: "bold",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  budgetPeriodo: {
    color: colors.textOnDarkMuted,
    fontSize: 12,
  },
  budgetImporti: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  budgetResto: {
    color: colors.textOnPrimary,
    fontSize: 34,
    fontWeight: "bold",
  },
  budgetTotale: {
    color: colors.textOnDarkMuted,
    fontSize: 14,
    marginBottom: 4,
  },
  barra: {
    height: 8,
    backgroundColor: colors.overlayLight,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 14,
  },
  barraPiena: {
    width: "48%",
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  legenda: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendaPunto: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  legendaTesto: {
    color: colors.textOnDark,
    fontSize: 13,
  },
  settimana: {
    backgroundColor: colors.surfaceDarker,
    borderRadius: 20,
    padding: 20,
  },
  settimanaTitolo: {
    color: colors.textOnPrimary,
    fontWeight: "bold",
    fontSize: 15,
    marginBottom: 12,
  },
  colonne: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 120,
  },
  colonna: {
    alignItems: "center",
    gap: 4,
    width: 30,
  },
  colonnaValore: {
    color: colors.textOnDark,
    fontSize: 10,
  },
  colonnaBarra: {
    width: 30,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  giorni: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  giorno: {
    width: 30,
    textAlign: "center",
    color: colors.textOnDarkMuted,
    fontSize: 12,
  },
  // --- pagina 4: abbonamenti ---
  notifica: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.surface,
    marginBottom: 8,
    ...floatingShadow,
  },
  notificaIcona: {
    width: 36,
    height: 36,
    borderRadius: 9,
  },
  notificaApp: {
    fontSize: 12,
    color: colors.textMuted,
  },
  notificaTitolo: {
    fontSize: 15,
    fontWeight: "bold",
    color: colors.text,
  },
  notificaTesto: {
    color: colors.textSecondary,
  },
  sezione: {
    fontSize: 22,
    color: colors.text,
  },
  abbonamento: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  abbonamentoIcona: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  abbonamentoInfo: {
    flex: 1,
  },
  abbonamentoNome: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.text,
  },
  abbonamentoMeta: {
    color: colors.textMuted,
    fontSize: 13,
  },
  abbonamentoImporto: {
    fontSize: 16,
    color: colors.text,
  },
  // --- pagina 5: registrazione ---
  finale: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 70,
    height: 70,
    borderRadius: 16,
  },
  logoNome: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 14,
  },
  centrato: {
    textAlign: "center",
  },
  puntiCentrati: {
    alignSelf: "center",
  },
  separatore: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 12,
    gap: 12,
  },
  separatoreLinea: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  separatoreTesto: {
    color: colors.textMuted,
  },
  legale: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  legaleLink: {
    color: colors.link,
    textDecorationLine: "underline",
  },
  accedi: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 16,
  },
  accediLink: {
    color: colors.primary,
    fontWeight: "bold",
  },
});
