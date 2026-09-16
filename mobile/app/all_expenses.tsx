import { router } from "expo-router";
import { FlatList,View } from "react-native";
import { IconButton,Text } from "react-native-paper";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
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
export default function ExpenseList() {
    const [expenses, setExpenses]=useState<Expense[]>([]);
    async function loadExpenses() {
        const response=await apiFetch("/expenses/");
        if (response.ok) {
            const data=await response.json()
            setExpenses(data)
        }
    }
    useFocusEffect(
        useCallback(()=>{
            loadExpenses();
        },[])
    );
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
        </View>
        <FlatList
        data={expenses} //array che si vuole trasformare in una lista visibile
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
                <IconButton icon="trash-can-outline" size={18} onPress={() => confirmDelete(item.id)} />
            </View>
        )}
        />
       </View> 
    )
}
