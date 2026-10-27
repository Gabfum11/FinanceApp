import { View, Image, Platform } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import Svg, { Circle } from "react-native-svg";
import { usePreferenze } from "@/utils/preferenze";
import { localeDi, type Lingua } from "@/utils/formato";
import { nomeCategoria } from "@/utils/categorie";
import { colorePerGruppo } from "@/utils/categoryIcons";
import { IconaCategoria } from "@/components/IconaCategoria";
import { creaStili } from "@/styles/presentazione.styles";
import { useStili, useTema } from "@/utils/tema";

// Le illustrazioni della landing e delle pagine della presentazione sul
// telefono: pezzi finti dell'app con dati di esempio, disegnati con gli stessi
// stili. Come la landing, non dipendono dalla larghezza della finestra.

const LOGO = require("../../assets/images/logo/trackit-icon-rounded-180.png");
//la stessa icona del pulsante dell'assistente nella home
const ICONA_ASSISTENTE = require("../../assets/images/logo/trackit-bot-1024.png");
//nel browser non ci sono notifiche push: i testi non devono promettere avvisi
const SUL_WEB = Platform.OS === "web";
//importi di esempio della settimana: servono solo a far vedere il grafico
const SPESE_SETTIMANA = [12, 0, 25, 8, 34, 18, 0];
//stessa scala del grafico in home: sotto i 40 euro non si adatta al massimo,
//se no una giornata da 5 euro riempirebbe il riquadro
const SOGLIA_SCALA = 40;
const ALTEZZA_GRAFICO = 100;
//esempio delle statistiche: lo stesso budget del riquadro del budget, e le
//categorie sommano lo speso che si vede li' (387,50)
const BUDGET_ESEMPIO = 800;
const SPESE_CATEGORIE = [
  { gruppo: "Cibo e bevande", totale: 162.4 },
  { gruppo: "Casa", totale: 95 },
  { gruppo: "Trasporti", totale: 68.6 },
  { gruppo: "Svago", totale: 61.5 },
];
//la ciambella ha le misure di quella delle statistiche sul telefono
const LATO_CIAMBELLA = 150;
const SPESSORE_CIAMBELLA = 15;

//date vere invece di scritte fisse: "1 mar - 28 mar" letto a ottobre
//farebbe sembrare l'illustrazione vecchia
function ieri(lingua: Lingua): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString(localeDi(lingua));
}

//esempio con il mese che riparte il 27, come per chi prende lo stipendio
function cicloEsempio(): [Date, Date] {
  const oggi = new Date();
  const inizio = new Date(oggi.getFullYear(), oggi.getMonth() - (oggi.getDate() < 27 ? 1 : 0), 27);
  return [inizio, new Date(inizio.getFullYear(), inizio.getMonth() + 1, 26)];
}

