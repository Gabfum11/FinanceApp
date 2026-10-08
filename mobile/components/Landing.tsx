import type { ReactNode } from "react";
import { View, Image, ScrollView, Platform } from "react-native";
import { Button, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import type { Href } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useTranslation } from "react-i18next";
import Svg, { Circle } from "react-native-svg";
import { PRIVACY_URL } from "@/config";
import { SelettoreLingua } from "@/components/SelettoreLingua";
import { usePreferenze } from "@/utils/preferenze";
import { localeDi, type Lingua } from "@/utils/formato";
import { nomeCategoria } from "@/utils/categorie";
import { colorePerGruppo } from "@/utils/categoryIcons";
import { IconaCategoria } from "@/components/IconaCategoria";
import { contattaSupporto } from "@/utils/support";
import { creaStili } from "@/styles/presentazione.styles";
import { useStili, useTema } from "@/utils/tema";
import { LARGHEZZA_CONTENUTO } from "@/utils/layout";

// La pagina che vede nel browser chi non ha fatto l'accesso: cosa fa TrackIt
// e il pulsante per registrarsi. Le illustrazioni sono le stesse delle pagine
// della presentazione sul telefono, che le importa da qui.
//
// La pagina viene generata gia' durante la build, perche' Google legga i testi
// senza eseguire l'app: per questo niente qui dentro dipende dalla larghezza
// della finestra, che durante la build non esiste. Righe e riquadri vanno a
// capo da soli quando lo spazio finisce.

export const LOGO = require("../assets/images/logo/trackit-icon-rounded-180.png");
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

