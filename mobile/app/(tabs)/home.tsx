import { useCallback, useEffect, useState } from "react";
import { View, FlatList, Image, Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Button, Text } from "react-native-paper";
import { BarChart } from "react-native-gifted-charts";
import { API_URL } from "@/config";
import { styles } from "../../styles/home.styles";
import { colors } from "../../styles/tokens";
import { apiFetch } from "@/utils/apiFetch";
import { Link, useRouter } from "expo-router";
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
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]); //questo stato contiene un array di expense, inizialmente vuoto
  //serve a distinguere "non ho ancora caricato" da "non ci sono spese":
  //senza, il messaggio di lista vuota lampeggerebbe a ogni apertura
  const [expensesLoaded, setExpensesLoaded] = useState(false);
  const [nickname, setNickname] = useState("");
  const [budgetStatus, setBudgetStatus] = useState<{ budget: number | null; spent: number; remaining: number | null; cycle_start: string; cycle_end: string } | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<DayStat[]>([]);
  async function loadExpenses() {
    //la Home ne mostra due: scaricare tutto lo storico a ogni apertura
    //sarebbe uno spreco che peggiora col passare del tempo
    const response = await apiFetch("/expenses/?limit=5");
    if (response.ok) {
      const data = await response.json();
      // console.log("Spese ricevute:",data) // dati sensibili, non loggare in produzione
      setExpenses(data);
      setExpensesLoaded(true);
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
      frontColor: isToday ? colors.primary : colors.overlayMuted,
      topLabelComponent: () => (
        <Text style={styles.weeklyBarLabel}>€{day.total.toFixed(0)}</Text>
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

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text variant="headlineMedium" style={styles.title}>
          Ciao {nickname}!
        </Text>
        <Pressable
          onPress={() => router.push("/assistant")}
          accessibilityRole="button"
          accessibilityLabel="Apri l'assistente"
          accessibilityHint="Registra una spesa scrivendola a parole"
          hitSlop={8}
          style={({ pressed }) => [
            styles.assistantButton,
            pressed && styles.assistantButtonPressed,
          ]}
        >
          <Image
            source={require("../../assets/images/logo/saldo-bot-1024.png")}
            style={styles.assistantIcon}
          />
          <Text style={styles.assistantButtonLabel}>Chiedi</Text>
        </Pressable>
      </View>
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
                <View style={[styles.budgetLegendDot, { backgroundColor: colors.primary }]} />
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
              barWidth={35}
              spacing={8}
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
          Ultime transazioni
        </Text>
        {expenses.length > 0 && (
          <Link href="/all_expenses" asChild>
            <Text style={styles.linkExpenses}>Vedi tutte</Text>
          </Link>
        )}
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
        ListEmptyComponent={
          expensesLoaded ? (
            <Pressable style={styles.emptyState} onPress={() => router.push("/add_expense")}>
              <MaterialCommunityIcons name="receipt-text-outline" size={40} color="#C7C7CC" />
              <Text style={styles.emptyTitle}>Nessuna spesa registrata</Text>
              <Text style={styles.emptyHint}>
                Tocca il pulsante + in basso per aggiungere la tua prima spesa
              </Text>
            </Pressable>
          ) : null
        }
      />
    </View>
  );
}