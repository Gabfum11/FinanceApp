import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, Pressable } from "react-native";
import { Text, Snackbar, ActivityIndicator, Dialog, Portal, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { apiFetch } from "@/utils/apiFetch";
import { usePreferenze } from "@/utils/preferenze";
import { simbolo, IMPORTO_MASSIMO } from "@/utils/formato";
import { messaggioErrore } from "@/utils/messaggioErrore";
import { useTranslation } from "react-i18next";
import { nomeCategoria } from "@/utils/categorie";
import { colorePerGruppo } from "@/utils/categoryIcons";
import { localeAttuale } from "@/utils/date";
import { PieChart } from "react-native-gifted-charts";
import { creaStili } from "@/styles/stats.styles";
import { useFocusEffect, useRouter } from "expo-router";
import { PaginaScorrevole } from "@/components/PaginaScorrevole";
import { useSpazioBarra } from "@/utils/barraSchede";
import { DIALOGO_LARGO, useSchermoLargo, useSchermoStretto } from "@/utils/layout";
import { useStili, useTema } from "@/utils/tema";
import { PulsantiDialogo, creaStiliFinestra } from "@/components/Dialogo";
import { IconaCategoria, IconaCerchio } from "@/components/IconaCategoria";

type CategoryStat = {
  category_name: string;
  total: number;
};

//come si leggono le cifre della legenda: la scelta resta sul telefono
const CHIAVE_CIFRE = "statistiche_cifre";
type Cifre = "importi" | "percentuali";

function formatCycleLabel(cycleStart: string, cycleEnd: string): string {
  const start = new Date(cycleStart);
  const end = new Date(cycleEnd);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${start.toLocaleDateString(localeAttuale(), opts)} - ${end.toLocaleDateString(localeAttuale(), opts)}`;
}

export default function StatsScreen() {
  const styles = useStili(creaStili);
  const finestra = useStili(creaStiliFinestra);
  const { colors } = useTema();
  const { importo, valuta } = usePreferenze();
  const { t } = useTranslation();
  //i messaggi in basso compaiono sopra la barra delle schede, non sotto
  const spazioBarra = useSpazioBarra();
  //su uno schermo stretto ciambella e legenda affiancate non ci stanno:
  //la ciambella va sopra e la legenda sotto, a tutta larghezza
  const stretto = useSchermoStretto();
  //sul computer: ciambella grande, importi e percentuali insieme, budget di lato
  const largo = useSchermoLargo();
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cycleOffset, setCycleOffset] = useState(0);
  const [stats, setStats] = useState<CategoryStat[]>([]);
  const [cycleStart, setCycleStart] = useState<string | null>(null);
  const [cycleEnd, setCycleEnd] = useState<string | null>(null);
  const [budgetRemaining, setBudgetRemaining] = useState<number | null>(null);
  //il budget che valeva nel mese mostrato: nei mesi passati serve a calcolare
  //quanto e' avanzato. Arriva con le statistiche, dallo storico del server
  const [budgetMensile, setBudgetMensile] = useState<number | null>(null);
  //null finche' non si sa: l'invito a impostarlo non deve lampeggiare all'apertura
  const [budgetImpostato, setBudgetImpostato] = useState<boolean | null>(null);
  const [cifre, setCifre] = useState<Cifre>("importi");
  //la finestra della matita: importo scritto ed eventuale errore
  const [modificaBudget, setModificaBudget] = useState(false);
  const [nuovoBudget, setNuovoBudget] = useState("");
  const [erroreBudget, setErroreBudget] = useState("");
  const [salvataggio, setSalvataggio] = useState(false);

  async function loadStats() {
    try {
      setLoading(true);
      const response = await apiFetch(`/expenses/stats?cycle_offset=${cycleOffset}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.categories);
        setCycleStart(data.cycle_start);
        setCycleEnd(data.cycle_end);
        setBudgetMensile(data.budget ?? null);
      } else {
        setErrorMessage(await messaggioErrore(response, t("statistiche.errore")));
        setSnackbarVisible(true);
      }
    } catch (error) {
      console.log("Errore di rete:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadBudget() {
    const response = await apiFetch("/budget/status");
    if (response.ok) {
      const data = await response.json();
      //remaining vale per il mese in corso; per quelli passati si calcola dal totale
      setBudgetRemaining(cycleOffset === 0 ? data.remaining : null);
      setBudgetImpostato(data.budget != null);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadStats();
      loadBudget();
    }, [cycleOffset])
  );

  useEffect(() => {
    AsyncStorage.getItem(CHIAVE_CIFRE)
      .then((valore) => {
        if (valore === "importi" || valore === "percentuali") setCifre(valore);
      })
      .catch(() => {});
  }, []);

  function scegliCifre(nuove: Cifre) {
    setCifre(nuove);
    AsyncStorage.setItem(CHIAVE_CIFRE, nuove).catch(() => {});
  }

  function apriModificaBudget() {
    setNuovoBudget(budgetMensile != null ? String(budgetMensile).replace(".", ",") : "");
    setErroreBudget("");
    setModificaBudget(true);
  }

  async function salvaBudget() {
    //stesse regole della schermata del budget, con la virgola della tastiera italiana
    const valore = parseFloat(nuovoBudget.replace(",", "."));
    if (!valore || valore <= 0) {
      setErroreBudget(t("budgetNuovo.importoNonValido"));
      return;
    }
    if (valore > IMPORTO_MASSIMO) {
      setErroreBudget(t("budgetNuovo.importoTroppoAlto", { massimo: importo(IMPORTO_MASSIMO) }));
      return;
    }
    try {
      setSalvataggio(true);
      const response = await apiFetch("/budget/period", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycle_offset: cycleOffset, amount: valore }),
      });
      if (!response.ok) {
        setErroreBudget(await messaggioErrore(response, t("statistiche.erroreBudget")));
        return;
      }
      setModificaBudget(false);
      loadStats();
      loadBudget();
    } catch {
      setErroreBudget(t("errori.rete"));
    } finally {
      setSalvataggio(false);
    }
  }

  const total = stats.reduce((sum, item) => sum + item.total, 0);
  //nei mesi passati il budget e' quello che valeva allora: cambiarlo oggi non
  //riscrive l'avanzo dei mesi gia' chiusi
  const meseInCorso = cycleOffset === 0;
  const avanzo = meseInCorso ? budgetRemaining : budgetMensile != null ? budgetMensile - total : null;
  const remaining = avanzo != null ? Math.max(avanzo, 0) : 0;
  //le percentuali sono parti di cio' che la ciambella rappresenta: il budget, se
  //non e' stato superato, altrimenti il totale speso. Cosi' fette e numeri coincidono
  const baseCiambella = total + remaining;
  const percentuale = (valore: number) => (baseCiambella > 0 ? Math.round((valore / baseCiambella) * 100) : 0);
  //la cifra di una riga della legenda, come l'utente ha scelto di leggerla
  const cifra = (valore: number) => (cifre === "importi" ? importo(valore) : `${percentuale(valore)}%`);
  const periodo = cycleStart && cycleEnd ? formatCycleLabel(cycleStart, cycleEnd) : "";
  const pieData = [
    ...stats.map((item) => ({
      value: item.total,
      color: colorePerGruppo(item.category_name),
    })),
    ...(remaining > 0 ? [{ value: remaining, color: colors.donutRemaining }] : []),
  ];

  //la ciambella con il totale: sopra la legenda sugli schermi stretti, accanto sugli altri
  const ciambella = (
    <View style={styles.ciambella}>
      <PieChart
        data={pieData}
        donut
        radius={largo ? 110 : 75}
        innerRadius={largo ? 86 : 60}
        //il buco della ciambella e' un cerchio pieno, bianco se non si dice altro
        innerCircleColor={colors.surface}
        centerLabelComponent={() => (
          <View style={{ alignItems: "center" }}>
            <Text style={styles.totalLabel}>{t("statistiche.speso")}</Text>
            <Text style={styles.totalAmount}>{importo(total)}</Text>
          </View>
        )}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <PaginaScorrevole style={styles.content} sopraBarra>
        <View style={styles.selectorRow}>
          <FrecciaPeriodo
            icona="chevron-left"
            onPress={() => setCycleOffset((prev) => prev - 1)}
            etichetta={t("statistiche.periodoPrima")}
          />
          <Text style={styles.periodo} accessibilityRole="header">{periodo}</Text>
          <FrecciaPeriodo
            icona="chevron-right"
            onPress={() => setCycleOffset((prev) => prev + 1)}
            disabilitata={cycleOffset >= 0}
            etichetta={t("statistiche.periodoDopo")}
          />
        </View>
        <View style={largo ? styles.rigaLarga : undefined}>
        <View style={[styles.card, largo && styles.cardLarga]}>
          {/* sul computer c'e' posto per importi e percentuali insieme: l'interruttore non serve */}
          {!loading && stats.length > 0 && !largo && (
            <View style={styles.cifreRiga}>
              <View style={styles.cifre}>
                <Pressable
                  style={[styles.cifraVoce, cifre === "importi" && styles.cifraScelta]}
                  onPress={() => scegliCifre("importi")}
                  accessibilityRole="button"
                  accessibilityLabel={t("statistiche.mostraImporti")}
                  accessibilityState={{ selected: cifre === "importi" }}
                >
                  <Text style={[styles.cifraTesto, cifre === "importi" && styles.cifraTestoScelto]}>{simbolo(valuta)}</Text>
                </Pressable>
                <Pressable
                  style={[styles.cifraVoce, cifre === "percentuali" && styles.cifraScelta]}
                  onPress={() => scegliCifre("percentuali")}
                  accessibilityRole="button"
                  accessibilityLabel={t("statistiche.mostraPercentuali")}
                  accessibilityState={{ selected: cifre === "percentuali" }}
                >
                  <Text style={[styles.cifraTesto, cifre === "percentuali" && styles.cifraTestoScelto]}>%</Text>
                </Pressable>
              </View>
            </View>
          )}
          <View style={[styles.cardCorpo, stretto && styles.cardColonna]}>
          {loading ? (
            <ActivityIndicator size="large" />
          ) : stats.length === 0 ? (
            //senza spese la ciambella era vuota e non diceva nulla: come in home,
            //si spiega cosa manca e, nel mese in corso, come rimediare
            <View style={styles.emptyState}>
              <View style={styles.emptyIcona}>
                <MaterialCommunityIcons name="chart-donut" size={30} color={colors.primaryDark} />
              </View>
              <Text style={styles.emptyTitle}>
                {cycleOffset === 0 ? t("statistiche.nessunaMese") : t("statistiche.nessunaPeriodo")}
              </Text>
              <Text style={styles.emptyHint}>
                {cycleOffset === 0 ? t("statistiche.compaionoBreve") : t("statistiche.nessunaPeriodoDettaglio")}
              </Text>
              {/* un pulsante vero al posto di "tocca +": prima toccare il riquadro
                  funzionava, ma niente lo faceva capire */}
              {cycleOffset === 0 && (
                <Pressable
                  style={({ pressed }) => [styles.aggiungi, pressed && styles.premuto]}
                  onPress={() => router.push("/add_expense")}
                  accessibilityRole="button"
                >
                  <MaterialCommunityIcons name="plus" size={18} color={colors.surfaceDark} />
                  <Text style={styles.aggiungiTesto}>{t("schede.aggiungi")}</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <>
              {(stretto || largo) && ciambella}
              <View style={[styles.legendContainer, stretto && styles.legendaColonna]}>
                {largo && (
                  <View style={styles.legendRow}>
                    <Text style={[styles.intestazioneColonna, styles.legendLeft]}>{t("statistiche.categoria")}</Text>
                    <Text style={[styles.intestazioneColonna, styles.colonnaImporto]}>{t("statistiche.importo")}</Text>
                    <Text style={[styles.intestazioneColonna, styles.colonnaPercentuale]}>%</Text>
                  </View>
                )}
                {stats.map((item, indice) => {
                  return (
                    <View key={item.category_name} style={[styles.legendRow, (indice > 0 || largo) && styles.legendRowSeparata]}>
                      <View style={styles.legendLeft}>
                        {/* l'icona oltre al colore: la fetta si riconosce anche
                            da chi distingue male i colori */}
                        <IconaCategoria gruppo={item.category_name} dimensione={30} />
                        <Text style={styles.legendLabel} numberOfLines={1}>{nomeCategoria(item.category_name)}</Text>
                      </View>
                      {largo ? (
                        <>
                          <Text style={[styles.legendPercentage, styles.colonnaImporto]}>{importo(item.total)}</Text>
                          <Text style={styles.colonnaPercentuale}>{percentuale(item.total)}%</Text>
                        </>
                      ) : (
                        <Text style={styles.legendPercentage}>{cifra(item.total)}</Text>
                      )}
                    </View>
                  );
                })}
                {remaining > 0 && (
                  <View style={[styles.legendRow, styles.legendRowSeparata]}>
                    <View style={styles.legendLeft}>
                      {/* un anello vuoto, grigio come la sua fetta: e' il pezzo di ciambella
                          che resta, non una categoria, quindi niente icona */}
                      <View style={[styles.legendaAnello, { borderColor: colors.donutRemaining }]} />
                      <Text style={styles.legendLabel} numberOfLines={1}>
                        {meseInCorso ? t("statistiche.disponibile") : t("statistiche.avanzato")}
                      </Text>
                    </View>
                    {largo ? (
                      <>
                        <Text style={[styles.legendPercentage, styles.legendaResto, styles.colonnaImporto]}>{importo(remaining)}</Text>
                        <Text style={styles.colonnaPercentuale}>{percentuale(remaining)}%</Text>
                      </>
                    ) : (
                      <Text style={[styles.legendPercentage, styles.legendaResto]}>{cifra(remaining)}</Text>
                    )}
                  </View>
                )}
              </View>
              {!stretto && !largo && ciambella}
            </>
          )}
          </View>
        </View>

        {/* il budget del periodo mostrato. Senza spese non si mostra: non c'e'
            niente da confrontare. Nel periodo in corso senza budget resta l'invito
            qui sotto, che porta alla schermata completa con il giorno di inizio */}
        <View style={largo ? styles.colonnaLaterale : undefined}>
        {!loading && stats.length > 0 && (cycleOffset < 0 || budgetMensile != null) && (
          <View style={[styles.budgetRiga, largo && styles.senzaMargine]}>
            <IconaCerchio icona="cash" sfondo={colors.primary} dimensione={32} />
            <View style={styles.budgetTesti}>
              <Text style={styles.budgetEtichetta}>{t("statistiche.budget")}</Text>
              <Text style={styles.budgetValore}>
                {budgetMensile != null ? importo(budgetMensile) : t("statistiche.budgetNonImpostato")}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.matita, pressed && styles.premuto]}
              onPress={apriModificaBudget}
              accessibilityRole="button"
              accessibilityLabel={t("statistiche.modificaBudget")}
            >
              <MaterialCommunityIcons name="pencil" size={20} color={colors.primaryDark} />
            </Pressable>
          </View>
        )}
        {/* sul computer, accanto: quanto resta, la domanda che segue la ciambella */}
        {largo && !loading && stats.length > 0 && budgetMensile != null && (
          <View style={styles.riquadroResto}>
            <Text style={styles.budgetEtichetta}>
              {meseInCorso ? t("statistiche.disponibile") : t("statistiche.avanzato")}
            </Text>
            <Text style={styles.restoValore}>{importo(remaining)}</Text>
            <Text style={styles.restoTesto}>
              {t("statistiche.usato", { percentuale: Math.round((total / budgetMensile) * 100) })}
            </Text>
          </View>
        )}
        </View>
        </View>

        {/* solo nel mese in corso: per i mesi passati il budget di allora non si ricostruisce */}
        {!loading && cycleOffset === 0 && stats.length > 0 && budgetImpostato === false && (
          //pillola e non scritta verde: prima non sembrava toccabile e si leggeva a fatica
          <Pressable
            style={({ pressed }) => [styles.budgetHint, pressed && styles.premuto]}
            onPress={() => router.push("/set_budget")}
            accessibilityRole="button"
            accessibilityHint={t("statistiche.impostaBudget")}
          >
            <MaterialCommunityIcons name="plus" size={18} color={colors.primaryDark} />
            <Text style={styles.budgetHintTesto}>{t("statistiche.impostaBudgetBreve")}</Text>
          </Pressable>
        )}

      </PaginaScorrevole>

      <Portal>
        <Dialog visible={modificaBudget} onDismiss={() => setModificaBudget(false)} style={[finestra.finestra, largo && DIALOGO_LARGO]}>
          <Dialog.Title style={finestra.titolo}>{t("statistiche.budget")}</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogPeriodo}>{periodo}</Text>
            <TextInput
              value={nuovoBudget}
              onChangeText={(testo) => {
                setNuovoBudget(testo);
                setErroreBudget("");
              }}
              keyboardType="decimal-pad"
              mode="outlined"
              autoFocus
              left={<TextInput.Affix text={simbolo(valuta)} />}
              error={erroreBudget !== ""}
            />
            {erroreBudget !== "" && <Text style={styles.dialogErrore}>{erroreBudget}</Text>}
            <Text style={styles.dialogSpiegazione}>
              {cycleOffset === 0 ? t("statistiche.budgetDaOra") : t("statistiche.budgetSoloPeriodo")}
            </Text>
          </Dialog.Content>
          <PulsantiDialogo
            conferma={t("statistiche.salva")}
            onConferma={salvaBudget}
            onAnnulla={() => setModificaBudget(false)}
            loading={salvataggio}
          />
        </Dialog>
      </Portal>

      <Snackbar
    wrapperStyle={{ marginBottom: spazioBarra }} visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={3000}>
        {errorMessage}
      </Snackbar>
    </View>
  );
}

//freccia per cambiare periodo: un cerchio da 44px. Quella del mese futuro resta
//senza cerchio, cosi' si vede che non si puo' toccare
function FrecciaPeriodo({ icona, onPress, disabilitata = false, etichetta }: {
  icona: string;
  onPress: () => void;
  disabilitata?: boolean;
  etichetta: string;
}) {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  return (
    <Pressable
      style={({ pressed }) => [styles.freccia, disabilitata && styles.frecciaSpenta, pressed && styles.premuto]}
      onPress={onPress}
      disabled={disabilitata}
      accessibilityRole="button"
      accessibilityLabel={etichetta}
      accessibilityState={{ disabled: disabilitata }}
    >
      <MaterialCommunityIcons name={icona as any} size={24} color={disabilitata ? colors.textDisabled : colors.text} />
    </Pressable>
  );
}
