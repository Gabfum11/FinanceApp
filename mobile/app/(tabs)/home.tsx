import { useCallback, useEffect, useRef, useState } from "react";
import { View, ScrollView, Pressable, BackHandler, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Button, Text, Snackbar, IconButton } from "react-native-paper";
import { BarChart, PieChart } from "react-native-gifted-charts";
import { API_URL } from "@/config";
import { creaStili } from "../../styles/home.styles";
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
import { useSchermoStretto, useSchermoLargo, LARGHEZZA_MASSIMA, LARGHEZZA_CONTENUTO, SCHERMO_MOLTO_STRETTO } from "@/utils/layout";
import { colorePerGruppo } from "@/utils/categoryIcons";
import { IconaCategoria } from "@/components/IconaCategoria";
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
import { useStili, useTema } from "@/utils/tema";
type Expense = {
  id: number;
  description: string;
  amount: number;
  date: string;
  category_id: number | null; //può tornare utile
  category_name: string | null;
  //gruppo della sottocategoria: colore e icona di ripiego
  category_group?: string | null;
  created_at : string;
  //spesa pagata in un'altra valuta: amount è già convertito
  original_amount?: number | null;
  original_currency?: string | null;
};

type DayStat = {
  date: string;
  total: number;
};

//per i riquadri che la home mostra solo sul computer
type CategoriaStat = { category_name: string; total: number };
type Rinnovo = {
  id: number; description: string; amount: number; next_date: string; is_active: boolean; currency?: string | null;
  //per l'icona, come nella scheda Abbonamenti
  category_name?: string | null; category_group?: string | null;
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
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  //la colonna dell'app, non la finestra: su tablet e computer e' piu' stretta
  const larghezzaSchermo = Math.min(useWindowDimensions().width, LARGHEZZA_MASSIMA);
  //sul computer la home e' un cruscotto: blocchi affiancati e due riquadri in piu'
  const largo = useSchermoLargo();
  //sul computer il grafico misura la sua card, che non dipende dallo schermo
  const [larghezzaSettimana, setLarghezzaSettimana] = useState(0);
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

  const percentage = budgetStatus?.budget
    ? Math.min((budgetStatus.spent / budgetStatus.budget) * 100, 100)
    : 0;
  //la barra cambia colore avvicinandosi al limite: prima restava verde anche
  //al 99%, e superato il budget si fermava piena senza dire altro
  const quotaSpesa = budgetStatus?.budget ? budgetStatus.spent / budgetStatus.budget : 0;
  const coloreBarra =
    quotaSpesa >= 1 ? colors.budgetSforato : quotaSpesa >= 0.8 ? colors.warning : colors.primary;
  const totaleSettimana = weeklyStats.reduce((somma, day) => somma + day.total, 0);

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
  const spazioGrafico = largo
    ? larghezzaSettimana - 2 * 20 - 2 * SPAZIO_BARRE
    : larghezzaSchermo - 2 * 24 - 2 * 20 - 2 * SPAZIO_BARRE;
  const larghezzaBarra = Math.max(
    16,
    Math.min(largo ? 44 : 35, (spazioGrafico - SPAZIO_BARRE * (GIORNI_SETTIMANA.length - 1)) / GIORNI_SETTIMANA.length)
  );

  //riassunto delle categorie, solo sul computer: la ciambella piccola e le prime quattro
  const spesoCategorie = categorie.reduce((somma, c) => somma + c.total, 0);
  const restoBudget = budgetStatus?.budget != null ? Math.max(budgetStatus.remaining ?? 0, 0) : 0;
  const datiCiambella = [
    ...categorie.map((c) => ({ value: c.total, color: colorePerGruppo(c.category_name) })),
    ...(restoBudget > 0 ? [{ value: restoBudget, color: colors.donutRemaining }] : []),
  ];

  const saluto = (
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
  );

  const intestazioneBudget = (
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
  );

  const cardBudget = (
      <>
        {/* solo a caricamento finito, se no lampeggerebbe a ogni apertura */}
        {budgetStatus && budgetStatus.budget == null && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcona}>
              <MaterialCommunityIcons name="cash" size={30} color={colors.primaryDark} />
            </View>
            <Text style={styles.emptyTitle}>{t("home.nessunBudget")}</Text>
            <Text style={styles.emptyHint}>{t("home.nessunBudgetBreve")}</Text>
            {/* verde tenue: viene dopo la prima spesa, che ha il pulsante pieno */}
            <Pressable
              style={({ pressed }) => [styles.emptyPulsante, styles.emptyPulsanteTenue, pressed && styles.premuto]}
              onPress={() => router.push("/set_budget")}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="plus" size={18} color={colors.primaryDark} />
              <Text style={[styles.emptyPulsanteTesto, styles.emptyPulsanteTestoTenue]}>{t("statistiche.impostaBudgetBreve")}</Text>
            </Pressable>
          </View>
        )}
        {budgetStatus?.budget != null && (
          <View style={[styles.budgetCard, largo && styles.cardInRiga]}>
            <View style={styles.budgetDecorCircle} />
            <View style={styles.budgetLabelRow}>
              <Text style={styles.budgetLabel}>{t("home.libero")}</Text>
              <Text style={styles.budgetCycleRange}>
                {formatCycleRange(budgetStatus.cycle_start, budgetStatus.cycle_end)}
              </Text>
            </View>
            <View style={styles.budgetAmountRow}>
              <Text style={[styles.budgetRemaining, largo && styles.budgetRemainingLargo]}>{importo(budgetStatus.remaining ?? 0)}</Text>
              <Text style={styles.budgetOf}>{t("home.di", { totale: importo(budgetStatus.budget) })}</Text>
            </View>
            <View
              style={styles.progressBarBackground}
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: Math.round(quotaSpesa * 100) }}
            >
              <View style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: coloreBarra }]} />
            </View>
            <View style={styles.budgetLegendRow}>
              <View style={styles.budgetLegendItem}>
                <View style={[styles.budgetLegendDot, { backgroundColor: coloreBarra }]} />
                <Text style={styles.budgetLegendText}>{t("home.speso", { importo: importo(budgetStatus.spent) })}</Text>
              </View>
            </View>
          </View>
        )}
      </>
  );

  const cardSettimana = weeklyChartData.length > 0 && (
        <View
          style={[styles.weeklyCard, largo && styles.cardInRiga]}
          onLayout={(e) => setLarghezzaSettimana(e.nativeEvent.layout.width)}
        >
          <View style={styles.weeklyTitleRow}>
            <Text style={styles.weeklyTitle}>{t("home.settimana")}</Text>
            <Text style={styles.weeklyTotal}>
              {t("home.totaleSettimana")} <Text style={styles.weeklyTotalValue}>{importo(totaleSettimana)}</Text>
            </Text>
          </View>
          <View style={styles.weeklyChartWrapper}>
            {/* sul computer si disegna solo quando si conosce la larghezza della card */}
            {(!largo || larghezzaSettimana > 0) && (
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
            )}
          </View>
        </View>
  );

  const spese = (
      <>
        {/* "Vedi tutte" sulla riga del titolo: prima stava su una riga da sola,
            verde chiaro su grigio (2:1), e sembrava un'etichetta */}
        <View style={[styles.sectionTitleRow, largo && styles.sectionTitleLargo]}>
          <Text style={styles.sectionTitle} accessibilityRole="header">{t("home.ultime")}</Text>
          {expenses.length > 0 && (
            <Link href="/all_expenses" asChild>
              <Pressable
                style={({ pressed }) => [styles.linkExpenses, pressed && styles.premuto]}
                accessibilityRole="link"
                hitSlop={4}
              >
                <Text style={styles.linkExpensesTesto}>{t("home.vediTutte")}</Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color={colors.primaryDark} />
              </Pressable>
            </Link>
          )}
        </View>
      {/* due righe sul telefono, cinque sul computer: un semplice elenco, perche'
          una FlatList dentro uno ScrollView che scorre nello stesso verso da' problemi */}
      {/* un solo riquadro con le righe separate da una linea: prima ogni riga
          era una card con ombra, bordo e margine, e sembravano staccate */}
      {expenses.length > 0 && (
        <View style={styles.expenseList}>
          {expenses.slice(0, largo ? 5 : 2).map((item, indice) => (
            <View key={item.id} style={[styles.expenseRow, indice > 0 && styles.expenseRowSeparata]}>
              <IconaCategoria categoria={item.category_name} gruppo={item.category_group} />
              <View style={styles.expenseInfo}>
                <Text style={styles.expenseDescription}>{item.description}</Text>
                <Text style={styles.expenseMeta}>{nomeCategoria(item.category_name)}{" · "}{formatDataSpesa(item.date)}</Text>
              </View>
              <View style={styles.amountColumn}>
                {/* colore neutro: se ogni riga e' rossa il rosso non avvisa piu' di niente.
                    Il segno meno vero, attaccato alla cifra, non va a capo da solo */}
                <Text style={styles.expenseAmount}>−{importo(item.amount)}</Text>
                {saldoVisibile && item.original_currency && item.original_amount != null && (
                  <Text style={styles.expenseOriginal}>{importoIn(item.original_amount, item.original_currency)}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
      {expensesLoaded && expenses.length === 0 && (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcona}>
            <MaterialCommunityIcons name="receipt-text" size={30} color={colors.primaryDark} />
          </View>
          <Text style={styles.emptyTitle}>{t("home.nessunaSpesa")}</Text>
          <Text style={styles.emptyHint}>{t("home.nessunaSpesaBreve")}</Text>
          {/* un pulsante vero al posto di "tocca + in basso": la prima cosa da fare */}
          <Pressable
            style={({ pressed }) => [styles.emptyPulsante, pressed && styles.premuto]}
            onPress={() => router.push("/add_expense")}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="plus" size={18} color={colors.surfaceDark} />
            <Text style={styles.emptyPulsanteTesto}>{t("schede.aggiungi")}</Text>
          </Pressable>
        </View>
      )}
      </>
  );

  //solo sul computer: sul telefono stanno nelle loro schede
  const riquadroCategorie = (
      <View style={styles.riquadro}>
        <View style={styles.riquadroTesta}>
          <Text style={styles.riquadroTitolo}>{t("home.doveVanno")}</Text>
        </View>
        {categorie.length === 0 ? (
          <Text style={styles.emptyHint}>{t("home.nessunaCategoria")}</Text>
        ) : (
          <View style={styles.miniStatistiche}>
            <PieChart
              data={datiCiambella}
              donut
              radius={56}
              innerRadius={44}
              innerCircleColor={colors.surface}
              centerLabelComponent={() => (
                <Text style={styles.miniTotale}>{importo(spesoCategorie)}</Text>
              )}
            />
            <View style={styles.miniLegenda}>
              {categorie.slice(0, 4).map((c) => (
                <View key={c.category_name} style={styles.miniRiga}>
                  <IconaCategoria gruppo={c.category_name} dimensione={24} />
                  <Text style={styles.miniNome} numberOfLines={1}>{nomeCategoria(c.category_name)}</Text>
                  <Text style={styles.miniImporto}>{importo(c.total)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
  );

  const riquadroRinnovi = (
      <View style={styles.riquadro}>
        <View style={styles.riquadroTesta}>
          <Text style={styles.riquadroTitolo}>{t("home.prossimiRinnovi")}</Text>
        </View>
        {rinnovi.length === 0 ? (
          <Text style={styles.emptyHint}>{t("home.nessunRinnovo")}</Text>
        ) : (
          rinnovi.map((sub) => (
            <View key={sub.id} style={styles.miniRiga}>
              <IconaCategoria categoria={sub.category_name} gruppo={sub.category_group} dimensione={24} />
              <Text style={styles.miniNome} numberOfLines={1}>{sub.description}</Text>
              <Text style={styles.rinnovoData}>{formatDataSpesa(sub.next_date)}</Text>
              <Text style={styles.miniImporto}>{saldoVisibile ? importoIn(sub.amount, sub.currency) : nascosto}</Text>
            </View>
          ))
        )}
      </View>
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
      {saluto}
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
              {riquadroCategorie}
              {riquadroRinnovi}
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
