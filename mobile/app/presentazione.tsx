import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  View,
  Image,
  FlatList,
  ScrollView,
  BackHandler,
  Platform,
  useWindowDimensions,
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
import { colors } from "@/styles/tokens";
import { styles } from "@/styles/presentazione.styles";

const LOGO = require("../assets/images/logo/trackit-icon-rounded-180.png");
const PAGINE = [0, 1, 2, 3, 4];
//nel browser non ci sono notifiche push: i testi non devono promettere avvisi
const SUL_WEB = Platform.OS === "web";
const GIORNI = ["L", "M", "M", "G", "V", "S", "D"];
//importi di esempio della settimana: servono solo a far vedere il grafico
const SPESE_SETTIMANA = [12, 0, 25, 8, 34, 18, 0];

//date vere invece di scritte fisse: "1 mar - 28 mar" letto a ottobre
//farebbe sembrare l'illustrazione vecchia
function ieri(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString("it-IT");
}

function periodoBudget(): string {
  //esempio con il mese che riparte il 27, come per chi prende lo stipendio
  const oggi = new Date();
  const inizio = new Date(oggi.getFullYear(), oggi.getMonth() - (oggi.getDate() < 27 ? 1 : 0), 27);
  const fine = new Date(inizio.getFullYear(), inizio.getMonth() + 1, 26);
  const opzioni: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${inizio.toLocaleDateString("it-IT", opzioni)} - ${fine.toLocaleDateString("it-IT", opzioni)}`;
}

function Punti({ attivo, scuri = false, centrati = false }: { attivo: number; scuri?: boolean; centrati?: boolean }) {
  return (
    <View
      style={[styles.punti, centrati && styles.puntiCentrati]}
      accessible
      accessibilityLabel={`Pagina ${attivo + 1} di ${PAGINE.length}`}
    >
      {PAGINE.map((i) => (
        <View key={i} style={[styles.punto, scuri && styles.puntoScuro, i === attivo && styles.puntoAttivo]} />
      ))}
    </View>
  );
}

function IllustrazioneSpese() {
  const { importo } = usePreferenze();
  return (
    <>
      <View style={styles.fumetto}>
        <Text style={styles.fumettoTesto}>40 euro supermercato ieri</Text>
      </View>
      <View style={styles.esito}>
        <View style={styles.esitoTesta}>
          <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />
          <Text style={styles.esitoTitolo}>Spesa aggiunta</Text>
        </View>
        <View style={styles.esitoCorpo}>
          <View style={styles.esitoIcona}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={20} color={colors.primaryDark} />
          </View>
          <View style={styles.esitoInfo}>
            <Text style={styles.esitoDescrizione}>Supermercato</Text>
            <Text style={styles.esitoMeta}>Spesa alimentare · {ieri()}</Text>
          </View>
          <Text style={styles.esitoImporto}>{importo(40)}</Text>
        </View>
      </View>
    </>
  );
}

function IllustrazioneBudget() {
  const { importo } = usePreferenze();
  const oggi = (new Date().getDay() + 6) % 7; //lunedi' = 0, come le etichette
  const scala = Math.max(...SPESE_SETTIMANA) * 1.3;
  return (
    <>
      <View style={styles.budgetCard}>
        <View style={styles.budgetCerchio} />
        <View style={styles.budgetRiga}>
          <Text style={styles.budgetEtichetta}>LIBERO QUESTO MESE</Text>
          <Text style={styles.budgetPeriodo}>{periodoBudget()}</Text>
        </View>
        <View style={styles.budgetImporti}>
          <Text style={styles.budgetResto}>{importo(412.5)}</Text>
          <Text style={styles.budgetTotale}>di {importo(800)}</Text>
        </View>
        <View style={styles.barra}>
          <View style={styles.barraPiena} />
        </View>
        <View style={styles.legenda}>
          <View style={styles.legendaPunto} />
          <Text style={styles.legendaTesto}>Speso {importo(387.5)}</Text>
        </View>
      </View>
      <View style={styles.settimana}>
        <Text style={styles.settimanaTitolo}>Spese settimanali</Text>
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
          {GIORNI.map((g, i) => (
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
  return (
    <>
      {!SUL_WEB && (
        <View style={styles.notifica}>
          <Image source={LOGO} style={styles.notificaIcona} />
          <View style={{ flex: 1 }}>
            <Text style={styles.notificaApp}>TrackIt</Text>
            <Text style={styles.notificaTitolo}>Palestra si rinnova domani</Text>
            <Text style={styles.notificaTesto}>{importo(39.9)} · mensile</Text>
          </View>
        </View>
      )}
      <Text style={styles.sezione}>Abbonamenti attivi</Text>
      <Abbonamento nome="Palestra" meta="Palestra · Scade domani" importo={importo(39.9)} />
      <Abbonamento nome="Netflix" meta="Abbonamenti digitali · Scade tra 9 giorni" importo={importo(13.99)} />
    </>
  );
}

export default function Presentazione() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  //in una lista orizzontale ogni pagina e' alta quanto il suo contenuto, e nel
  //browser non si allunga da sola: si misura lo spazio vero e glielo si da'
  const [altezza, setAltezza] = useState(0);
  const lista = useRef<FlatList<number>>(null);
  const [pagina, setPagina] = useState(0);
  const [errore, setErrore] = useState("");

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
            accessibilityLabel="Indietro"
            style={styles.indietro}
          />
          {indice < PAGINE.length - 1 && <Button onPress={() => vaiA(PAGINE.length - 1)}>Salta</Button>}
        </View>
        {children}
        {piede}
      </ScrollView>
    );
  }

  function avanti(indice: number) {
    return (
      <Button mode="contained" onPress={() => vaiA(indice + 1)} labelStyle={styles.buttonLabel}>
        Avanti
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
            <View style={styles.logoArea}>
              <View style={styles.cerchioEsterno}>
                <View style={styles.cerchioInterno}>
                  <Image source={LOGO} style={styles.logoGrande} accessibilityIgnoresInvertColors />
                </View>
              </View>
              <Text style={styles.nomeApp}>TrackIt</Text>
            </View>
            <Text style={styles.titoloScuro}>Sai dove finiscono i tuoi soldi?</Text>
            <Text style={styles.testoScuro}>TrackIt te lo dice, senza fogli Excel né fatica.</Text>
            <Punti attivo={0} scuri />
            <Button mode="contained" onPress={() => vaiA(1)} labelStyle={styles.buttonLabel}>
              Inizia
            </Button>
            <Button textColor={colors.textOnPrimary} onPress={() => esci("/login")} style={{ marginTop: 8 }}>
              Ho già un account
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
            {testi("Scrivi la spesa come la diresti", "Al resto pensa TrackIt: importo, data e categoria.")}
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
            {testi("Sai sempre quanto ti resta", "Ogni spesa aggiorna il budget del mese in tempo reale.")}
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
            {testi(
              "Niente rinnovi a sorpresa",
              SUL_WEB
                ? "Ogni rinnovo si registra da solo. Disdici in tempo ciò che non usi più."
                : "Ti avvisiamo il giorno prima. Disdici in tempo ciò che non usi più."
            )}
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
            <Text style={[styles.titolo, styles.centrato]}>Salva le tue spese</Text>
            <Text style={[styles.testo, styles.centrato]}>
              Account gratuito. I dati restano tuoi: esportali o cancellali quando vuoi.
            </Text>
          </View>,
              <>
                <Punti attivo={4} centrati />
                <Button mode="contained" onPress={() => esci("/register")} labelStyle={styles.buttonLabel}>
                  Crea un account
                </Button>
                {google.isReady && (
                  <>
                    <View style={styles.separatore}>
                      <View style={styles.separatoreLinea} />
                      <Text style={styles.separatoreTesto}>oppure</Text>
                      <View style={styles.separatoreLinea} />
                    </View>
                    <GoogleButton onPress={google.signIn} disabled={google.isLoading} />
                    {/* Google crea l'account a chi non ce l'ha: l'informativa va mostrata prima */}
                    <Text style={styles.legale}>
                      Continuando con Google confermi di aver letto l&apos;
                      <Text style={styles.legaleLink} onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}>
                        informativa sulla privacy
                      </Text>
                    </Text>
                  </>
                )}
                <Text style={styles.accedi}>
                  Hai già un account?{" "}
                  <Text style={styles.accediLink} onPress={() => esci("/login")}>
                    Accedi
                  </Text>
                </Text>
              </>
        );
    }
  }

  return (
    <View style={styles.container} onLayout={(e) => setAltezza(e.nativeEvent.layout.height)}>
      {/* testo della barra di stato chiaro sulla prima pagina, che e' scura */}
      <StatusBar style={pagina === 0 ? "light" : "dark"} />
      {altezza > 0 && (
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
          extraData={[width, altezza, insets.top, google.isReady, google.isLoading]}
        />
      )}
      <Snackbar visible={errore !== ""} onDismiss={() => setErrore("")}>
        {errore}
      </Snackbar>
    </View>
  );
}
