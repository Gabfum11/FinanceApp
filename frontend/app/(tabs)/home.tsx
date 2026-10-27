import { useCallback, useEffect, useRef, useState } from "react";
import { View, ScrollView, BackHandler } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Snackbar } from "react-native-paper";
import { API_URL } from "@/config";
import { creaStili } from "../../styles/home.styles";
import { apiFetch } from "@/utils/apiFetch";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TourGuidato } from "@/components/TourGuidato";
import { segnaBenvenutoVisto } from "@/utils/benvenuto";
import { usePreferenze } from "@/utils/preferenze";
import { useTranslation } from "react-i18next";
import { useSpazioBarra } from "@/utils/barraSchede";
import { useSchermoLargo, LARGHEZZA_CONTENUTO } from "@/utils/layout";
import { useStili } from "@/utils/tema";
import { Saluto } from "@/components/home/Saluto";
import { CardBudget, IntestazioneBudget, type StatoBudget } from "@/components/home/CardBudget";
import { CardSettimana, type DayStat } from "@/components/home/CardSettimana";
import { UltimeSpese, type Expense } from "@/components/home/UltimeSpese";
import { RiquadroCategorie, RiquadroRinnovi, type CategoriaStat, type Rinnovo } from "@/components/home/RiquadriComputer";

//scelta dell'utente sull'occhio: resta valida anche dopo aver chiuso l'app
const CHIAVE_SALDO = "mostra_saldo";

