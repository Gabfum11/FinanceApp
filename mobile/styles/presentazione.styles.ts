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
  // --- landing: pagina unica di benvenuto (browser e computer) ---
  //niente misure che dipendono dalla finestra: la pagina viene generata
  //durante la build, dove la finestra non c'e'. Quello che deve adattarsi al
  //telefono lo fa con flexWrap o con le unita' del CSS
  pcPagina: {
    flexGrow: 1,
    backgroundColor: colors.background,
  },
  pcTesta: {
    backgroundColor: colors.surfaceDark,
    paddingTop: 28,
    paddingBottom: 64,
  },
  pcColonna: {
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 24,
  },
  pcNavigazione: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 56,
  },
  pcMarchio: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pcLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  pcNomeApp: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.textOnPrimary,
  },
  pcAzioni: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pcAccedi: {
    borderColor: colors.overlayLight,
  },
  pcEroe: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 48,
  },
  pcEroeTesti: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 420,
    gap: 18,
  },
  pcTitolo: {
    //da 34 sul telefono a 52 sul computer, seguendo la larghezza della
    //finestra: e' CSS, quindi funziona anche nella pagina generata in anticipo
    fontSize: "clamp(34px, 6vw, 52px)" as unknown as number,
    lineHeight: "1.12" as unknown as number,
    fontWeight: "bold",
    color: colors.textOnPrimary,
  },
  pcSottotitolo: {
    fontSize: 19,
    lineHeight: 28,
    maxWidth: 480,
    color: colors.textOnDark,
  },
  pcCrea: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 16,
  },
  pcNota: {
    fontSize: 14,
    color: colors.textOnDarkMuted,
  },
  pcCorpo: {
    paddingTop: 48,
    paddingBottom: 64,
    gap: 28,
  },
  pcSezione: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.text,
  },
  pcRiquadri: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
  },
  pcRiquadro: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 300,
    padding: 24,
    gap: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pcIllustrazione: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.background,
    gap: 10,
  },
  pcRiquadroTitolo: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.text,
  },
  pcRiquadroTesto: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  // --- piè di pagina della landing ---
  piede: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  piedeRiga: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    rowGap: 12,
    columnGap: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  piedeLink: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8,
    columnGap: 20,
  },
  piedeVoce: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  piedeCopyright: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
