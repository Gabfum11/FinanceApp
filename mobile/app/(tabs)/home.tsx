import { useCallback, useEffect, useState } from "react";
import { View, FlatList } from "react-native";
import { Button, Text } from "react-native-paper";
import { BarChart } from "react-native-gifted-charts";
import { API_URL } from "@/config";
import { styles } from "../../styles/home.styles";
import { apiFetch } from "@/utils/apiFetch";
import { Link } from "expo-router";
import { useFocusEffect } from "expo-router";
type Expense = {
  id: number;
  description: string;
  amount: number;
  date: string;
  category_id: number | null; //può tornare utile
  category_name: string | null;
  created_at : string;
};

type DayStat = {
  date: string;
  total: number;
};

const GIORNI_SETTIMANA = ["L", "M", "M", "G", "V", "S", "D"];

//date string ->data della spesa (anno,mese,giorno)
//created at -> timestamp completo
function formatCycleRange(cycleStart: string, cycleEnd: string): string {
  const start = new Date(cycleStart);
  const end = new Date(cycleEnd);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${start.toLocaleDateString("it-IT", opts)} - ${end.toLocaleDateString("it-IT", opts)}`;
}

function formatExpenseTime(dateString: string, createdAt: string): string {
  const expenseDate = new Date(dateString); //in questa maniera è possibile fare confronti e calcoli
  const today = new Date();
  // toDateString ->converte una data in una stringa che rappresenta solo giorno/mese/anno
  const isToday = expenseDate.toDateString() === today.toDateString(); 
  //prendiamo createdAt e lo formattiamo come orario leggibile . es 18.24
  const time = new Date(createdAt).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isToday) {
    return `Oggi, ${time}`;
  }
  //caso : non è oggi
  const formattedDate = expenseDate.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
  });
  return `${formattedDate}, ${time}`;
}

export default function HomeScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]); //questo stato contiene un array di expense, inizialmente vuoto
  const [nickname, setNickname] = useState("");
  const [budgetStatus, setBudgetStatus] = useState<{ budget: number | null; spent: number; remaining: number | null; cycle_start: string; cycle_end: string } | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<DayStat[]>([]);
  async function loadExpenses() {
    const response = await apiFetch("/expenses/");
    if (response.ok) {
      const data = await response.json();
      // console.log("Spese ricevute:",data) // dati sensibili, non loggare in produzione
      setExpenses(data);
    }
    // else
    //   console.log("Spese non ricevute, status",response.status, await response.text());
  }
  async function loadBudget() {
    const response = await apiFetch("/budget/status");
    if (response.ok) {
      const data = await response.json();
      setBudgetStatus(data);
    }
  }
  async function loadWeeklyStats() {
    const response = await apiFetch("/expenses/weekly-stats");
    if (response.ok) {
      const data = await response.json();
      setWeeklyStats(data.days);
    }
  }
  useFocusEffect(
    useCallback(()=>{
      loadExpenses();
      loadBudget();
      loadWeeklyStats();
    },[])
  )


  useEffect(() => {
    async function loadUser() {
        const response = await apiFetch("/auth/me");
        if (response.ok) {
        const data = await response.json();
        // console.log("Dati utente ricevuti:", data); // dati sensibili, non loggare in produzione
        setNickname(data.nickname);
        }
        // else {
        //   console.log("Errore /auth/me:", await response.text())
        // }

    }
    loadUser();
    }, [])

  const percentage = budgetStatus?.budget
    ? Math.min((budgetStatus.spent / budgetStatus.budget) * 100, 100)
    : 0;

  const todayStr = new Date().toDateString();
  const weeklyChartData = weeklyStats.map((day) => {
    const isToday = new Date(day.date).toDateString() === todayStr;
    return {
      value: day.total,
      label: GIORNI_SETTIMANA[new Date(day.date).getDay() === 0 ? 6 : new Date(day.date).getDay() - 1],
      frontColor: isToday ? "#2ECC71" : "rgba(255,255,255,0.15)",
      topLabelComponent: () => (
        <Text style={styles.weeklyBarLabel}>€{day.total.toFixed(0)}</Text>
      ),
    };
  });

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Ciao {nickname}!
      </Text>
      <View>
        <View style={styles.headerRow}>
          <Text variant="titleMedium">Budget</Text>
          <Link href="/set_budget" asChild>
            <Button mode="contained" style={styles.budgButt} labelStyle={styles.buttonLabel}>
              + Nuovo
            </Button>
          </Link>
        </View>
        {budgetStatus?.budget != null && (
          <View style={styles.budgetCard}>
            <View style={styles.budgetDecorCircle} />
            <View style={styles.budgetLabelRow}>
              <Text style={styles.budgetLabel}>LIBERO QUESTO MESE</Text>
              <Text style={styles.budgetCycleRange}>
                {formatCycleRange(budgetStatus.cycle_start, budgetStatus.cycle_end)}
              </Text>
            </View>
            <View style={styles.budgetAmountRow}>
              <Text style={styles.budgetRemaining}>€{budgetStatus.remaining?.toFixed(2)}</Text>
              <Text style={styles.budgetOf}>di €{budgetStatus.budget.toFixed(2)}</Text>
            </View>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
            </View>
            <View style={styles.budgetLegendRow}>
              <View style={styles.budgetLegendItem}>
                <View style={[styles.budgetLegendDot, { backgroundColor: "#2ECC71" }]} />
                <Text style={styles.budgetLegendText}>Speso {budgetStatus.spent.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {weeklyChartData.length > 0 && (
        <View style={styles.weeklyCard}>
          <Text style={styles.weeklyTitle}>Spese settimanali</Text>
          <View style={styles.weeklyChartWrapper}>
            <BarChart
              data={weeklyChartData}
              barWidth={22}
              spacing={20}
              roundedTop
              hideRules
              hideYAxisText
              yAxisThickness={0}
              xAxisThickness={0}
              xAxisLabelTextStyle={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}
              noOfSections={3}
              height={100}
            />
          </View>
        </View>
      )}

        <Text variant="titleMedium" style={styles.sectionTitle}>
          Ultime transazioni
        </Text>
        <Link href="/all_expenses" asChild>
          <Text style={styles.linkExpenses}>Vedi tutte</Text>
        </Link>
      <FlatList
        data={expenses.slice(0,2)}
        keyExtractor={(item) => item.id.toString()} //dice a react come identificare univocamente ogni riga
        renderItem={({ item }) => ( //funzione che dice come mostrare ogni riga
          <View style={styles.expenseRow}>
            <View style={styles.expenseInfo}>
              <Text style={styles.expenseDescription}>{item.description}</Text>
              <Text style={styles.expenseMeta}>{item.category_name ?? "Non assegnata"}{" · "}{formatExpenseTime(item.date, item.created_at)}</Text>
            </View>
            <Text style={styles.expenseAmount}>- €{item.amount.toFixed(2)}</Text>
          </View>
        )}
      />
    </View>
  );
}