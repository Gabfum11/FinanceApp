import { useCallback, useEffect, useRef, useState } from "react";
import { View, ScrollView, Pressable, BackHandler, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Button, Text, Snackbar, IconButton } from "react-native-paper";
import { BarChart } from "react-native-gifted-charts";
import { API_URL } from "@/config";
import { styles } from "../../styles/home.styles";
import { colors } from "../../styles/tokens";
import { apiFetch } from "@/utils/apiFetch";
import { formatDataSpesa } from "@/utils/date";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { TourGuidato } from "@/components/TourGuidato";
import { segnaBenvenutoVisto } from "@/utils/benvenuto";
import { bersaglio } from "@/utils/tour";
import { usePreferenze } from "@/utils/preferenze";
import { useTranslation } from "react-i18next";
import { useSpazioBarra } from "@/utils/barraSchede";
import { useSchermoStretto, LARGHEZZA_MASSIMA, SCHERMO_MOLTO_STRETTO } from "@/utils/layout";
import { nomeCategoria } from "@/utils/categorie";
import { localeAttuale } from "@/utils/date";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  useReducedMotion,
} from "react-native-reanimated";
type Expense = {
  id: number;
  description: string;
  amount: number;
  date: string;
  category_id: number | null; //può tornare utile
  category_name: string | null;
  created_at : string;
  //spesa pagata in un'altra valuta: amount è già convertito
  original_amount?: number | null;
  original_currency?: string | null;
};

type DayStat = {
  date: string;
  total: number;
};


