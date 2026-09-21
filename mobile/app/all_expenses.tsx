import { router } from "expo-router";
import { FlatList, View, Pressable, ScrollView } from "react-native";
import { IconButton, Text, Searchbar } from "react-native-paper";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { apiFetch } from "@/utils/apiFetch";
import { styles } from "@/styles/all_expenses.styles";
import { Alert } from "react-native";

type Expense = {
  id: number;
  description: string;
  amount: number;
  date: string;
  category_id: number | null;
  category_name: string | null;
  created_at : string;
};
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
//"Caffè" va trovato anche digitando "caffe": togliamo accenti e maiuscole
function normalize(text: string): string {
    return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

type Period = "all" | "month" | "quarter";

const PERIODS: { value: Period; label: string }[] = [
    { value: "all", label: "Tutto" },
    { value: "month", label: "Questo mese" },
    { value: "quarter", label: "3 mesi" },
];

function periodStart(period: Period): Date | null {
    const today = new Date();
    if (period === "month") return new Date(today.getFullYear(), today.getMonth(), 1);
    if (period === "quarter") return new Date(today.getFullYear(), today.getMonth() - 2, 1);
    return null;
}

export default function ExpenseList() {
    const [expenses, setExpenses]=useState<Expense[]>([]);
    const [expensesLoaded, setExpensesLoaded] = useState(false);
    const [query, setQuery] = useState("");
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [period, setPeriod] = useState<Period>("all");

    //le categorie da mostrare escono dalle spese stesse: non serve chiamare /categories/,
    //e compaiono solo quelle effettivamente usate
    const categories = useMemo(() => {
        const map = new Map<number, string>();
        for (const e of expenses) {
            if (e.category_id !== null && e.category_name) map.set(e.category_id, e.category_name);
        }
        return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
    }, [expenses]);

    const filtered = useMemo(() => {
        const q = normalize(query.trim());
        const from = periodStart(period);
        return expenses.filter((e) => {
            if (categoryId !== null && e.category_id !== categoryId) return false;
            if (from && new Date(e.date) < from) return false;
            if (!q) return true;
            return (
                normalize(e.description).includes(q) ||
                normalize(e.category_name ?? "").includes(q)
            );
        });
    }, [expenses, query, categoryId, period]);

    const total = useMemo(
        () => filtered.reduce((sum, e) => sum + e.amount, 0),
        [filtered]
    );

    const hasFilters = query.trim() !== "" || categoryId !== null || period !== "all";

    function resetFilters() {
        setQuery("");
        setCategoryId(null);
        setPeriod("all");
    }
    async function loadExpenses() {
        const response=await apiFetch("/expenses/");
        if (response.ok) {
            const data=await response.json()
            setExpenses(data)
            setExpensesLoaded(true)
        }
    }
    useFocusEffect(
        useCallback(()=>{
            loadExpenses();
        },[])
    );
    function openEdit(expense: Expense) {
        router.push({
            pathname: "/add_expense",
            params: {
                editId: String(expense.id),
                amount: String(expense.amount),
                description: expense.description,
                date: expense.date,
                ...(expense.category_id !== null && { categoryId: String(expense.category_id) }),
            },
        });
    }
    function confirmDelete(expenseId: number) {
        Alert.alert("Elimina spesa", "Sei sicuro di voler eliminare questa spesa?", [
        { text: "Annulla" }, 
        { text: "Elimina", onPress: () => handleDelete(expenseId) },
        ]);
    }
    async function handleDelete(expenseId:number) {
        const response=await apiFetch(`/expenses/${expenseId}`, {method:"DELETE"});
        if(response.ok){
            setExpenses((prev) => prev.filter((exp) => exp.id !== expenseId)); //serve ad aggiornare la lista a schermo filtrando le spese, il cui id non corrisponde a quello della spesa cancellata
        }
        
    }
    return (
       <View style={styles.container}>
        <View style={styles.header}>
            <IconButton icon="chevron-left" onPress={()=>router.back()} />
            <Text variant="titleMedium">Transazioni</Text>
            {hasFilters
                ? <IconButton icon="filter-remove-outline" onPress={resetFilters} />
                : <View style={styles.headerSpacer} />}
        </View>

        <Searchbar
            placeholder="Cerca per descrizione o categoria"
            value={query}
            onChangeText={setQuery}
            style={styles.searchbar}
            inputStyle={styles.searchbarInput}
        />

        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
            contentContainerStyle={styles.chipRow}
        >
            {PERIODS.map((p) => (
                <Pressable
                    key={p.value}
                    onPress={() => setPeriod(p.value)}
                    style={[styles.chip, period === p.value && styles.chipSelected]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: period === p.value }}
                >
                    <Text style={[styles.chipLabel, period === p.value && styles.chipLabelSelected]}>
                        {p.label}
                    </Text>
                </Pressable>
            ))}
        </ScrollView>

        {categories.length > 0 && (
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipScroll}
                contentContainerStyle={styles.chipRow}
            >
                <Pressable
                    onPress={() => setCategoryId(null)}
                    style={[styles.chip, categoryId === null && styles.chipSelected]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: categoryId === null }}
                >
                    <Text style={[styles.chipLabel, categoryId === null && styles.chipLabelSelected]}>
                        Tutte
                    </Text>
                </Pressable>
                {categories.map(([id, name]) => (
                    <Pressable
                        key={id}
                        onPress={() => setCategoryId(id)}
                        style={[styles.chip, categoryId === id && styles.chipSelected]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: categoryId === id }}
                    >
                        <Text style={[styles.chipLabel, categoryId === id && styles.chipLabelSelected]}>
                            {name}
                        </Text>
                    </Pressable>
                ))}
            </ScrollView>
        )}

        {/* filtrando, la domanda successiva e' sempre "quanto ho speso in questo".
            Resta sempre montata: comparendo e sparendo sposterebbe la lista */}
        <View style={styles.summaryRow}>
            {filtered.length > 0 && (
                <>
                    <Text style={styles.summaryCount}>
                        {filtered.length} {filtered.length === 1 ? "spesa" : "spese"}
                    </Text>
                    <Text style={styles.summaryTotal}>€{total.toFixed(2)}</Text>
                </>
            )}
        </View>

        <FlatList
        style={styles.list} //senza flex la lista si adatta al contenuto e il layout si riassesta a ogni filtro
        data={filtered} //array che si vuole trasformare in una lista visibile
        keyExtractor={(item)=>item.id.toString()} //dice a React come identificare ogni elemento dell'array in modo univoco
        renderItem={({item})=>(
            <View style={styles.expenseRow}>
                <View style={styles.expenseInfo}>
                    <Text style={styles.expenseDescription}>{item.description}</Text>
                    <Text style={styles.expenseMeta}>
                        {item.category_name ?? "Non assegnata"} · {formatExpenseTime(item.date, item.created_at)}
                    </Text>
                </View>
                <Text style={styles.expenseAmount}>- €{item.amount.toFixed(2)}</Text>
                <IconButton icon="pencil-outline" size={18} onPress={() => openEdit(item)} />
                <IconButton icon="trash-can-outline" size={18} onPress={() => confirmDelete(item.id)} />
            </View>
        )}
        ListEmptyComponent={
            !expensesLoaded ? null : hasFilters ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>Nessun risultato</Text>
                    <Text style={styles.emptyHint}>Prova a cambiare ricerca o filtri</Text>
                </View>
            ) : (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>Nessuna spesa registrata</Text>
                </View>
            )
        }
        />
       </View> 
    )
}