export default function HomeScreen() {
  const styles = useStili(creaStili);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  //sul computer la home e' un cruscotto: blocchi affiancati e due riquadri in piu'
  const largo = useSchermoLargo();
  const [categorie, setCategorie] = useState<CategoriaStat[]>([]);
  const [rinnovi, setRinnovi] = useState<Rinnovo[]>([]);
  //loadAll puo' partire due volte di fila (focus e riprova): il tour va aperto una volta sola
  const benvenutoAperto = useRef(false);
  const [tourVisibile, setTourVisibile] = useState(false);
  //"Rivedi il tutorial" dal profilo arriva qui con ?tour=1
  const { tour } = useLocalSearchParams<{ tour?: string }>();
  const tourDalProfilo = tour === "1";
  const [expenses, setExpenses] = useState<Expense[]>([]); //questo stato contiene un array di expense, inizialmente vuoto
  //serve a distinguere "non ho ancora caricato" da "non ci sono spese":
  //senza, il messaggio di lista vuota lampeggerebbe a ogni apertura
  const [expensesLoaded, setExpensesLoaded] = useState(false);
  const [nickname, setNickname] = useState("");
  //null finche' /auth/me non risponde: il tutorial non deve partire prima di saperlo
  const [tutorialVisto, setTutorialVisto] = useState<boolean | null>(null);
  const [budgetStatus, setBudgetStatus] = useState<StatoBudget | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<DayStat[]>([]);
  const [showExitDialog, setShowExitDialog] = useState(false);
  //senza avviso, un server irraggiungibile sembrerebbe un account senza dati
  const [loadError, setLoadError] = useState(false);
  //chi usa l'app in pubblico può nascondere le cifre, come nelle app bancarie
  const [saldoVisibile, setSaldoVisibile] = useState(true);
  const { importo: formatta, nascosto, sincronizza } = usePreferenze();
  const { t } = useTranslation();
  //i messaggi in basso compaiono sopra la barra delle schede, non sotto
  const spazioBarra = useSpazioBarra();

  useEffect(() => {
    AsyncStorage.getItem(CHIAVE_SALDO)
      .then((valore) => {
        if (valore === "false") setSaldoVisibile(false);
      })
      .catch(() => {});
  }, []);

  function cambiaVisibilita() {
    const nuovo = !saldoVisibile;
    setSaldoVisibile(nuovo);
    AsyncStorage.setItem(CHIAVE_SALDO, String(nuovo)).catch(() => {});
  }

  //un solo punto decide come mostrare una cifra: in chiaro o coperta
  function importo(valore: number) {
    return saldoVisibile ? formatta(valore) : nascosto;
  }
  async function loadExpenses() {
    //la Home ne mostra due: scaricare tutto lo storico a ogni apertura
    //sarebbe uno spreco che peggiora col passare del tempo
    const response = await apiFetch("/expenses/?limit=5");
    if (response.ok) {
      const data = await response.json();
      // console.log("Spese ricevute:",data) // dati sensibili, non loggare in produzione
      setExpenses(data);
      setExpensesLoaded(true);
    } else throw new Error(`${response.status}`);
    // else
    //   console.log("Spese non ricevute, status",response.status, await response.text());
  }
  async function loadBudget() {
    const response = await apiFetch("/budget/status");
    if (response.ok) {
      const data = await response.json();
      setBudgetStatus(data);
    } else throw new Error(`${response.status}`);
  }
  async function loadWeeklyStats() {
    const response = await apiFetch("/expenses/weekly-stats");
    if (response.ok) {
      const data = await response.json();
      setWeeklyStats(data.days);
    } else throw new Error(`${response.status}`);
  }
  async function loadCategorie() {
    const response = await apiFetch("/expenses/stats?cycle_offset=0");
    if (response.ok) setCategorie((await response.json()).categories);
    else throw new Error(`${response.status}`);
  }
  async function loadRinnovi() {
    const response = await apiFetch("/subscriptions/");
    if (!response.ok) throw new Error(`${response.status}`);
    const tutti: Rinnovo[] = await response.json();
    //i tre piu' vicini tra quelli attivi
    setRinnovi(tutti.filter((sub) => sub.is_active).sort((a, b) => a.next_date.localeCompare(b.next_date)).slice(0, 3));
  }
  async function loadAll() {
    setLoadError(false);
    try {
      await Promise.all([loadExpenses(), loadBudget(), loadWeeklyStats(), ...(largo ? [loadCategorie(), loadRinnovi()] : [])]);
    } catch {
      setLoadError(true);
    }
  }
  useFocusEffect(
    useCallback(()=>{
      loadAll();
      //passando al computer servono anche i dati dei riquadri in piu'
    },[largo])
  )

  //su Android il tasto indietro dalla Home chiuderebbe l'app di colpo:
  //l'ascolto vale solo mentre la Home e' a fuoco, le altre schermate tornano indietro normalmente
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        setShowExitDialog(true);
        return true; //true = gestito qui, il sistema non chiude l'app
      });
      return () => sub.remove();
    }, [])
  )
  async function loadUser() {
      const response = await apiFetch("/auth/me");
      if (response.ok) {
      const data = await response.json();
      // console.log("Dati utente ricevuti:", data); // dati sensibili, non loggare in produzione
      setNickname((data.nickname ?? "").trim());
      setTutorialVisto(data.tutorial_visto);
      //valuta e lingua seguono l'account, anche se cambiate da un altro telefono
      sincronizza(data);
      }
      // else {
      //   console.log("Errore /auth/me:", await response.text())
      // }

  }
  //a ogni ritorno sulla Home, non a ogni ridisegno: il nome cambiato in
  //"Modifica profilo" compare subito senza richieste continue a /auth/me
  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [])
  );

  //il flag sta sull'account: vale dopo la registrazione, al primo accesso
  //con Google e su un telefono nuovo. Il ritardo lascia disegnare la home,
  //altrimenti il tour misurerebbe i pulsanti prima che siano al loro posto
  useEffect(() => {
    if (tutorialVisto !== false || benvenutoAperto.current) return;
    benvenutoAperto.current = true;
    const id = setTimeout(() => setTourVisibile(true), 400);
    return () => clearTimeout(id);
  }, [tutorialVisto]);

  const fineTour = useCallback(() => {
    setTourVisibile(false);
    if (tourDalProfilo) {
      //dal profilo e' gia' segnato come visto: basta togliere il parametro,
      //che altrimenti farebbe ripartire il tour al ritorno sulla home
      router.setParams({ tour: undefined });
    } else {
      segnaBenvenutoVisto();
    }
  }, [tourDalProfilo, router]);

  const restoBudget = budgetStatus?.budget != null ? Math.max(budgetStatus.remaining ?? 0, 0) : 0;

  const intestazioneBudget = <IntestazioneBudget saldoVisibile={saldoVisibile} onCambiaVisibilita={cambiaVisibilita} />;
  const cardBudget = <CardBudget budgetStatus={budgetStatus} importo={importo} largo={largo} />;
  const cardSettimana = <CardSettimana weeklyStats={weeklyStats} saldoVisibile={saldoVisibile} importo={importo} largo={largo} />;
  const spese = (
    <UltimeSpese expenses={expenses} expensesLoaded={expensesLoaded} saldoVisibile={saldoVisibile} importo={importo} largo={largo} />
  );

  return (
    <View style={styles.screen}>
      {/* la pagina scorre: con schermi bassi o caratteri di sistema grandi
          i blocchi superavano l'altezza e le transazioni finivano sotto la barra */}
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 16, paddingBottom: spazioBarra },
          largo && styles.containerLargo,
          largo && { maxWidth: LARGHEZZA_CONTENUTO + 80 },
        ]}
      >
      <Saluto nickname={nickname} />
      {largo ? (
        <>
          {intestazioneBudget}
          <View style={styles.rigaLarga}>
            <View style={styles.colonnaPrincipale}>{cardBudget}</View>
            <View style={styles.colonnaLaterale}>{cardSettimana}</View>
          </View>
          <View style={[styles.rigaLarga, styles.rigaLargaDistanziata]}>
            <View style={styles.colonnaPrincipale}>{spese}</View>
            <View style={styles.colonnaLaterale}>
              <RiquadroCategorie categorie={categorie} restoBudget={restoBudget} importo={importo} />
              <RiquadroRinnovi rinnovi={rinnovi} saldoVisibile={saldoVisibile} />
            </View>
          </View>
        </>
      ) : (
        <>
          <View>
            {intestazioneBudget}
            {cardBudget}
          </View>
          {cardSettimana}
          {spese}
        </>
      )}
      </ScrollView>

      {(tourVisibile || tourDalProfilo) && <TourGuidato onFine={fineTour} dalProfilo={tourDalProfilo} />}

      <ConfirmDialog
        visible={showExitDialog}
        title={t("home.esciTitolo")}
        message={t("home.esciTesto")}
        confirmLabel={t("comune.esci")}
        icon="exit-to-app"
        onConfirm={() => {
          //da Android 12 l'uscita manda l'app in background senza chiuderla:
          //senza questo, alla riapertura la finestra sarebbe ancora aperta
          setShowExitDialog(false);
          BackHandler.exitApp();
        }}
        onDismiss={() => setShowExitDialog(false)}
      />

      <Snackbar
    wrapperStyle={{ marginBottom: spazioBarra }}
        visible={loadError}
        onDismiss={() => setLoadError(false)}
        action={{ label: t("comune.riprova"), onPress: loadAll }}
      >
        {t("home.erroreCaricamento")}
      </Snackbar>
    </View>
  );
}
