import { View , FlatList } from "react-native";
import { IconButton, Text, Button } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { apiFetch } from "@/utils/apiFetch";
import { useCallback, useEffect, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { styles } from "@/styles/budget.styles";
import { Alert } from "react-native";
function getRenewal(next_date:string){
  const today= new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(next_date);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Scade oggi";
  if (diffDays === 1) return "Scade domani";
  return `Scade tra ${diffDays} giorni`
}
type Subscription = {
  id: number;
  description: string;
  amount: number;
  date: string;
  next_date:string;
  frequency: string;
  category_id: number | null; //può tornare utile
  category_name: string | null;
  is_active:boolean;
  auto_renew:boolean;
};
const mesi = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
export default function BudgetScreen() {
  const [subscriptions, setSubscriptions]=useState<Subscription[]>([]);
  const activeSubscriptions = subscriptions.filter(sub => sub.is_active);
  const pausedSubscriptions = subscriptions.filter(sub => !sub.is_active);
  const today = new Date();
  const dueForRenewal = subscriptions.filter(sub=> sub.is_active && !sub.auto_renew && new Date(sub.next_date)<=today)
  async function loadSubscriptions() {
      const response = await apiFetch("/subscriptions/");
      if(response.ok) {
        const data = await response.json()
        setSubscriptions(data);
      }
    }
    useFocusEffect(
      useCallback(()=>{
        loadSubscriptions()
      },[])
    );
    function getOverdueText(nextDate: string): string {
    const today = new Date();
    today.setHours(0,0,0,0)
    const target = new Date(nextDate);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "scaduto oggi";
    if (diffDays === 1) return "scaduto ieri";
    return `scaduto ${diffDays} giorni fa`;
}
    function openEdit(sub: Subscription) {
      router.push({
        pathname: "/add_expense",
        params: {
          editId: String(sub.id),
          recurring: "true",
          amount: String(sub.amount),
          description: sub.description,
          frequency: sub.frequency,
          ...(sub.category_id !== null && { categoryId: String(sub.category_id) }),
        },
      });
    }
    function confirmToggle(subId: number, isCurrentActive:boolean) {
      if(isCurrentActive)
      {
        Alert.alert( "Abbonamento in pausa","Sei sicuro di voler mettere in pausa questo abbonamento?", [
        { text: "Annulla" }, 
        { text: "Conferma", onPress: () => HandlePause(subId)},
        ]);
      }
      else
      {
         Alert.alert( "Riattiva abbonamento","Sei sicuro di voler riattivare questo abbonamento?", [
        { text: "Annulla" }, 
        { text: "Conferma", onPress: () => HandlePause(subId)},
        ]);
      }
    }
    function confirmDelete(expenseId: number) {
        Alert.alert("Elimina abbonamento", "Sei sicuro di voler eliminare questo abbonamento?", [
        { text: "Annulla" }, 
        { text: "Elimina", onPress: () => handleDelete(expenseId) },
        ]);
    }
    async function handleDelete(subscription_id:number) {
        const response=await apiFetch(`/subscriptions/${subscription_id}`, {method:"DELETE"});
        if(response.ok){
            setSubscriptions((prev) => prev.filter((exp) => exp.id !== subscription_id)); //serve ad aggiornare la lista a schermo filtrando le spese, il cui id non corrisponde a quello della spesa cancellata
        }
    }
    async function HandlePause(Subid:number){
      const response= await apiFetch(`/subscriptions/${Subid}/toggle`, { method: "PATCH" });
      if(response.ok) {
        const data = await response.json()
        setSubscriptions(subs=> subs.map(sub=>
          sub.id === Subid ? { ...sub, is_active: data.is_active } : sub
        ))
      }

    }
    async function handleMarkPaid(subId: number) {
      const response = await apiFetch(`/subscriptions/${subId}/mark-paid`, { method: "POST" });
      if (response.ok) {
        const updated = await response.json();
        setSubscriptions(subs => subs.map(sub => sub.id === subId ? updated : sub));
      }
    }
  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">Abbonamenti attivi</Text>
      <FlatList
        data={activeSubscriptions}
        keyExtractor={(item)=>item.id.toString()}
        renderItem={({item})=> (
          <View style={styles.subRow}>
            <View style={styles.subIconContainer}>
              <MaterialCommunityIcons name="repeat" size={20} color="#2ECC71" />
            </View>
            <View style={styles.subInfo}>
              <Text style={styles.subDesc}>{item.description}</Text>
              <Text style={styles.subMeta}>
                {item.category_name ?? "Non assegnata" }{" · "}{getRenewal(item.next_date)}
                {!item.auto_renew && " · Manuale"}
              </Text>
            </View>
            <Text style={styles.subAmount}>€{item.amount.toFixed(2)}</Text>
            <IconButton icon="pencil-outline" size={18} onPress={()=>openEdit(item)} />
            <IconButton icon="pause" size={18} onPress={()=>confirmToggle(item.id, true)} />
          </View>
        )}
      />
      {pausedSubscriptions.length >0 && (
        <>
        <Text variant="headlineMedium">Abbonamenti in pausa</Text>
        <FlatList
          data={pausedSubscriptions}
          keyExtractor={(item)=>item.id.toString()}
          renderItem={({item})=>(
              <View style={styles.pausedRow}>
                <View style={styles.pausedIconContainer}>
                  <MaterialCommunityIcons name="pause" size={20} color="#999" />
                </View>
                <View style={styles.subInfo}>
                  <Text style={styles.subDesc}>{item.description}</Text>
                  <Text style={styles.pausedMeta}>In pausa</Text>
                </View>
                <Text style={styles.reactivateLink} onPress={()=>confirmToggle(item.id, false)}>Riattiva</Text>
                 <IconButton icon="trash-can-outline" size={18} onPress={() => confirmDelete(item.id)} />
              </View>
          )}
        />
        </>
      )}

      {dueForRenewal.length > 0 && (
        <>
          <Text variant="headlineMedium">Da rinnovare</Text>
          <FlatList
            data={dueForRenewal}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
                <View style={styles.dueCard}>
                    <View style={styles.dueHeader}>
                        <View style={styles.subInfo}>
                            <Text style={styles.subDesc}>{item.description}</Text>
                            <View style={styles.dueBadgeRow}>
                                <Text style={styles.dueBadge}>IN ATTESA</Text>
                                <Text style={styles.dueOverdue}>{getOverdueText(item.next_date)}</Text>
                            </View>
                        </View>
                        <Text style={styles.subAmount}>€{item.amount.toFixed(2)}</Text>
                    </View>
                    <Text style={styles.dueQuestion}>
                        Il pagamento non è automatico: hai rinnovato per {mesi[new Date().getMonth()]}?
                    </Text>
                    <View style={styles.dueActions}>
                        <Button mode="contained" onPress={() => handleMarkPaid(item.id)}>Ho rinnovato</Button>
                        <Button mode="outlined" onPress={() => confirmToggle(item.id, true)}>Non rinnovo</Button>
                    </View>
                </View>
            )}
          />
        </>
      )}
    </View>
  );
}