//date string ->data della spesa (anno,mese,giorno)
//created at -> timestamp completo
function formatCycleRange(cycleStart: string, cycleEnd: string): string {
  const start = new Date(cycleStart);
  const end = new Date(cycleEnd);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${start.toLocaleDateString(localeAttuale(), opts)} - ${end.toLocaleDateString(localeAttuale(), opts)}`;
}

//scelta dell'utente sull'occhio: resta valida anche dopo aver chiuso l'app
const CHIAVE_SALDO = "mostra_saldo";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  //la colonna dell'app, non la finestra: su tablet e computer e' piu' stretta
  const larghezzaSchermo = Math.min(useWindowDimensions().width, LARGHEZZA_MASSIMA);
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
  const [budgetStatus, setBudgetStatus] = useState<{ budget: number | null; spent: number; remaining: number | null; cycle_start: string; cycle_end: string } | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<DayStat[]>([]);
  const [showExitDialog, setShowExitDialog] = useState(false);
  //senza avviso, un server irraggiungibile sembrerebbe un account senza dati
  const [loadError, setLoadError] = useState(false);
  //chi usa l'app in pubblico può nascondere le cifre, come nelle app bancarie
  const [saldoVisibile, setSaldoVisibile] = useState(true);
  const { importo: formatta, importoIn, nascosto, sincronizza } = usePreferenze();
  const { t } = useTranslation();
  //i messaggi in basso compaiono sopra la barra delle schede, non sotto
  const spazioBarra = useSpazioBarra();
  //la scritta "Assistente" resta quasi sempre: e' la funzione principale dell'app.
  //Se lo spazio manca e' il saluto a rimpicciolirsi; solo sui telefoni molto
  //stretti la pillola passa alla sola icona
  const stretto = useSchermoStretto(SCHERMO_MOLTO_STRETTO);
  const GIORNI_SETTIMANA = t("comune.giorniBrevi").split(",");
  const rotazioneBot = useSharedValue(0);

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
  const riduciMovimento = useReducedMotion();

  useEffect(() => {
    if (riduciMovimento) return;
    //un saluto breve ogni 4s, poi si ferma: invita a chiedere senza disturbare
    rotazioneBot.value = withRepeat(
      withDelay(4000, withSequence(
        withTiming(-12, { duration: 120 }),
        withTiming(12, { duration: 160 }),
        withTiming(-8, { duration: 140 }),
        withTiming(0, { duration: 120 }),
      )),
      3,
    );
  }, [riduciMovimento]);

  const salutoStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotazioneBot.value}deg` }],
  }));
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
  async function loadAll() {
    setLoadError(false);
    try {
      await Promise.all([loadExpenses(), loadBudget(), loadWeeklyStats()]);
    } catch {
      setLoadError(true);
    }
  }
  useFocusEffect(
    useCallback(()=>{
      loadAll();
    },[])
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

  const percentage = budgetStatus?.budget
    ? Math.min((budgetStatus.spent / budgetStatus.budget) * 100, 100)
    : 0;

  const todayStr = new Date().toDateString();
  const weeklyChartData = weeklyStats.map((day) => {
    const isToday = new Date(day.date).toDateString() === todayStr;
    return {
      value: day.total,
      label: GIORNI_SETTIMANA[new Date(day.date).getDay() === 0 ? 6 : new Date(day.date).getDay() - 1],
      frontColor: isToday ? colors.primary : colors.overlayMuted,
      topLabelComponent: () => (
        <Text style={styles.weeklyBarLabel}>
          {saldoVisibile ? formatta(day.total, 0) : "••"}
        </Text>
      ),
    };
  });

  // La scala parte da una soglia fissa invece di adattarsi sempre al massimo:
  // con la sola scala relativa una giornata da 5 euro riempiva il grafico
  // quanto una da 200, e l'altezza delle barre non diceva piu' nulla.
  // Sopra i 40 euro la scala torna ad adattarsi, se no le spese grandi
  // uscirebbero dal riquadro.
  const SOGLIA_SCALA = 40;
  const speseMassime = Math.max(...weeklyStats.map((day) => day.total), 0);
  // il fattore lascia spazio sopra la barra piu alta per l'etichetta del valore
  const weeklyMaxValue = Math.max(speseMassime * 1.3, SOGLIA_SCALA);
  //con barre da 35 fisse il grafico chiedeva ~410 punti: sotto, la domenica
  //usciva dal riquadro. Si parte dallo spazio vero (schermo meno i margini
  //della pagina e della card) e le barre si stringono quanto serve
  const SPAZIO_BARRE = 8;
  const spazioGrafico = larghezzaSchermo - 2 * 24 - 2 * 20 - 2 * SPAZIO_BARRE;
  const larghezzaBarra = Math.max(
    16,
    Math.min(35, (spazioGrafico - SPAZIO_BARRE * (GIORNI_SETTIMANA.length - 1)) / GIORNI_SETTIMANA.length)
  );

  return (
    <View style={styles.screen}>
      {/* la pagina scorre: con schermi bassi o caratteri di sistema grandi
          i blocchi superavano l'altezza e le transazioni finivano sotto la barra */}
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: spazioBarra }]}>
      <View style={styles.titleRow}>
        {/* una riga sola: con un nome lungo il testo si rimpicciolisce invece di
            andare a capo o finire sotto la pillola */}
        <Text variant="headlineMedium" style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {t("home.ciao", { nome: nickname })}
        </Text>
        <Pressable
          ref={bersaglio("assistente")}
          onPress={() => router.push("/assistant")}
          accessibilityRole="button"
          accessibilityLabel={t("home.apriAssistente")}
          accessibilityHint={t("home.suggerimentoAssistente")}
          hitSlop={8}
          style={({ pressed }) => [
            styles.assistantButton,
            pressed && styles.assistantButtonPressed,
          ]}
        >
          <Animated.Image
            source={require("../../assets/images/logo/trackit-bot-1024.png")}
            style={[styles.assistantIcon, salutoStyle]}
          />
          {!stretto && <Text style={styles.assistantButtonLabel}>{t("home.assistente")}</Text>}
        </Pressable>
      </View>
      <View>
        <View style={styles.headerRow}>
          <Text variant="titleMedium">{t("home.budget")}</Text>
          <View style={styles.headerActions}>
            {/* nella riga del titolo e non nella card: la card compare solo
                con un budget impostato, le transazioni invece sempre */}
            {/* le View con collapsable={false} servono al tour per misurare il pulsante */}
            <View ref={bersaglio("nuovo-budget")} collapsable={false}>
              <Link href="/set_budget" asChild>
                <Button mode="contained" style={styles.budgButt} labelStyle={styles.buttonLabel}>
                  {t("home.nuovo")}
                </Button>
              </Link>
            </View>
            {/* con il bordo, come il logout del profilo: un'icona da sola
                accanto a un pulsante vero non sembrava toccabile */}
            <View ref={bersaglio("occhio")} collapsable={false}>
            <IconButton
              icon={saldoVisibile ? "eye-outline" : "eye-off-outline"}
              mode="outlined"
              size={20}
              iconColor={colors.textSecondary}
              onPress={cambiaVisibilita}
              style={styles.eyeButton}
              accessibilityLabel={saldoVisibile ? t("home.nascondi") : t("home.mostra")}
            />
            </View>
          </View>
        </View>
        {/* solo a caricamento finito, se no lampeggerebbe a ogni apertura */}
        {budgetStatus && budgetStatus.budget == null && (
          <Pressable style={styles.emptyState} onPress={() => router.push("/set_budget")}>
            <MaterialCommunityIcons name="cash" size={40} color={colors.chevron} />
            <Text style={styles.emptyTitle}>{t("home.nessunBudget")}</Text>
            <Text style={styles.emptyHint}>
              {t("home.nessunBudgetTesto")}
            </Text>
          </Pressable>
        )}
        {budgetStatus?.budget != null && (
          <View style={styles.budgetCard}>
            <View style={styles.budgetDecorCircle} />
            <View style={styles.budgetLabelRow}>
              <Text style={styles.budgetLabel}>{t("home.libero")}</Text>
              <Text style={styles.budgetCycleRange}>
                {formatCycleRange(budgetStatus.cycle_start, budgetStatus.cycle_end)}
              </Text>
            </View>
            <View style={styles.budgetAmountRow}>
              <Text style={styles.budgetRemaining}>{importo(budgetStatus.remaining ?? 0)}</Text>
              <Text style={styles.budgetOf}>{t("home.di", { totale: importo(budgetStatus.budget) })}</Text>
            </View>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
            </View>
            <View style={styles.budgetLegendRow}>
              <View style={styles.budgetLegendItem}>
                <View style={[styles.budgetLegendDot, { backgroundColor: colors.primary }]} />
                <Text style={styles.budgetLegendText}>{t("home.speso", { importo: importo(budgetStatus.spent) })}</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {weeklyChartData.length > 0 && (
        <View style={styles.weeklyCard}>
          <Text style={styles.weeklyTitle}>{t("home.settimana")}</Text>
          <View style={styles.weeklyChartWrapper}>
            <BarChart
              data={weeklyChartData}
              barWidth={larghezzaBarra}
              spacing={SPAZIO_BARRE}
              initialSpacing={SPAZIO_BARRE}
              endSpacing={SPAZIO_BARRE}
              yAxisLabelWidth={0}
              roundedTop
              hideRules
              hideYAxisText
              yAxisThickness={0}
              xAxisThickness={0}
              xAxisLabelTextStyle={{ color: colors.textOnDarkMuted, fontSize: 12 }}
              noOfSections={3}
              height={100}
              maxValue={weeklyMaxValue}
              barStyle={{ overflow: "visible" }}
              topLabelContainerStyle={styles.weeklyBarLabelContainer}
            />
          </View>
        </View>
      )}

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t("home.ultime")}
        </Text>
        {expenses.length > 0 && (
          <Link href="/all_expenses" asChild>
            <Text style={styles.linkExpenses}>{t("home.vediTutte")}</Text>
          </Link>
        )}
      {/* due righe al massimo: un semplice elenco, perche' una FlatList
          dentro uno ScrollView che scorre nello stesso verso da' problemi */}
      {expenses.slice(0, 2).map((item) => (
        <View key={item.id} style={styles.expenseRow}>
          <View style={styles.expenseInfo}>
            <Text style={styles.expenseDescription}>{item.description}</Text>
            <Text style={styles.expenseMeta}>{nomeCategoria(item.category_name)}{" · "}{formatDataSpesa(item.date)}</Text>
          </View>
          <View style={styles.amountColumn}>
            <Text style={styles.expenseAmount}>- {importo(item.amount)}</Text>
            {saldoVisibile && item.original_currency && item.original_amount != null && (
              <Text style={styles.expenseOriginal}>{importoIn(item.original_amount, item.original_currency)}</Text>
            )}
          </View>
        </View>
      ))}
      {expensesLoaded && expenses.length === 0 && (
        <Pressable style={styles.emptyState} onPress={() => router.push("/add_expense")}>
          <MaterialCommunityIcons name="receipt-text-outline" size={40} color="#C7C7CC" />
          <Text style={styles.emptyTitle}>{t("home.nessunaSpesa")}</Text>
          <Text style={styles.emptyHint}>
            {t("home.nessunaSpesaTesto")}
          </Text>
        </Pressable>
      )}
      </ScrollView>

      {(tourVisibile || tourDalProfilo) && <TourGuidato onFine={fineTour} dalProfilo={tourDalProfilo} />}

      <ConfirmDialog
        visible={showExitDialog}
        title={t("home.esciTitolo")}
        message={t("home.esciTesto")}
        confirmLabel={t("comune.esci")}
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
