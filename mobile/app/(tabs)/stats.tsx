import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, Pressable } from "react-native";
import { IconButton, Text, Snackbar, ActivityIndicator, Dialog, Portal, TextInput, Button } from "react-native-paper";
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
import { useSchermoStretto } from "@/utils/layout";
import { useStili, useTema } from "@/utils/tema";

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
  const { colors } = useTema();
  const { importo, valuta } = usePreferenze();
  const { t } = useTranslation();
  //i messaggi in basso compaiono sopra la barra delle schede, non sotto
  const spazioBarra = useSpazioBarra();
  //su uno schermo stretto ciambella e legenda affiancate non ci stanno:
  //la ciambella va sopra e la legenda sotto, a tutta larghezza
  const stretto = useSchermoStretto();
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
        radius={75}
        innerRadius={60}
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
          <IconButton icon="chevron-left" onPress={() => setCycleOffset((prev) => prev - 1)} />
          <Text variant="titleMedium">{periodo}</Text>
          <IconButton
            icon="chevron-right"
            onPress={() => setCycleOffset((prev) => prev + 1)}
            disabled={cycleOffset >= 0}
          />
        </View>
        <View style={styles.card}>
          {!loading && stats.length > 0 && (
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
            <Pressable
              style={styles.emptyState}
              onPress={cycleOffset === 0 ? () => router.push("/add_expense") : undefined}
              disabled={cycleOffset !== 0}
            >
              <MaterialCommunityIcons name="chart-donut" size={40} color={colors.chevron} />
              <Text style={styles.emptyTitle}>
                {cycleOffset === 0 ? t("statistiche.nessunaMese") : t("statistiche.nessunaPeriodo")}
              </Text>
              <Text style={styles.emptyHint}>
                {cycleOffset === 0 ? t("statistiche.compaiono") : t("statistiche.nessunaPeriodoDettaglio")}
              </Text>
            </Pressable>
          ) : (
            <>
              {stretto && ciambella}
              <View style={[styles.legendContainer, stretto && styles.legendaColonna]}>
                {stats.map((item) => {
                  return (
                    <View key={item.category_name} style={styles.legendRow}>
                      <View style={styles.legendLeft}>
                        <View style={[styles.legendDot, { backgroundColor: colorePerGruppo(item.category_name) }]} />
                        <Text style={styles.legendLabel} numberOfLines={1}>{nomeCategoria(item.category_name)}</Text>
                      </View>
                      <Text style={styles.legendPercentage}>{cifra(item.total)}</Text>
                    </View>
                  );
                })}
                {remaining > 0 && (
                  <View style={styles.legendRow}>
                    <View style={styles.legendLeft}>
                      <View style={[styles.legendDot, { backgroundColor: colors.donutRemaining }]} />
                      <Text style={styles.legendLabel} numberOfLines={1}>
                        {meseInCorso ? t("statistiche.disponibile") : t("statistiche.avanzato")}
                      </Text>
                    </View>
                    <Text style={styles.legendPercentage}>{cifra(remaining)}</Text>
                  </View>
                )}
              </View>
              {!stretto && ciambella}
            </>
          )}
          </View>
        </View>

        {/* il budget del periodo mostrato. Senza spese non si mostra: non c'e'
            niente da confrontare. Nel periodo in corso senza budget resta l'invito
            qui sotto, che porta alla schermata completa con il giorno di inizio */}
        {!loading && stats.length > 0 && (cycleOffset < 0 || budgetMensile != null) && (
          <View style={styles.budgetRiga}>
            <MaterialCommunityIcons name="wallet-outline" size={20} color={colors.primary} />
            <View style={styles.budgetTesti}>
              <Text style={styles.budgetEtichetta}>{t("statistiche.budget")}</Text>
              <Text style={styles.budgetValore}>
                {budgetMensile != null ? importo(budgetMensile) : t("statistiche.budgetNonImpostato")}
              </Text>
            </View>
            <IconButton icon="pencil-outline" onPress={apriModificaBudget} accessibilityLabel={t("statistiche.modificaBudget")} />
          </View>
        )}

        {/* solo nel mese in corso: per i mesi passati il budget di allora non si ricostruisce */}
        {!loading && cycleOffset === 0 && stats.length > 0 && budgetImpostato === false && (
          <Text style={styles.budgetHint} onPress={() => router.push("/set_budget")}>
            {t("statistiche.impostaBudget")}
          </Text>
        )}

      </PaginaScorrevole>

      <Portal>
        <Dialog visible={modificaBudget} onDismiss={() => setModificaBudget(false)} style={styles.dialog}>
          <Dialog.Title>{t("statistiche.budget")}</Dialog.Title>
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
            />
            {erroreBudget !== "" && <Text style={styles.dialogErrore}>{erroreBudget}</Text>}
            <Text style={styles.dialogSpiegazione}>
              {cycleOffset === 0 ? t("statistiche.budgetDaOra") : t("statistiche.budgetSoloPeriodo")}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setModificaBudget(false)} disabled={salvataggio} textColor={colors.textMuted}>
              {t("comune.annulla")}
            </Button>
            <Button onPress={salvaBudget} loading={salvataggio} disabled={salvataggio}>
              {t("statistiche.salva")}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
    wrapperStyle={{ marginBottom: spazioBarra }} visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={3000}>
        {errorMessage}
      </Snackbar>
    </View>
  );
}
