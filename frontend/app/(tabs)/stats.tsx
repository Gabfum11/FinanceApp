import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, Pressable } from "react-native";
import { Text, Snackbar, ActivityIndicator } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { apiFetch } from "@/utils/apiFetch";
import { usePreferenze } from "@/utils/preferenze";
import { IMPORTO_MASSIMO } from "@/utils/formato";
import { messaggioErrore } from "@/utils/messaggioErrore";
import { useTranslation } from "react-i18next";
import { nomeCategoria } from "@/utils/categorie";
import { colorePerGruppo } from "@/utils/categoryIcons";
import { localeAttuale } from "@/utils/date";
import { creaStili } from "@/styles/stats.styles";
import { useFocusEffect, useRouter } from "expo-router";
import { PaginaScorrevole } from "@/components/PaginaScorrevole";
import { useSpazioBarra } from "@/utils/barraSchede";
import { LARGHEZZA_MASSIMA, useSchermoLargo, useSchermoStretto } from "@/utils/layout";
import { useStili, useTema } from "@/utils/tema";
import { BarraPeriodo } from "@/components/BarraPeriodo";
import { Ciambella } from "@/components/statistiche/Ciambella";
import { SelettoreCifre, type Cifre } from "@/components/statistiche/SelettoreCifre";
import { RigaCategoria, RigaResto, type CategoryStat } from "@/components/statistiche/RigheLegenda";
import { RigaBudget, RiquadroResto, FinestraBudget } from "@/components/statistiche/BudgetPeriodo";

//come si leggono le cifre della legenda: la scelta resta sul telefono
const CHIAVE_CIFRE = "statistiche_cifre";
//mese (ciclo di budget) o anno di calendario: anche questa scelta resta sul telefono
const CHIAVE_VISTA = "statistiche_vista";
type Vista = "mese" | "anno";

//l'anno va sempre scritto, tornando indietro di oltre 12 mesi non si capiva dove si era;
//sulla prima data solo se il ciclo scavalca l'anno
function formatCycleLabel(cycleStart: string, cycleEnd: string): string {
  const start = new Date(cycleStart);
  const end = new Date(cycleEnd);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const conAnno: Intl.DateTimeFormatOptions = { ...opts, year: "numeric" };
  const inizio = start.toLocaleDateString(localeAttuale(), start.getFullYear() === end.getFullYear() ? opts : conAnno);
  return `${inizio} - ${end.toLocaleDateString(localeAttuale(), conAnno)}`;
}

