import type { ReactNode } from "react";
import { View, Image, ScrollView, Platform } from "react-native";
import { Button, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import type { Href } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useTranslation } from "react-i18next";
import { PRIVACY_URL } from "@/config";
import { SelettoreLingua } from "@/components/SelettoreLingua";
import { usePreferenze } from "@/utils/preferenze";
import { localeDi, type Lingua } from "@/utils/formato";
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
          <View style={styles.esitoIcona}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={20} color={colors.primaryDark} />
          </View>
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
  const scala = Math.max(...SPESE_SETTIMANA) * 1.3;
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
                    height: (valore / scala) * 90,
                    backgroundColor: i === oggi ? colors.primary : colors.overlayMuted,
                  },
                ]}
              />
            </View>
          ))}
        </View>
        <View style={styles.giorni}>
          {t("comune.giorniBrevi").split(",").map((g, i) => (
            <Text key={i} style={styles.giorno}>{g}</Text>
          ))}
        </View>
      </View>
    </>
  );
}

function Abbonamento({ nome, meta, importo }: { nome: string; meta: string; importo: string }) {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  return (
    <View style={styles.abbonamento}>
      <View style={styles.abbonamentoIcona}>
        <MaterialCommunityIcons name="repeat" size={20} color={colors.primary} />
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
      <Abbonamento nome={t("presentazione.p4.palestra")} meta={t("presentazione.p4.palestraMeta")} importo={importo(39.9)} />
      <Abbonamento nome="Netflix" meta={t("presentazione.p4.netflixMeta")} importo={importo(13.99)} />
    </>
  );
}

// In alto la domanda e il pulsante per registrarsi, sotto le tre cose che fa
// TrackIt affiancate (una sotto l'altra sul telefono), in fondo i collegamenti.
// "vai" decide come si cambia pagina: dalla pagina principale si aggiunge alla
// cronologia, cosi' "indietro" nel browser riporta qui
export function Landing({ vai }: { vai: (destinazione: Href) => void }) {
  const styles = useStili(creaStili);
  const { t } = useTranslation();

  function riquadro(titolo: string, testo: string, illustrazione: ReactNode) {
    return (
      <View style={styles.pcRiquadro}>
        <View style={styles.pcIllustrazione}>{illustrazione}</View>
        <Text style={styles.pcRiquadroTitolo}>{titolo}</Text>
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
                labelStyle={styles.buttonLabel}
              >
                {t("presentazione.p5.crea")}
              </Button>
              <Text style={styles.pcNota}>{t("presentazione.p5.testo")}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.pcColonna, styles.pcCorpo, { maxWidth: LARGHEZZA_CONTENUTO + 80 }]}>
        <Text role="heading" aria-level={2} style={styles.pcSezione}>{t("presentazione.cosaFa")}</Text>
        <View style={styles.pcRiquadri}>
          {riquadro(t("presentazione.p2.titolo"), t("presentazione.p2.testo"), <IllustrazioneSpese />)}
          {riquadro(t("presentazione.p3.titolo"), t("presentazione.p3.testo"), <IllustrazioneBudget />)}
          {/* nel browser niente notifiche: vale il testo che non le promette */}
          {riquadro(t("presentazione.p4.titolo"), t("presentazione.p4.testoWeb"), <IllustrazioneAbbonamenti />)}
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
