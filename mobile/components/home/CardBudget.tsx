import { View, Pressable } from "react-native";
import { Button, Text, IconButton } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { creaStili } from "@/styles/home.styles";
import { useStili, useTema } from "@/utils/tema";
import { bersaglio } from "@/utils/tour";
import { localeAttuale } from "@/utils/date";

export type StatoBudget = { budget: number | null; spent: number; remaining: number | null; cycle_start: string; cycle_end: string };

function formatCycleRange(cycleStart: string, cycleEnd: string): string {
  const start = new Date(cycleStart);
  const end = new Date(cycleEnd);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${start.toLocaleDateString(localeAttuale(), opts)} - ${end.toLocaleDateString(localeAttuale(), opts)}`;
}

//il titolo "Budget" con il pulsante Nuovo e l'occhio che nasconde le cifre
export function IntestazioneBudget({ saldoVisibile, onCambiaVisibilita }: {
  saldoVisibile: boolean;
  onCambiaVisibilita: () => void;
}) {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const { t } = useTranslation();

  return (
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
          onPress={onCambiaVisibilita}
          style={styles.eyeButton}
          accessibilityLabel={saldoVisibile ? t("home.nascondi") : t("home.mostra")}
        />
        </View>
      </View>
    </View>
  );
}

//quanto resta del budget del ciclo, con la barra che cambia colore
export function CardBudget({ budgetStatus, importo, largo }: {
  budgetStatus: StatoBudget | null;
  importo: (valore: number) => string;
  largo: boolean;
}) {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const router = useRouter();
  const { t } = useTranslation();

  const percentage = budgetStatus?.budget
    ? Math.min((budgetStatus.spent / budgetStatus.budget) * 100, 100)
    : 0;
  //la barra cambia colore avvicinandosi al limite: prima restava verde anche
  //al 99%, e superato il budget si fermava piena senza dire altro
  const quotaSpesa = budgetStatus?.budget ? budgetStatus.spent / budgetStatus.budget : 0;
  const coloreBarra =
    quotaSpesa >= 1 ? colors.budgetSforato : quotaSpesa >= 0.8 ? colors.warning : colors.primary;

  return (
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
}
