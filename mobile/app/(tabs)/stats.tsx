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
import { styles } from "@/styles/stats.styles";
import { colors } from "@/styles/tokens";
import { useFocusEffect, useRouter } from "expo-router";
import { PaginaScorrevole } from "@/components/PaginaScorrevole";

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
  const { importo } = usePreferenze();
  const { t } = useTranslation();
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cycleOffset, setCycleOffset] = useState(0);
  const [stats, setStats] = useState<CategoryStat[]>([]);
  const [cycleStart, setCycleStart] = useState<string | null>(null);
  const [cycleEnd, setCycleEnd] = useState<string | null>(null);
  const [budgetRemaining, setBudgetRemaining] = useState<number | null>(null);
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
    if (cycleOffset !== 0) {
      setBudgetRemaining(null);
      return;
    }
    const response = await apiFetch("/budget/status");
    if (response.ok) {
      const data = await response.json();
      setBudgetRemaining(data.remaining);
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
  const remaining = budgetRemaining != null ? Math.max(budgetRemaining, 0) : 0;
  const pieData = [
    ...stats.map((item, index) => ({
      value: item.total,
      color: colori[index % colori.length],
    })),
    ...(remaining > 0 ? [{ value: remaining, color: "#E0E0E0" }] : []),
  ];

  return (
    <View style={styles.container}>
      <PaginaScorrevole style={styles.content}>
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
        <View style={styles.card}>
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
              <View style={styles.legendContainer}>
                {stats.map((item, index) => {
                  const percentage = total > 0 ? (item.total / total) * 100 : 0;
                  return (
                    <View key={item.category_name} style={styles.legendRow}>
                      <View style={styles.legendLeft}>
                        <View style={[styles.legendDot, { backgroundColor: colori[index % colori.length] }]} />
                        <Text style={styles.legendLabel}>{nomeCategoria(item.category_name)}</Text>
                      </View>
                      <Text style={styles.legendPercentage}>{percentage.toFixed(0)}%</Text>
                    </View>
                  );
                })}
                {remaining > 0 && (
                  <View style={styles.legendRow}>
                    <View style={styles.legendLeft}>
                      <View style={[styles.legendDot, { backgroundColor: "#E0E0E0" }]} />
                      <Text style={styles.legendLabel}>{t("statistiche.disponibile")}</Text>
                    </View>
                    <Text style={styles.legendPercentage}>{importo(remaining)}</Text>
                  </View>
                )}
              </View>
              <View>
                <PieChart
                  data={pieData}
                  donut
                  radius={75}
                  innerRadius={60}
                  centerLabelComponent={() => (
                    <View style={{ alignItems: "center" }}>
                      <Text style={styles.totalLabel}>{t("statistiche.speso")}</Text>
                      <Text style={styles.totalAmount}>{importo(total)}</Text>
                    </View>
                  )}
                />
              </View>
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

      <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={3000}>
        {errorMessage}
      </Snackbar>
    </View>
  );
}
