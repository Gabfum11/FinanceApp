import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  View,
  Image,
  FlatList,
  ScrollView,
  BackHandler,
  Platform,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Button, IconButton, Text, Snackbar } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { PRIVACY_URL } from "@/config";
import { GoogleButton } from "@/components/GoogleButton";
import { useGoogleLogin } from "@/utils/useGoogleLogin";
import { segnaPresentazioneVista } from "@/utils/presentazione";
import { usePreferenze } from "@/utils/preferenze";
import { localeDi, type Lingua } from "@/utils/formato";
import { useTranslation } from "react-i18next";
import { SelettoreLingua } from "@/components/SelettoreLingua";
import { colors } from "@/styles/tokens";
import { styles } from "@/styles/presentazione.styles";

const LOGO = require("../assets/images/logo/trackit-icon-rounded-180.png");
const PAGINE = [0, 1, 2, 3, 4];
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

function Punti({ attivo, scuri = false, centrati = false }: { attivo: number; scuri?: boolean; centrati?: boolean }) {
  const { t } = useTranslation();
  return (
    <View
      style={[styles.punti, centrati && styles.puntiCentrati]}
      accessible
      accessibilityLabel={t("presentazione.pagina", { n: attivo + 1, totale: PAGINE.length })}
    >
      {PAGINE.map((i) => (
        <View key={i} style={[styles.punto, scuri && styles.puntoScuro, i === attivo && styles.puntoAttivo]} />
      ))}
    </View>
  );
}