function periodoBudget(lingua: Lingua): string {
  const [inizio, fine] = cicloEsempio();
  const opzioni: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${inizio.toLocaleDateString(localeDi(lingua), opzioni)} - ${fine.toLocaleDateString(localeDi(lingua), opzioni)}`;
}

//come formatCycleLabel in app/(tabs)/stats.tsx: l'anno sempre sulla fine,
//sull'inizio solo se il ciclo scavalca l'anno
function periodoStatistiche(lingua: Lingua): string {
  const [inizio, fine] = cicloEsempio();
  const opzioni: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const conAnno: Intl.DateTimeFormatOptions = { ...opzioni, year: "numeric" };
  const primo = inizio.toLocaleDateString(localeDi(lingua), inizio.getFullYear() === fine.getFullYear() ? opzioni : conAnno);
  return `${primo} - ${fine.toLocaleDateString(localeDi(lingua), conAnno)}`;
}

export function IllustrazioneSpese() {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const { importo, lingua } = usePreferenze();
  const { t } = useTranslation();
  return (
    <>
      <View style={styles.fumetto}>
        <Text style={styles.fumettoTesto}>{t("presentazione.p2.esempio")}</Text>
      </View>
      <View style={styles.esito}>
        <View style={styles.esitoTesta}>
          <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />
          <Text style={styles.esitoTitolo}>{t("presentazione.p2.aggiunta")}</Text>
        </View>
        <View style={styles.esitoCorpo}>
          <IconaCategoria gruppo="Cibo e bevande" dimensione={36} />
          <View style={styles.esitoInfo}>
            <Text style={styles.esitoDescrizione}>{t("presentazione.p2.descrizione")}</Text>
            <Text style={styles.esitoMeta}>{t("presentazione.p2.categoria")} · {ieri(lingua)}</Text>
          </View>
          <Text style={styles.esitoImporto}>{importo(40)}</Text>
        </View>
      </View>
    </>
  );
}

export function IllustrazioneBudget() {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const { importo, lingua } = usePreferenze();
  const { t } = useTranslation();
  const oggi = (new Date().getDay() + 6) % 7; //lunedi' = 0, come le etichette
  const scala = Math.max(Math.max(...SPESE_SETTIMANA) * 1.3, SOGLIA_SCALA);
  const giorni = t("comune.giorniBrevi").split(",");
  return (
    <>
      <View style={styles.budgetCard}>
        <View style={styles.budgetCerchio} />
        <View style={styles.budgetRiga}>
          <Text style={styles.budgetEtichetta}>{t("presentazione.p3.libero")}</Text>
          <Text style={styles.budgetPeriodo}>{periodoBudget(lingua)}</Text>
        </View>
        <View style={styles.budgetImporti}>
          <Text style={styles.budgetResto}>{importo(412.5)}</Text>
          <Text style={styles.budgetTotale}>{t("presentazione.p3.di", { totale: importo(800) })}</Text>
        </View>
        <View style={styles.barra}>
          <View style={styles.barraPiena} />
        </View>
        <View style={styles.legenda}>
          <View style={styles.legendaPunto} />
          <Text style={styles.legendaTesto}>{t("presentazione.p3.speso", { importo: importo(387.5) })}</Text>
        </View>
      </View>
      <View style={styles.settimana}>
        <Text style={styles.settimanaTitolo}>{t("presentazione.p3.settimana")}</Text>
        <View style={styles.colonne}>
          {SPESE_SETTIMANA.map((valore, i) => (
            <View key={i} style={styles.colonna}>
              <Text style={styles.colonnaValore}>{importo(valore, 0)}</Text>
              <View
                style={[
                  styles.colonnaBarra,
                  {
                    height: (valore / scala) * ALTEZZA_GRAFICO,
                    backgroundColor: i === oggi ? colors.primary : colors.overlayMuted,
                  },
                ]}
              />
              <Text style={styles.giorno}>{giorni[i]}</Text>
            </View>
          ))}
        </View>
      </View>
    </>
  );
}

//l'icona e' quella della sottocategoria, come nella pagina degli abbonamenti
function Abbonamento({ nome, meta, importo, categoria, gruppo }: { nome: string; meta: string; importo: string; categoria: string; gruppo: string }) {
  const styles = useStili(creaStili);
  return (
    <View style={styles.abbonamento}>
      <View style={styles.abbonamentoIcona}>
        <IconaCategoria categoria={categoria} gruppo={gruppo} dimensione={40} />
      </View>
      <View style={styles.abbonamentoInfo}>
        <Text style={styles.abbonamentoNome}>{nome}</Text>
        <Text style={styles.abbonamentoMeta}>{meta}</Text>
      </View>
      <Text style={styles.abbonamentoImporto}>{importo}</Text>
    </View>
  );
}

export function IllustrazioneAbbonamenti() {
  const styles = useStili(creaStili);
  const { importo } = usePreferenze();
  const { t } = useTranslation();
  return (
    <>
      {!SUL_WEB && (
        <View style={styles.notifica}>
          <Image source={LOGO} style={styles.notificaIcona} />
          <View style={{ flex: 1 }}>
            <Text style={styles.notificaApp}>TrackIt</Text>
            <Text style={styles.notificaTitolo}>{t("presentazione.p4.notifica")}</Text>
            <Text style={styles.notificaTesto}>{importo(39.9)} · {t("comune.mensile")}</Text>
          </View>
        </View>
      )}
      <Text style={styles.sezione}>{t("presentazione.p4.attivi")}</Text>
      <Abbonamento
        nome={t("presentazione.p4.palestra")}
        meta={t("presentazione.p4.palestraMeta")}
        importo={importo(39.9)}
        categoria="Palestra"
        gruppo="Sport"
      />
      <Abbonamento
        nome="Netflix"
        meta={t("presentazione.p4.netflixMeta")}
        importo={importo(13.99)}
        categoria="Abbonamenti digitali"
        gruppo="Svago"
      />
    </>
  );
}

// Come la schermata dell'import: il file letto, i conteggi e alcune righe,
// con Netflix tolta perche' gia' registrata dall'abbonamento
export function IllustrazioneImport() {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const { importo } = usePreferenze();
  const { t } = useTranslation();
  return (
    <>
      <View style={styles.abbonamento}>
        <MaterialCommunityIcons name="microsoft-excel" size={32} color={colors.primaryDark} style={styles.abbonamentoIcona} />
        <View style={styles.abbonamentoInfo}>
          <Text style={styles.abbonamentoNome} numberOfLines={1}>{t("presentazione.importa.file")}</Text>
          <Text style={styles.abbonamentoMeta}>{t("presentazione.importa.letto")}</Text>
        </View>
        <MaterialCommunityIcons name="check-circle" size={22} color={colors.primary} />
      </View>
      <View style={styles.importChips}>
        <Text style={[styles.importChip, styles.importChipPronte]}>{t("importa.pronte", { count: 41 })}</Text>
        <Text style={[styles.importChip, styles.importChipSistemare]}>{t("importa.daSistemare", { count: 2 })}</Text>
      </View>
      <Abbonamento nome="Esselunga" meta={nomeCategoria("Spesa alimentare")} importo={importo(54.2)} categoria="Spesa alimentare" gruppo="Cibo e bevande" />
      <Abbonamento nome="Q8" meta={nomeCategoria("Carburante")} importo={importo(60)} categoria="Carburante" gruppo="Trasporti" />
      <Abbonamento nome="Netflix" meta={t("importa.msg_abbonamento")} importo={importo(13.99)} categoria="Abbonamenti digitali" gruppo="Svago" />
      <View style={styles.importPulsante}>
        <Text style={styles.importPulsanteTesto}>{t("importa.pulsanteImporta", { count: 41 })}</Text>
      </View>
    </>
  );
}

// Come la pagina delle statistiche: Mese | Anno e il mese, la ciambella con lo
// speso al centro e la legenda con le icone delle categorie. Niente interruttore
// €/% ne' frecce delle sottocategorie: sul telefono il riquadro e' largo circa
// 210 punti e il nome della categoria verrebbe tagliato
export function IllustrazioneStatistiche() {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const { importo, lingua } = usePreferenze();
  const { t } = useTranslation();
  const speso = SPESE_CATEGORIE.reduce((somma, c) => somma + c.totale, 0);
  const raggio = (LATO_CIAMBELLA - SPESSORE_CIAMBELLA) / 2;
  const circonferenza = 2 * Math.PI * raggio;
  //ogni fetta parte dove finisce la precedente; l'ultima e' la parte libera
  const fette = [
    ...SPESE_CATEGORIE.map((c) => ({ colore: colorePerGruppo(c.gruppo), valore: c.totale })),
    { colore: colors.donutRemaining, valore: BUDGET_ESEMPIO - speso },
  ].map((fetta, i, tutte) => ({
    ...fetta,
    lunghezza: (fetta.valore / BUDGET_ESEMPIO) * circonferenza,
    inizio: (tutte.slice(0, i).reduce((somma, f) => somma + f.valore, 0) / BUDGET_ESEMPIO) * circonferenza,
  }));
  return (
    <View style={styles.statistiche}>
      {/* la fascia del periodo come nell'app: Mese | Anno e il mese tra le frecce */}
      <View style={styles.statPeriodo}>
        <View style={styles.statVista}>
          <Text style={[styles.statVistaVoce, styles.statVistaScelta]}>{t("statistiche.mese")}</Text>
          <Text style={styles.statVistaVoce}>{t("statistiche.anno")}</Text>
        </View>
        <View style={styles.statNavigatore}>
          <MaterialCommunityIcons name="chevron-left" size={20} color={colors.text} />
          <Text style={styles.statPeriodoTesto}>{periodoStatistiche(lingua)}</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textDisabled} />
        </View>
      </View>
      <View style={styles.statCorpo}>
        <View style={styles.ciambella}>
          {/* il cerchio parte dalle 3: ruotato, la prima fetta parte dalle 12 come nell'app */}
          <View style={styles.ciambellaRuotata}>
            <Svg width={LATO_CIAMBELLA} height={LATO_CIAMBELLA}>
              {fette.map((fetta, i) => (
                <Circle
                  key={i}
                  cx={LATO_CIAMBELLA / 2}
                  cy={LATO_CIAMBELLA / 2}
                  r={raggio}
                  fill="none"
                  stroke={fetta.colore}
                  strokeWidth={SPESSORE_CIAMBELLA}
                  strokeDasharray={`${fetta.lunghezza} ${circonferenza}`}
                  strokeDashoffset={-fetta.inizio}
                />
              ))}
            </Svg>
          </View>
          <View style={styles.ciambellaCentro}>
            <Text style={styles.ciambellaEtichetta}>{t("statistiche.speso")}</Text>
            <Text style={styles.ciambellaImporto}>{importo(speso)}</Text>
          </View>
        </View>
        <View style={styles.statLegenda}>
          {SPESE_CATEGORIE.map((c, i) => (
            <View key={c.gruppo} style={[styles.statRiga, i > 0 && styles.statRigaSeparata]}>
              <IconaCategoria gruppo={c.gruppo} dimensione={30} />
              <Text style={styles.statNome} numberOfLines={2}>{nomeCategoria(c.gruppo)}</Text>
              <Text style={styles.statImporto}>{importo(c.totale)}</Text>
            </View>
          ))}
          {/* il disponibile e' un anello vuoto grigio come la sua fetta, non una categoria */}
          <View style={[styles.statRiga, styles.statRigaSeparata]}>
            <View style={[styles.statAnello, { borderColor: colors.donutRemaining }]} />
            <Text style={[styles.statNome, styles.statTestoLibero]} numberOfLines={1}>
              {t("statistiche.disponibile")}
            </Text>
            <Text style={[styles.statImporto, styles.statTestoLibero]}>{importo(BUDGET_ESEMPIO - speso)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

//benzina del mese scorso e di quello prima: poche spese, cosi' l'elenco
//aperto e' completo e la somma torna con il totale della risposta
const BENZINA = [
  [{ giorno: 3, voce: "pieno", importo: 60 }, { giorno: 17, voce: "autostrada", importo: 52 }, { giorno: 28, voce: "benzina", importo: 30 }],
  [{ giorno: 8, voce: "pieno", importo: 58 }, { giorno: 24, voce: "benzina", importo: 38.5 }],
];
const totale = (spese: (typeof BENZINA)[number]) => spese.reduce((s, x) => s + x.importo, 0);

//la riga della fonte sotto la risposta, come in components/assistente/Messaggio.tsx,
//ferma perche' e' un'immagine: la prima chiusa, la seconda aperta
function FonteEsempio({ mesiFa, aperta }: { mesiFa: number; aperta: boolean }) {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const { importo, lingua } = usePreferenze();
  const { t } = useTranslation();
  const oggi = new Date();
  const primo = new Date(oggi.getFullYear(), oggi.getMonth() - mesiFa, 1);
  const ultimo = new Date(oggi.getFullYear(), oggi.getMonth() - mesiFa + 1, 0);
  //l'anno solo se non e' quest'anno, come nell'app
  const opzioni: Intl.DateTimeFormatOptions = {
    day: "numeric", month: "short", ...(primo.getFullYear() !== oggi.getFullYear() && { year: "numeric" }),
  };
  const giorno = (d: Date) => d.toLocaleDateString(localeDi(lingua), opzioni);
  const spese = BENZINA[mesiFa - 1];
  return (
    <View>
      <View style={styles.fonte}>
        <MaterialCommunityIcons name="database-outline" size={16} color={colors.primary} />
        <Text style={styles.fonteTesto}>
          {t("assistente.daSpese", { count: spese.length })} · {giorno(primo)} – {giorno(ultimo)}
        </Text>
        <MaterialCommunityIcons name={aperta ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} />
      </View>
      {aperta && (
        <View style={styles.fonteElenco}>
          {spese.map((s, i) => (
            <View key={i} style={[styles.fonteRiga, i > 0 && styles.fonteRigaBordo]}>
              <Text style={styles.fonteData}>{giorno(new Date(primo.getFullYear(), primo.getMonth(), s.giorno))}</Text>
              <Text style={styles.fonteDescrizione} numberOfLines={1}>{t(`presentazione.assistente.${s.voce}`)}</Text>
              <Text style={styles.fonteImporto}>{importo(s.importo)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// Accanto al titolo: una domanda all'assistente e il seguito, che fa capire
// che ricorda lo scambio precedente. Niente nomi di mesi nel testo, che
// dovrebbero cambiare con la data ("a settembre" letto a dicembre)
export function IllustrazioneAssistente() {
  const styles = useStili(creaStili);
  const { importo } = usePreferenze();
  const { t } = useTranslation();
  const [scorso, prima] = BENZINA.map(totale);
  return (
    <View style={styles.pcChat} role="img" aria-label={t("presentazione.descrizioni.assistente")}>
      <View style={styles.pcChatTesta}>
        <Image source={ICONA_ASSISTENTE} style={styles.pcChatIcona} accessibilityIgnoresInvertColors />
        <Text style={styles.pcChatTitolo}>{t("home.assistente")}</Text>
      </View>
      <View style={styles.fumetto}>
        <Text style={styles.fumettoTesto}>{t("presentazione.assistente.domanda")}</Text>
      </View>
      <View style={[styles.risposta, styles.rispostaConFonte]}>
        <Text style={styles.rispostaTesto}>
          {t("presentazione.assistente.risposta", { importo: importo(scorso), count: BENZINA[0].length })}
        </Text>
        <FonteEsempio mesiFa={1} aperta={false} />
      </View>
      <View style={styles.fumetto}>
        <Text style={styles.fumettoTesto}>{t("presentazione.assistente.seguito")}</Text>
      </View>
      <View style={[styles.risposta, styles.rispostaConFonte]}>
        <Text style={styles.rispostaTesto}>
          {t("presentazione.assistente.risposta2", {
            importo: importo(prima), differenza: importo(scorso - prima), count: BENZINA[1].length,
          })}
        </Text>
        <FonteEsempio mesiFa={2} aperta />
      </View>
    </View>
  );
}
