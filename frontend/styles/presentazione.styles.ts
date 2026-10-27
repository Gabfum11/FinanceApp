import { StyleSheet } from "react-native";
import { type Colori, cardShadow, floatingShadow, fontSize, fontWeight } from "./tokens";

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
    fontSize: fontSize.xxxl,
    lineHeight: 34,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 10,
  },
  testo: {
    fontSize: fontSize.base,
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
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
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
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textOnDark,
  },
  titoloScuro: {
    fontSize: fontSize.xxxl,
    lineHeight: 38,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
    marginBottom: 10,
  },
  testoScuro: {
    fontSize: fontSize.base,
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
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
  },
  esitoCorpo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  esitoInfo: {
    flex: 1,
  },
  esitoDescrizione: {
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  esitoMeta: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  esitoImporto: {
    fontWeight: fontWeight.bold,
    fontSize: fontSize.base,
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
    fontWeight: fontWeight.bold,
    fontSize: fontSize.xs,
    letterSpacing: 0.5,
  },
  budgetPeriodo: {
    color: colors.textOnDarkMuted,
    fontSize: fontSize.xs,
  },
  budgetImporti: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  budgetResto: {
    color: colors.textOnPrimary,
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
  },
  budgetTotale: {
    color: colors.textOnDarkMuted,
    fontSize: fontSize.md,
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
    fontSize: fontSize.sm,
  },
  settimana: {
    backgroundColor: colors.surfaceDarker,
    borderRadius: 20,
    padding: 20,
  },
  settimanaTitolo: {
    color: colors.textOnPrimary,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.md,
    marginBottom: 12,
  },
  //i sette giorni occupano tutta la larghezza, con 8 di spazio: allineati a
  //sinistra lasciavano un vuoto a destra sul computer. Si stringono da sole se
  //lo spazio non basta, senza misurare la finestra (la landing viene generata
  //durante la build)
  colonne: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  colonna: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: 4,
  },
  colonnaValore: {
    color: colors.textOnDark,
    fontSize: fontSize.xxs,
  },
  //angoli appena arrotondati: con la cupola le barre basse diventavano mezzi cerchi
  colonnaBarra: {
    width: "100%",
    maxWidth: 44,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  giorno: {
    marginTop: 4,
    textAlign: "center",
    color: colors.textOnDarkMuted,
    fontSize: fontSize.xs,
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
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  notificaTitolo: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  notificaTesto: {
    color: colors.textSecondary,
  },
  sezione: {
    fontSize: fontSize.xxl,
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
    marginRight: 12,
  },
  abbonamentoInfo: {
    flex: 1,
  },
  abbonamentoNome: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  abbonamentoMeta: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  abbonamentoImporto: {
    fontSize: fontSize.base,
    color: colors.text,
  },
  // --- statistiche (solo nella landing) ---
  statistiche: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    ...cardShadow,
  },
  //come la fascia del periodo nell'app (BarraPeriodo), in piccolo e senza tocchi
  statPeriodo: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 14,
  },
  statVista: {
    flexDirection: "row",
    padding: 3,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
  },
  statVistaVoce: {
    minWidth: 56,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: "hidden",
    textAlign: "center",
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  statVistaScelta: {
    backgroundColor: colors.primary,
    color: colors.surfaceDark,
  },
  statNavigatore: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statPeriodoTesto: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  statCorpo: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  ciambella: {
    width: 150,
    height: 150,
  },
  ciambellaRuotata: {
    transform: [{ rotate: "-90deg" }],
  },
  ciambellaCentro: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  ciambellaEtichetta: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  ciambellaImporto: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statLegenda: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 200,
  },
  //righe come la legenda dell'app: icona su cerchio, alte 44 e separate da una linea
  statRiga: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 44,
    paddingVertical: 4,
  },
  statRigaSeparata: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  //largo come le icone, cosi' i nomi restano allineati
  statAnello: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 7,
  },
  statNome: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  statImporto: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  statTestoLibero: {
    color: colors.textMuted,
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
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
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
    fontSize: fontSize.sm,
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
    fontSize: fontSize.base,
  },
  accediLink: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
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
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
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
    //da 36 sul telefono a 60 sul computer, seguendo la larghezza della
    //finestra: e' CSS, quindi funziona anche nella pagina generata in anticipo
    fontSize: "clamp(36px, 6vw, 60px)" as unknown as number,
    lineHeight: "1.08" as unknown as number,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  pcSottotitolo: {
    fontSize: fontSize.lg,
    lineHeight: 28,
    maxWidth: 480,
    color: colors.textOnDark,
  },
  pcCrea: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 16,
  },
  //il bianco sul verde arriva a 2,1:1, sotto il minimo di 4,5:1; il verde scuro
  //delle card arriva a 5,3:1 ed e' uguale nei due temi
  pcCreaTesto: {
    color: colors.surfaceDark,
  },
  // --- chat dell'assistente accanto al titolo ---
  pcChat: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 340,
    maxWidth: 460,
    gap: 10,
    padding: 18,
    borderRadius: 24,
    backgroundColor: colors.surface,
    ...floatingShadow,
  },
  pcChatTesta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pcChatIcona: {
    width: 28,
    height: 28,
  },
  pcChatTitolo: {
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  risposta: {
    alignSelf: "flex-start",
    maxWidth: "90%",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    backgroundColor: colors.surfaceAlt,
  },
  rispostaTesto: {
    lineHeight: 20,
    color: colors.text,
  },
  //la riga della fonte e l'elenco hanno le misure di assistant.styles.ts
  rispostaConFonte: {
    width: "85%",
  },
  fonte: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  fonteTesto: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  //bianco e non grigio come nell'app: qui la bolla della risposta e' gia' grigia
  fonteElenco: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  fonteRiga: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  fonteRigaBordo: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  fonteData: {
    width: 52,
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  fonteDescrizione: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  fonteImporto: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  pcCorpo: {
    paddingTop: 64,
    paddingBottom: 72,
    gap: 32,
  },
  pcSezione: {
    fontSize: 32,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  //illustrazione e testo affiancati; sotto i 776 punti (420 + 300 + lo spazio
  //tra i due) vanno a capo, l'illustrazione sopra
  pcRiga: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    rowGap: 28,
    columnGap: 56,
    paddingVertical: 40,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pcRigaInvertita: {
    flexDirection: "row-reverse",
  },
  //fondo grigio senza bordo: le card dell'illustrazione, bianche, si staccano da sole
  pcIllustrazione: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 420,
    padding: 20,
    borderRadius: 24,
    backgroundColor: colors.surfaceAlt,
    gap: 10,
  },
  pcRigaTesti: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 300,
    gap: 12,
  },
  pcNota: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  // --- invito finale, prima del piè di pagina ---
  pcInvito: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    rowGap: 24,
    columnGap: 40,
    marginTop: 16,
    paddingVertical: 40,
    paddingHorizontal: 28,
    borderRadius: 24,
    backgroundColor: colors.surfaceDark,
  },
  pcInvitoTesti: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 300,
    gap: 8,
  },
  pcInvitoTitolo: {
    //come pcTitolo: CSS, quindi funziona anche nella pagina generata in anticipo
    fontSize: "clamp(26px, 4vw, 36px)" as unknown as number,
    lineHeight: "1.15" as unknown as number,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  pcInvitoTesto: {
    fontSize: fontSize.lg,
    lineHeight: 28,
    maxWidth: 480,
    color: colors.textOnDark,
  },
  importChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  importChip: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
    overflow: "hidden",
  },
  importChipPronte: {
    color: colors.primaryDark,
    backgroundColor: colors.primarySoft,
  },
  importChipSistemare: {
    color: colors.msgArancio,
    backgroundColor: colors.msgArancioSoft,
  },
  importPulsante: {
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  //come pcCreaTesto: il bianco sul verde non si legge
  importPulsanteTesto: {
    fontWeight: fontWeight.bold,
    color: colors.surfaceDark,
  },
  pcRiquadroTitolo: {
    fontSize: fontSize.xxl,
    lineHeight: 30,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  pcRiquadroTesto: {
    fontSize: fontSize.lg,
    lineHeight: 28,
    maxWidth: 520,
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
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  piedeCopyright: {
    fontSize: fontSize.md,
    color: colors.textMuted,
  },
});
