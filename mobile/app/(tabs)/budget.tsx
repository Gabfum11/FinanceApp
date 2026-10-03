import { View } from "react-native";
import { IconButton, Text, Button, ActivityIndicator, Snackbar } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { apiFetch } from "@/utils/apiFetch";
import { usePreferenze } from "@/utils/preferenze";
import { useCallback, useEffect, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { styles } from "@/styles/budget.styles";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PaginaScorrevole } from "@/components/PaginaScorrevole";
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
//conferma in attesa: il tipo dice quale azione parte alla conferma
type ConfermaInAttesa =
  | { tipo: "pausa" | "riattiva" | "elimina"; subId: number };

export default function BudgetScreen() {
  const { importo } = usePreferenze();
  const [subscriptions, setSubscriptions]=useState<Subscription[]>([]);
  const [conferma, setConferma] = useState<ConfermaInAttesa | null>(null);
  //ogni conferma registra una spesa: un doppio tocco ne creerebbe due
  const [inPagamento, setInPagamento] = useState<number | null>(null);
  //distingue "sto caricando" da "non ci sono abbonamenti": senza, il messaggio
  //di lista vuota lampeggerebbe a ogni apertura
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const activeSubscriptions = subscriptions.filter(sub => sub.is_active);
  const pausedSubscriptions = subscriptions.filter(sub => !sub.is_active);
  const today = new Date();
  const dueForRenewal = subscriptions.filter(sub=> sub.is_active && !sub.auto_renew && new Date(sub.next_date)<=today)
  async function loadSubscriptions() {
      setLoadError(false);
      try {
        const response = await apiFetch("/subscriptions/");
        if(response.ok) {
          const data = await response.json()
          setSubscriptions(data);
          setLoaded(true);
        } else setLoadError(true);
      } catch {
        setLoadError(true);
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
          autoRenew: String(sub.auto_renew),
          date: sub.next_date, //in modifica il campo data mostra il prossimo addebito
          ...(sub.category_id !== null && { categoryId: String(sub.category_id) }),
        },
      });
    }
    function confirmToggle(subId: number, isCurrentActive:boolean) {
      setConferma({ tipo: isCurrentActive ? "pausa" : "riattiva", subId });
    }
    function confirmDelete(expenseId: number) {
        setConferma({ tipo: "elimina", subId: expenseId });
    }
    //testi e azione del dialogo, ricavati dalla conferma in attesa
    const testiConferma = {
      pausa: {
        title: "Abbonamento in pausa",
        message: "Sei sicuro di voler mettere in pausa questo abbonamento?",
        confirmLabel: "Conferma",
        destructive: false,
      },
      riattiva: {
        title: "Riattiva abbonamento",
        message: "Sei sicuro di voler riattivare questo abbonamento?",
        confirmLabel: "Conferma",
        destructive: false,
      },
      elimina: {
        title: "Elimina abbonamento",
        message: "Sei sicuro di voler eliminare questo abbonamento?",
        confirmLabel: "Elimina",
        destructive: true,
      },
    } as const;
    function eseguiConferma() {
      if (!conferma) return;
      const { tipo, subId } = conferma;
      setConferma(null);
      if (tipo === "elimina") handleDelete(subId);
      else HandlePause(subId);
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
      if (inPagamento !== null) return;
      setInPagamento(subId);
      try {
        const response = await apiFetch(`/subscriptions/${subId}/mark-paid`, { method: "POST" });
        if (response.ok) {
          const updated = await response.json();
          setSubscriptions(subs => subs.map(sub => sub.id === subId ? updated : sub));
        }
      } finally {
        setInPagamento(null);
      }
    }
  return (
    <View style={styles.container}>
      <PaginaScorrevole style={styles.content}>
        <Text variant="headlineMedium">Abbonamenti attivi</Text>
        {activeSubscriptions.map((item) => (
          <View key={item.id} style={styles.subRow}>
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
            <Text style={styles.subAmount}>{importo(item.amount)}</Text>
            <IconButton icon="pencil-outline" size={18} onPress={()=>openEdit(item)} />
            <IconButton icon="pause" size={18} onPress={()=>confirmToggle(item.id, true)} />
          </View>
        ))}
        {activeSubscriptions.length === 0 && (
          !loaded ? (
            loadError ? null : <ActivityIndicator size="large" style={styles.loader} />
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="autorenew" size={40} color="#C7C7CC" />
              <Text style={styles.emptyTitle}>
                {subscriptions.length === 0 ? "Nessun abbonamento" : "Nessun abbonamento attivo"}
              </Text>
              {subscriptions.length === 0 && (
                <Text style={styles.emptyHint}>
                  Tocca il pulsante + in basso e scegli “Abbonamento” per aggiungerne uno
                </Text>
              )}
            </View>
          )
        )}
        {pausedSubscriptions.length > 0 && (
          <>
            <Text variant="headlineMedium">Abbonamenti in pausa</Text>
            {pausedSubscriptions.map((item) => (
              <View key={item.id} style={styles.pausedRow}>
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
            ))}
          </>
        )}

        {dueForRenewal.length > 0 && (
          <>
            <Text variant="headlineMedium">Da rinnovare</Text>
            {dueForRenewal.map((item) => (
              <View key={item.id} style={styles.dueCard}>
                <View style={styles.dueHeader}>
                  <View style={styles.subInfo}>
                    <Text style={styles.subDesc}>{item.description}</Text>
                    <View style={styles.dueBadgeRow}>
                      <Text style={styles.dueBadge}>IN ATTESA</Text>
                      <Text style={styles.dueOverdue}>{getOverdueText(item.next_date)}</Text>
                    </View>
                  </View>
                  <Text style={styles.subAmount}>{importo(item.amount)}</Text>
                </View>
                <Text style={styles.dueQuestion}>
                  Il pagamento non è automatico: hai rinnovato per {mesi[new Date().getMonth()]}?
                </Text>
                <View style={styles.dueActions}>
                  <Button
                    mode="contained"
                    onPress={() => handleMarkPaid(item.id)}
                    loading={inPagamento === item.id}
                    disabled={inPagamento !== null}
                  >
                    Ho rinnovato
                  </Button>
                  <Button mode="outlined" onPress={() => confirmToggle(item.id, true)}>Non rinnovo</Button>
                </View>
              </View>
            ))}
          </>
        )}
      </PaginaScorrevole>

      <ConfirmDialog
        visible={conferma !== null}
        title={conferma ? testiConferma[conferma.tipo].title : ""}
        message={conferma ? testiConferma[conferma.tipo].message : ""}
        confirmLabel={conferma ? testiConferma[conferma.tipo].confirmLabel : "Conferma"}
        destructive={conferma ? testiConferma[conferma.tipo].destructive : false}
        onConfirm={eseguiConferma}
        onDismiss={() => setConferma(null)}
      />

      <Snackbar
        visible={loadError}
        onDismiss={() => setLoadError(false)}
        action={{ label: "Riprova", onPress: loadSubscriptions }}
      >
        Impossibile caricare gli abbonamenti. Controlla la connessione.
      </Snackbar>
    </View>
  );
}