function periodoBudget(lingua: Lingua): string {
  //esempio con il mese che riparte il 27, come per chi prende lo stipendio
  const oggi = new Date();
  const inizio = new Date(oggi.getFullYear(), oggi.getMonth() - (oggi.getDate() < 27 ? 1 : 0), 27);
  const fine = new Date(inizio.getFullYear(), inizio.getMonth() + 1, 26);
  const opzioni: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${inizio.toLocaleDateString(localeDi(lingua), opzioni)} - ${fine.toLocaleDateString(localeDi(lingua), opzioni)}`;
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

// Come la pagina delle statistiche: il mese, la ciambella con lo speso al
// centro e la legenda. Niente colonna delle percentuali: sul telefono il
// riquadro e' largo circa 210 punti e il nome della categoria verrebbe tagliato
function IllustrazioneStatistiche() {
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
      <View style={styles.statPeriodo}>
        <MaterialCommunityIcons name="chevron-left" size={20} color={colors.textMuted} />
        <Text style={styles.statPeriodoTesto}>{periodoBudget(lingua)}</Text>
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.disabled} />
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
          {SPESE_CATEGORIE.map((c) => (
            <View key={c.gruppo} style={styles.statRiga}>
              <View style={[styles.statPunto, { backgroundColor: colorePerGruppo(c.gruppo) }]} />
              <Text style={styles.statNome} numberOfLines={1}>{nomeCategoria(c.gruppo)}</Text>
              <Text style={styles.statImporto}>{importo(c.totale)}</Text>
            </View>
          ))}
          <View style={[styles.statRiga, styles.statRigaLibero]}>
            <View style={[styles.statPunto, { backgroundColor: colors.donutRemaining }]} />
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

// Accanto al titolo: una domanda all'assistente e il seguito, che fa capire
// che ricorda lo scambio precedente. Niente nomi di mesi, che dovrebbero
// cambiare con la data ("a settembre" letto a dicembre)
function IllustrazioneAssistente() {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const { importo } = usePreferenze();
  const { t } = useTranslation();
  return (
    <View style={styles.pcChat} role="img" aria-label={t("presentazione.descrizioni.assistente")}>
      <View style={styles.pcChatTesta}>
        <View style={styles.pcChatIcona}>
          <MaterialCommunityIcons name="creation" size={16} color={colors.primaryDark} />
        </View>
        <Text style={styles.pcChatTitolo}>{t("home.assistente")}</Text>
      </View>
      <View style={styles.fumetto}>
        <Text style={styles.fumettoTesto}>{t("presentazione.assistente.domanda")}</Text>
      </View>
      <View style={styles.risposta}>
        <Text style={styles.rispostaTesto}>
          {t("presentazione.assistente.risposta", { categoria: nomeCategoria("Bar e caffè"), importo: importo(46.8) })}
        </Text>
      </View>
      <View style={styles.fumetto}>
        <Text style={styles.fumettoTesto}>{t("presentazione.assistente.seguito")}</Text>
      </View>
      <View style={styles.risposta}>
        <Text style={styles.rispostaTesto}>
          {t("presentazione.assistente.risposta2", { importo: importo(31.2), differenza: importo(15.6) })}
        </Text>
      </View>
    </View>
  );
}

// In alto la domanda e il pulsante per registrarsi, con accanto la chat
// dell'assistente; sotto le quattro cose che fa TrackIt, due per riga (una
// sotto l'altra sul telefono); in fondo i collegamenti.
// "vai" decide come si cambia pagina: dalla pagina principale si aggiunge alla
// cronologia, cosi' "indietro" nel browser riporta qui
export function Landing({ vai }: { vai: (destinazione: Href) => void }) {
  const styles = useStili(creaStili);
  const { t } = useTranslation();

  //l'illustrazione e' un'immagine con una descrizione: i suoi testi sono
  //importi di esempio, che letti uno per uno da un lettore di schermo non dicono nulla
  function riquadro(titolo: string, testo: string, descrizione: string, illustrazione: ReactNode) {
    return (
      <View style={styles.pcRiquadro}>
        <View style={styles.pcIllustrazione} role="img" aria-label={descrizione}>{illustrazione}</View>
        <Text role="heading" aria-level={3} style={styles.pcRiquadroTitolo}>{titolo}</Text>
        <Text style={styles.pcRiquadroTesto}>{testo}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.pcPagina}>
      <StatusBar style="light" />
      <View style={styles.pcTesta}>
        <View style={[styles.pcColonna, { maxWidth: LARGHEZZA_CONTENUTO + 80 }]}>
          <View style={styles.pcNavigazione}>
            <View style={styles.pcMarchio}>
              <Image source={LOGO} style={styles.pcLogo} accessibilityIgnoresInvertColors />
              <Text style={styles.pcNomeApp}>TrackIt</Text>
            </View>
            <View style={styles.pcAzioni}>
              <SelettoreLingua scuro />
              <Button mode="outlined" textColor={styles.pcNomeApp.color} style={styles.pcAccedi} onPress={() => vai("/login")}>
                {t("presentazione.p1.hoAccount")}
              </Button>
            </View>
          </View>
          <View style={styles.pcEroe}>
            <View style={styles.pcEroeTesti}>
              <Text role="heading" aria-level={1} style={styles.pcTitolo}>{t("presentazione.p1.titolo")}</Text>
              <Text style={styles.pcSottotitolo}>{t("presentazione.p1.testo")}</Text>
              <Button
                mode="contained"
                onPress={() => vai("/register")}
                style={styles.pcCrea}
                labelStyle={[styles.buttonLabel, styles.pcCreaTesto]}
              >
                {t("presentazione.p5.crea")}
              </Button>
              <Text style={styles.pcNota}>{t("presentazione.p5.testo")}</Text>
            </View>
            <IllustrazioneAssistente />
          </View>
        </View>
      </View>

      <View style={[styles.pcColonna, styles.pcCorpo, { maxWidth: LARGHEZZA_CONTENUTO + 80 }]}>
        <Text role="heading" aria-level={2} style={styles.pcSezione}>{t("presentazione.cosaFa")}</Text>
        <View style={styles.pcRiquadri}>
          {riquadro(
            t("presentazione.p2.titolo"),
            t("presentazione.p2.testo"),
            t("presentazione.descrizioni.spese"),
            <IllustrazioneSpese />
          )}
          {riquadro(
            t("presentazione.p3.titolo"),
            t("presentazione.p3.testo"),
            t("presentazione.descrizioni.budget"),
            <IllustrazioneBudget />
          )}
          {riquadro(
            t("presentazione.statistiche.titolo"),
            t("presentazione.statistiche.testo"),
            t("presentazione.descrizioni.statistiche"),
            <IllustrazioneStatistiche />
          )}
          {/* nel browser niente notifiche: vale il testo che non le promette */}
          {riquadro(
            t("presentazione.p4.titolo"),
            t("presentazione.p4.testoWeb"),
            t("presentazione.descrizioni.abbonamenti"),
            <IllustrazioneAbbonamenti />
          )}
        </View>
      </View>

      <View style={styles.piede}>
        <View style={[styles.pcColonna, styles.piedeRiga, { maxWidth: LARGHEZZA_CONTENUTO + 80 }]}>
          <View style={styles.piedeLink}>
            <Text style={styles.piedeVoce} role="link" onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}>
              {t("presentazione.piede.privacy")}
            </Text>
            <Text style={styles.piedeVoce} role="link" onPress={() => contattaSupporto()}>
              {t("profilo.contattaci")}
            </Text>
            <Text style={styles.piedeVoce} role="link" onPress={() => vai("/login")}>
              {t("accesso.accedi")}
            </Text>
          </View>
          <Text style={styles.piedeCopyright}>
            {t("presentazione.piede.copyright", { anno: new Date().getFullYear() })}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