export default function StatsScreen() {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const { importo } = usePreferenze();
  const { t } = useTranslation();
  //i messaggi in basso compaiono sopra la barra delle schede, non sotto
  const spazioBarra = useSpazioBarra();
  //su uno schermo stretto ciambella e legenda affiancate non ci stanno:
  //la ciambella va sopra e la legenda sotto, a tutta larghezza
  //soglia alla larghezza massima della colonna: a 412 (molti Samsung) affiancate
  //lasciavano al nome della categoria pochi pixel, ridotto a "A…"
  const stretto = useSchermoStretto(LARGHEZZA_MASSIMA);
  //sul computer: ciambella grande, importi e percentuali insieme, budget di lato
  const largo = useSchermoLargo();
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vista, setVista] = useState<Vista>("mese");
  const [cycleOffset, setCycleOffset] = useState(0);
  const [yearOffset, setYearOffset] = useState(0);
  const annoMostrato = new Date().getFullYear() + yearOffset;
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
  //una categoria aperta alla volta: aprirne un'altra chiude la precedente
  const [aperta, setAperta] = useState<string | null>(null);
  const [tutteVisibili, setTutteVisibili] = useState(false);

  function apriCategoria(nome: string) {
    setAperta((prima) => (prima === nome ? null : nome));
    setTutteVisibili(false);
  }

  async function loadStats() {
    try {
      setLoading(true);
      const response = await apiFetch(
        vista === "anno" ? `/expenses/stats?year=${annoMostrato}` : `/expenses/stats?cycle_offset=${cycleOffset}`
      );
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
    }, [vista, cycleOffset, yearOffset])
  );

  useEffect(() => {
    AsyncStorage.getItem(CHIAVE_CIFRE)
      .then((valore) => {
        if (valore === "importi" || valore === "percentuali") setCifre(valore);
      })
      .catch(() => {});
    AsyncStorage.getItem(CHIAVE_VISTA)
      .then((valore) => {
        if (valore === "mese" || valore === "anno") setVista(valore);
      })
      .catch(() => {});
  }, []);

  function scegliCifre(nuove: Cifre) {
    setCifre(nuove);
    AsyncStorage.setItem(CHIAVE_CIFRE, nuove).catch(() => {});
  }

  function scegliVista(nuova: Vista) {
    setVista(nuova);
    AsyncStorage.setItem(CHIAVE_VISTA, nuova).catch(() => {});
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
  //nella vista anno il budget non c'e' (e' mensile): niente fetta "disponibile" ne' matita
  const meseInCorso = vista === "mese" && cycleOffset === 0;
  const periodoInCorso = vista === "mese" ? cycleOffset === 0 : yearOffset === 0;
  const avanzo = meseInCorso ? budgetRemaining : budgetMensile != null ? budgetMensile - total : null;
  const remaining = avanzo != null ? Math.max(avanzo, 0) : 0;
  //le percentuali sono parti di cio' che la ciambella rappresenta: il budget, se
  //non e' stato superato, altrimenti il totale speso. Cosi' fette e numeri coincidono
  const baseCiambella = total + remaining;
  const percentuale = (valore: number) => (baseCiambella > 0 ? Math.round((valore / baseCiambella) * 100) : 0);
  //la cifra di una riga della legenda, come l'utente ha scelto di leggerla
  const cifra = (valore: number) => (cifre === "importi" ? importo(valore) : `${percentuale(valore)}%`);
  const periodo = vista === "anno"
    ? String(annoMostrato)
    : cycleStart && cycleEnd ? formatCycleLabel(cycleStart, cycleEnd) : "";
  //l'anno in corso non e' finito: si dice fino a quando arrivano le spese
  const notaPeriodo = vista === "anno" && yearOffset === 0
    ? t("statistiche.finoAOggi", {
        inizio: new Date(annoMostrato, 0, 1).toLocaleDateString(localeAttuale(), { day: "numeric", month: "short" }),
      })
    : "";
  //la categoria aperta, se c'e' ancora nel periodo mostrato
  const categoriaAperta = stats.find((item) => item.category_name === aperta) ?? null;
  //con una categoria aperta le altre fette sbiadiscono: si vede subito di cosa si parla
  const sbiadita = (nome: string | null) => categoriaAperta != null && categoriaAperta.category_name !== nome;
  const pieData = [
    ...stats.map((item) => ({
      value: item.total,
      color: colorePerGruppo(item.category_name) + (sbiadita(item.category_name) ? "33" : ""),
    })),
    ...(remaining > 0 ? [{ value: remaining, color: categoriaAperta ? colors.donutRemaining + "55" : colors.donutRemaining }] : []),
  ];

  //la ciambella con il totale: sopra la legenda sugli schermi stretti, accanto sugli altri
  const ciambella = (
    <Ciambella
      dati={pieData}
      etichetta={categoriaAperta ? nomeCategoria(categoriaAperta.category_name) : t("statistiche.speso")}
      valore={importo(categoriaAperta ? categoriaAperta.total : total)}
    />
  );

  return (
    <View style={styles.container}>
      <PaginaScorrevole style={styles.content} sopraBarra>
        <BarraPeriodo
          voci={(["mese", "anno"] as const).map((voce) => ({ valore: voce, etichetta: t(`statistiche.${voce}`) }))}
          scelta={vista}
          onScegli={scegliVista}
          etichettaGruppo={t("statistiche.vista")}
          periodo={periodo}
          nota={notaPeriodo}
          inCorso={periodoInCorso}
          onSposta={(passo) => (vista === "anno" ? setYearOffset : setCycleOffset)((prev) => prev + passo)}
          onOggi={() => (vista === "anno" ? setYearOffset : setCycleOffset)(0)}
        />
        <View style={largo ? styles.rigaLarga : undefined}>
        <View style={[styles.card, largo && styles.cardLarga]}>
          {/* sul computer c'e' posto per importi e percentuali insieme: l'interruttore non serve */}
          {!loading && stats.length > 0 && !largo && (
            <SelettoreCifre cifre={cifre} onScegli={scegliCifre} />
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
                {!periodoInCorso
                  ? t("statistiche.nessunaPeriodo")
                  : vista === "anno" ? t("statistiche.nessunaAnno") : t("statistiche.nessunaMese")}
              </Text>
              <Text style={styles.emptyHint}>
                {periodoInCorso ? t("statistiche.compaionoBreve") : t("statistiche.nessunaPeriodoDettaglio")}
              </Text>
              {/* un pulsante vero al posto di "tocca +": prima toccare il riquadro
                  funzionava, ma niente lo faceva capire */}
              {periodoInCorso && (
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
                    <View style={styles.freccina} />
                  </View>
                )}
                {stats.map((item, indice) => (
                  <RigaCategoria
                    key={item.category_name}
                    item={item}
                    separata={indice > 0 || largo}
                    isAperta={categoriaAperta?.category_name === item.category_name}
                    sbiadita={sbiadita(item.category_name)}
                    tutteVisibili={tutteVisibili}
                    onApri={() => apriCategoria(item.category_name)}
                    onMostraTutte={() => setTutteVisibili(true)}
                    cifra={cifra}
                    percentuale={percentuale}
                  />
                ))}
                {remaining > 0 && (
                  <RigaResto
                    resto={remaining}
                    meseInCorso={meseInCorso}
                    sbiadita={categoriaAperta != null}
                    cifra={cifra}
                    percentuale={percentuale}
                  />
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
        {!loading && stats.length > 0 && vista === "mese" && (cycleOffset < 0 || budgetMensile != null) && (
          <RigaBudget budgetMensile={budgetMensile} onModifica={apriModificaBudget} />
        )}
        {/* sul computer, accanto: quanto resta, la domanda che segue la ciambella */}
        {largo && !loading && stats.length > 0 && budgetMensile != null && (
          <RiquadroResto resto={remaining} meseInCorso={meseInCorso} />
        )}
        </View>
        </View>

        {/* solo nel mese in corso: per i mesi passati il budget di allora non si ricostruisce */}
        {!loading && meseInCorso && stats.length > 0 && budgetImpostato === false && (
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

      <FinestraBudget
        visible={modificaBudget}
        periodo={periodo}
        valore={nuovoBudget}
        onValore={(testo) => {
          setNuovoBudget(testo);
          setErroreBudget("");
        }}
        errore={erroreBudget}
        inCorso={salvataggio}
        meseInCorso={cycleOffset === 0}
        onSalva={salvaBudget}
        onChiudi={() => setModificaBudget(false)}
      />

      <Snackbar
    wrapperStyle={{ marginBottom: spazioBarra }} visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={3000}>
        {errorMessage}
      </Snackbar>
    </View>
  );
}
