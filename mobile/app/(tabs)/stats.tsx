import { useCallback, useState } from "react";
import { View, Pressable } from "react-native";
import { IconButton, Text, Snackbar, ActivityIndicator } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { apiFetch } from "@/utils/apiFetch";
import { usePreferenze } from "@/utils/preferenze";
import { messaggioErrore } from "@/utils/messaggioErrore";
import { useTranslation } from "react-i18next";
import { nomeCategoria } from "@/utils/categorie";
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

function formatCycleLabel(cycleStart: string, cycleEnd: string): string {
  const start = new Date(cycleStart);
  const end = new Date(cycleEnd);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${start.toLocaleDateString(localeAttuale(), opts)} - ${end.toLocaleDateString(localeAttuale(), opts)}`;
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
  //il budget mensile: nei mesi passati serve a calcolare quanto e' avanzato
  const [budgetMensile, setBudgetMensile] = useState<number | null>(null);
  //null finche' non si sa: l'invito a impostarlo non deve lampeggiare all'apertura
  const [budgetImpostato, setBudgetImpostato] = useState<boolean | null>(null);
  const colori = ["#2ECC71", "#F5C518", "#3498DB", "#E74C3C", "#BDC3C7", "#9B59B6", "#1ABC9C", "#E67E22"];

  async function loadStats() {
    try {
      setLoading(true);
      const response = await apiFetch(`/expenses/stats?cycle_offset=${cycleOffset}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.categories);
        setCycleStart(data.cycle_start);
        setCycleEnd(data.cycle_end);
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
      setBudgetMensile(data.budget);
      setBudgetImpostato(data.budget != null);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadStats();
      loadBudget();
    }, [cycleOffset])
  );

  const total = stats.reduce((sum, item) => sum + item.total, 0);
  //nei mesi passati c'e' solo il budget di oggi (lo storico non si conserva):
  //se e' cambiato nel frattempo, l'avanzo di quei mesi e' approssimato
  const meseInCorso = cycleOffset === 0;
  const avanzo = meseInCorso ? budgetRemaining : budgetMensile != null ? budgetMensile - total : null;
  const remaining = avanzo != null ? Math.max(avanzo, 0) : 0;
  //le percentuali sono parti di cio' che la ciambella rappresenta: il budget, se
  //non e' stato superato, altrimenti il totale speso. Cosi' fette e numeri coincidono
  const baseCiambella = total + remaining;
  const percentuale = (valore: number) => (baseCiambella > 0 ? Math.round((valore / baseCiambella) * 100) : 0);
  const pieData = [
    ...stats.map((item, index) => ({
      value: item.total,
      color: colori[index % colori.length],
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
          <Text variant="titleMedium">
            {cycleStart && cycleEnd ? formatCycleLabel(cycleStart, cycleEnd) : ""}
          </Text>
          <IconButton
            icon="chevron-right"
            onPress={() => setCycleOffset((prev) => prev + 1)}
            disabled={cycleOffset >= 0}
          />
        </View>
        <View style={[styles.card, stretto && styles.cardColonna]}>
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
              {cycleOffset === 0 && (
                <Text style={styles.emptyHint}>
                  {t("statistiche.compaiono")}
                </Text>
              )}
            </Pressable>
          ) : (
            <>
              {stretto && ciambella}
              <View style={[styles.legendContainer, stretto && styles.legendaColonna]}>
                {stats.map((item, index) => {
                  return (
                    <View key={item.category_name} style={styles.legendRow}>
                      <View style={styles.legendLeft}>
                        <View style={[styles.legendDot, { backgroundColor: colori[index % colori.length] }]} />
                        <Text style={styles.legendLabel} numberOfLines={1}>{nomeCategoria(item.category_name)}</Text>
                      </View>
                      <Text style={styles.legendPercentage}>{percentuale(item.total)}%</Text>
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
                    <Text style={styles.legendPercentage}>
                      {percentuale(remaining)}% · {importo(remaining)}
                    </Text>
                  </View>
                )}
              </View>
              {!stretto && ciambella}
            </>
          )}
        </View>

        {/* solo nel mese in corso: per i mesi passati il budget di allora non si ricostruisce */}
        {!loading && cycleOffset === 0 && stats.length > 0 && budgetImpostato === false && (
          <Text style={styles.budgetHint} onPress={() => router.push("/set_budget")}>
            {t("statistiche.impostaBudget")}
          </Text>
        )}

      </PaginaScorrevole>

      <Snackbar
    wrapperStyle={{ marginBottom: spazioBarra }} visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={3000}>
        {errorMessage}
      </Snackbar>
    </View>
  );
}