function IllustrazioneSpese() {
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

function IllustrazioneBudget() {
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

function IllustrazioneAbbonamenti() {
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

export default function Presentazione() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  //in una lista orizzontale ogni pagina e' alta quanto il suo contenuto, e nel
  //browser non si allunga da sola: si misura lo spazio vero e glielo si da'.
  //Anche la larghezza: su tablet e computer l'app e' una colonna piu' stretta
  //della finestra, e pagine larghe quanto la finestra uscirebbero dai lati
  const [{ width, altezza }, setSpazio] = useState({ width: 0, altezza: 0 });
  const lista = useRef<FlatList<number>>(null);
  const [pagina, setPagina] = useState(0);
  const [errore, setErrore] = useState("");
  const { t } = useTranslation();
  //le pagine sono elementi di una lista: senza, cambiando lingua resterebbero com'erano
  const { lingua } = usePreferenze();

  //da qui in poi l'utente ha scelto: la presentazione non ricompare
  const esci = useCallback(
    async (destinazione: Href) => {
      await segnaPresentazioneVista();
      router.replace(destinazione);
    },
    [router]
  );

  const google = useGoogleLogin({
    onSuccess: () => esci("/(tabs)/home"),
    onError: setErrore,
  });

  const vaiA = useCallback((indice: number) => {
    lista.current?.scrollToIndex({ index: indice, animated: true });
    setPagina(indice);
  }, []);

  //il tasto indietro di Android torna alla pagina precedente; dalla prima chiude l'app
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (pagina === 0) return false;
      vaiA(pagina - 1);
      return true;
    });
    return () => sub.remove();
  }, [pagina, vaiA]);

  //onScroll e non onMomentumScrollEnd: nel browser quest'ultimo non arriva
  function scorrimento(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const indice = Math.round(e.nativeEvent.contentOffset.x / width);
    if (indice !== pagina) setPagina(indice);
  }

  //impalcatura comune: intestazione, illustrazione, testi, punti e pulsanti.
  //Una funzione e non un componente: definito qui dentro, React lo vedrebbe
  //nuovo a ogni ridisegno e ricreerebbe la pagina da zero
  function struttura(indice: number, children: ReactNode, piede: ReactNode) {
    return (
      <ScrollView
        style={{ width, height: altezza }}
        contentContainerStyle={[styles.pagina, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}
      >
        <View style={styles.intestazione}>
          <IconButton
            icon="arrow-left"
            onPress={() => vaiA(indice - 1)}
            accessibilityLabel={t("comune.indietro")}
            style={styles.indietro}
          />
          {indice < PAGINE.length - 1 && <Button onPress={() => vaiA(PAGINE.length - 1)}>{t("comune.salta")}</Button>}
        </View>
        {children}
        {piede}
      </ScrollView>
    );
  }

  function avanti(indice: number) {
    return (
      <Button mode="contained" onPress={() => vaiA(indice + 1)} labelStyle={styles.buttonLabel}>
        {t("comune.avanti")}
      </Button>
    );
  }

  function testi(titolo: string, testo: string) {
    return (
      <View>
        <Text style={styles.titolo}>{titolo}</Text>
        <Text style={styles.testo}>{testo}</Text>
      </View>
    );
  }

  function disegna(indice: number) {
    switch (indice) {
      case 0:
        return (
          <ScrollView
            style={[{ width, height: altezza }, styles.paginaScura]}
            contentContainerStyle={[styles.pagina, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
          >
            {/* la lingua si sceglie subito: e' la prima cosa che si vede */}
            <SelettoreLingua scuro />
            <View style={styles.logoArea}>
              <View style={styles.cerchioEsterno}>
                <View style={styles.cerchioInterno}>
                  <Image source={LOGO} style={styles.logoGrande} accessibilityIgnoresInvertColors />
                </View>
              </View>
              <Text style={styles.nomeApp}>TrackIt</Text>
            </View>
            <Text style={styles.titoloScuro}>{t("presentazione.p1.titolo")}</Text>
            <Text style={styles.testoScuro}>{t("presentazione.p1.testo")}</Text>
            <Punti attivo={0} scuri />
            <Button mode="contained" onPress={() => vaiA(1)} labelStyle={styles.buttonLabel}>
              {t("presentazione.p1.inizia")}
            </Button>
            <Button textColor={colors.textOnPrimary} onPress={() => esci("/login")} style={{ marginTop: 8 }}>
              {t("presentazione.p1.hoAccount")}
            </Button>
          </ScrollView>
        );
      case 1:
        return (
          struttura(
            1,
            <>
            <View style={styles.illustrazione}>
              <IllustrazioneSpese />
            </View>
            {testi(t("presentazione.p2.titolo"), t("presentazione.p2.testo"))}
            </>,
            <><Punti attivo={1} />{avanti(1)}</>
          )
        );
      case 2:
        return (
          struttura(
            2,
            <>
            <View style={styles.illustrazione}>
              <IllustrazioneBudget />
            </View>
            {testi(t("presentazione.p3.titolo"), t("presentazione.p3.testo"))}
            </>,
            <><Punti attivo={2} />{avanti(2)}</>
          )
        );
      case 3:
        return (
          struttura(
            3,
            <>
            <View style={styles.illustrazione}>
              <IllustrazioneAbbonamenti />
            </View>
            {testi(t("presentazione.p4.titolo"), t(SUL_WEB ? "presentazione.p4.testoWeb" : "presentazione.p4.testo"))}
            </>,
            <><Punti attivo={3} />{avanti(3)}</>
          )
        );
      default:
        return struttura(
          4,
          <View style={styles.finale}>
            <Image source={LOGO} style={styles.logo} />
            <Text style={styles.logoNome}>TrackIt</Text>
            <Text style={[styles.titolo, styles.centrato]}>{t("presentazione.p5.titolo")}</Text>
            <Text style={[styles.testo, styles.centrato]}>{t("presentazione.p5.testo")}</Text>
          </View>,
              <>
                <Punti attivo={4} centrati />
                <Button mode="contained" onPress={() => esci("/register")} labelStyle={styles.buttonLabel}>
                  {t("presentazione.p5.crea")}
                </Button>
                {google.isReady && (
                  <>
                    <View style={styles.separatore}>
                      <View style={styles.separatoreLinea} />
                      <Text style={styles.separatoreTesto}>{t("comune.oppure")}</Text>
                      <View style={styles.separatoreLinea} />
                    </View>
                    <GoogleButton onPress={google.signIn} disabled={google.isLoading} />
                    {/* Google crea l'account a chi non ce l'ha: l'informativa va mostrata prima */}
                    <Text style={styles.legale}>
                      {t("accesso.legaleGoogle")}
                      <Text style={styles.legaleLink} onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}>
                        {t("accesso.informativa")}
                      </Text>
                    </Text>
                  </>
                )}
                <Text style={styles.accedi}>
                  {t("accesso.haiAccount")}{" "}
                  <Text style={styles.accediLink} onPress={() => esci("/login")}>
                    {t("accesso.accedi")}
                  </Text>
                </Text>
              </>
        );
    }
  }

  return (
    <View style={styles.container} onLayout={(e) => setSpazio({ width: e.nativeEvent.layout.width, altezza: e.nativeEvent.layout.height })}>
      {/* testo della barra di stato chiaro sulla prima pagina, che e' scura */}
      <StatusBar style={pagina === 0 ? "light" : "dark"} />
      {altezza > 0 && width > 0 && (
        <FlatList
          ref={lista}
          data={PAGINE}
          keyExtractor={(i) => String(i)}
          renderItem={({ item }) => disegna(item)}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onScroll={scorrimento}
          scrollEventThrottle={16}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          extraData={[width, altezza, insets.top, google.isReady, google.isLoading, lingua]}
        />
      )}
      <Snackbar visible={errore !== ""} onDismiss={() => setErrore("")}>
        {errore}
      </Snackbar>
    </View>
  );
}
