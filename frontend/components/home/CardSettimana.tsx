import { useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { Text } from "react-native-paper";
import { BarChart } from "react-native-gifted-charts";
import { useTranslation } from "react-i18next";
import { creaStili } from "@/styles/home.styles";
import { useStili, useTema } from "@/utils/tema";
import { usePreferenze } from "@/utils/preferenze";
import { LARGHEZZA_MASSIMA } from "@/utils/layout";
import { fontSize } from "@/styles/tokens";

export type DayStat = {
  date: string;
  total: number;
};

// La scala parte da una soglia fissa invece di adattarsi sempre al massimo:
// con la sola scala relativa una giornata da 5 euro riempiva il grafico
// quanto una da 200, e l'altezza delle barre non diceva piu' nulla.
// Sopra i 40 euro la scala torna ad adattarsi, se no le spese grandi
// uscirebbero dal riquadro.
const SOGLIA_SCALA = 40;
const SPAZIO_BARRE = 8;

//il grafico a barre degli ultimi sette giorni
export function CardSettimana({ weeklyStats, saldoVisibile, importo, largo }: {
  weeklyStats: DayStat[];
  saldoVisibile: boolean;
  importo: (valore: number) => string;
  largo: boolean;
}) {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const { importo: formatta } = usePreferenze();
  const { t } = useTranslation();
  //la colonna dell'app, non la finestra: su tablet e computer e' piu' stretta
  const larghezzaSchermo = Math.min(useWindowDimensions().width, LARGHEZZA_MASSIMA);
  //sul computer il grafico misura la sua card, che non dipende dallo schermo
  const [larghezzaSettimana, setLarghezzaSettimana] = useState(0);
  const GIORNI_SETTIMANA = t("comune.giorniBrevi").split(",");

  if (weeklyStats.length === 0) return null;

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
          {saldoVisibile ? formatta(day.total) : "••"}
        </Text>
      ),
    };
  });

  const speseMassime = Math.max(...weeklyStats.map((day) => day.total), 0);
  // il fattore lascia spazio sopra la barra piu alta per l'etichetta del valore
  const weeklyMaxValue = Math.max(speseMassime * 1.3, SOGLIA_SCALA);
  //con barre da 35 fisse il grafico chiedeva ~410 punti: sotto, la domenica
  //usciva dal riquadro. Si parte dallo spazio vero (schermo meno i margini
  //della pagina e della card) e le barre si stringono quanto serve
  const spazioGrafico = largo
    ? larghezzaSettimana - 2 * 20 - 2 * SPAZIO_BARRE
    : larghezzaSchermo - 2 * 24 - 2 * 20 - 2 * SPAZIO_BARRE;
  const larghezzaBarra = Math.max(
    16,
    Math.min(largo ? 44 : 35, (spazioGrafico - SPAZIO_BARRE * (GIORNI_SETTIMANA.length - 1)) / GIORNI_SETTIMANA.length)
  );

  return (
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
          xAxisLabelTextStyle={{ color: colors.textOnDarkMuted, fontSize: fontSize.xs }}
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
}
