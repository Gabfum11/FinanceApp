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
import { StatusBar } from "expo-status-bar";
import { useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { PRIVACY_URL } from "@/config";
import { Landing, LOGO, IllustrazioneSpese, IllustrazioneBudget, IllustrazioneAbbonamenti } from "@/components/Landing";
import { GoogleButton } from "@/components/GoogleButton";
import { useGoogleLogin } from "@/utils/useGoogleLogin";
import { segnaPresentazioneVista } from "@/utils/presentazione";
import { usePreferenze } from "@/utils/preferenze";
import { useTranslation } from "react-i18next";
import { SelettoreLingua } from "@/components/SelettoreLingua";
import { creaStili } from "@/styles/presentazione.styles";
import { useStili, useTema } from "@/utils/tema";
import { useSchermoLargo } from "@/utils/layout";

const PAGINE = [0, 1, 2, 3, 4];
//nel browser non ci sono notifiche push: i testi non devono promettere avvisi
const SUL_WEB = Platform.OS === "web";

function Punti({ attivo, scuri = false, centrati = false }: { attivo: number; scuri?: boolean; centrati?: boolean }) {
  const styles = useStili(creaStili);
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

export default function Presentazione() {
  const styles = useStili(creaStili);
  const { colors } = useTema();
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
  //sul computer una pagina sola al posto del carosello: e' la stessa landing
  //della pagina principale, per chi ha installato TrackIt sul computer
  const largo = useSchermoLargo();

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

  if (largo) return <Landing vai={esci} />;

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
