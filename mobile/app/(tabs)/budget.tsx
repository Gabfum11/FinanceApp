import { View } from "react-native";
import { IconButton, Text, Button, ActivityIndicator, Snackbar } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { apiFetch } from "@/utils/apiFetch";
import { usePreferenze } from "@/utils/preferenze";
import { useCallback, useEffect, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { creaStili } from "@/styles/budget.styles";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PaginaScorrevole } from "@/components/PaginaScorrevole";
import { useSpazioBarra } from "@/utils/barraSchede";
import { useTranslation } from "react-i18next";
import i18n from "@/utils/i18n";
import { nomeCategoria } from "@/utils/categorie";
import { localeAttuale } from "@/utils/date";
import { useStili, useTema } from "@/utils/tema";
function getRenewal(next_date:string){
  const today= new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(next_date);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return i18n.t("abbonamenti.scadeOggi");
  if (diffDays === 1) return i18n.t("abbonamenti.scadeDomani");
  return i18n.t("abbonamenti.scadeTra", { count: diffDays });
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
  currency?: string | null; //prezzo in un'altra valuta; vuota = quella dell'utente
};
//conferma in attesa: il tipo dice quale azione parte alla conferma
type ConfermaInAttesa =
  | { tipo: "pausa" | "riattiva" | "elimina"; subId: number };

export default function BudgetScreen() {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const { importoIn } = usePreferenze();
  const { t } = useTranslation();
  //i messaggi in basso compaiono sopra la barra delle schede, non sotto
  const spazioBarra = useSpazioBarra();
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
    if (diffDays === 0) return i18n.t("abbonamenti.scadutoOggi");
    if (diffDays === 1) return i18n.t("abbonamenti.scadutoIeri");
    return i18n.t("abbonamenti.scadutoDa", { count: diffDays });
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
          ...(sub.currency && { currency: sub.currency }),
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
        title: t("abbonamenti.pausaTitolo"),
        message: t("abbonamenti.pausaTesto"),
        confirmLabel: t("comune.conferma"),
        destructive: false,
      },
      riattiva: {
        title: t("abbonamenti.riattivaTitolo"),
        message: t("abbonamenti.riattivaTesto"),
        confirmLabel: t("comune.conferma"),
        destructive: false,
      },
      elimina: {
        title: t("abbonamenti.eliminaTitolo"),
        message: t("abbonamenti.eliminaTesto"),
        confirmLabel: t("comune.elimina"),
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
      <PaginaScorrevole style={styles.content} sopraBarra>
        <Text variant="headlineMedium">{t("abbonamenti.attivi")}</Text>
        {activeSubscriptions.map((item) => (
          <View key={item.id} style={styles.subRow}>
            <View style={styles.subIconContainer}>
              <MaterialCommunityIcons name="repeat" size={20} color={colors.primary} />
            </View>
            <View style={styles.subInfo}>
              <Text style={styles.subDesc}>{item.description}</Text>
              <Text style={styles.subMeta}>
                {nomeCategoria(item.category_name)}{" · "}{getRenewal(item.next_date)}
                {!item.auto_renew && ` · ${t("abbonamenti.manuale")}`}
              </Text>
            </View>
            <Text style={styles.subAmount}>{importoIn(item.amount, item.currency)}</Text>
            <IconButton icon="pencil-outline" size={18} onPress={()=>openEdit(item)} accessibilityLabel={t("abbonamenti.modifica")} />
            <IconButton icon="pause" size={18} onPress={()=>confirmToggle(item.id, true)} accessibilityLabel={t("abbonamenti.mettiInPausa")} />
          </View>
        ))}
        {activeSubscriptions.length === 0 && (
          !loaded ? (
            loadError ? null : <ActivityIndicator size="large" style={styles.loader} />
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="autorenew" size={40} color={colors.chevron} />
              <Text style={styles.emptyTitle}>
                {subscriptions.length === 0 ? t("abbonamenti.nessuno") : t("abbonamenti.nessunoAttivo")}
              </Text>
              {subscriptions.length === 0 && (
                <Text style={styles.emptyHint}>
                  {t("abbonamenti.nessunoTesto")}
                </Text>
              )}
            </View>
          )
        )}
        {pausedSubscriptions.length > 0 && (
          <>
            <Text variant="headlineMedium">{t("abbonamenti.inPausa")}</Text>
            {pausedSubscriptions.map((item) => (
              <View key={item.id} style={styles.pausedRow}>
                <View style={styles.pausedIconContainer}>
                  <MaterialCommunityIcons name="pause" size={20} color={colors.textMuted} />
                </View>
                <View style={styles.subInfo}>
                  <Text style={styles.subDesc}>{item.description}</Text>
                  <Text style={styles.pausedMeta}>{t("abbonamenti.pausa")}</Text>
                </View>
                <Text style={styles.reactivateLink} onPress={()=>confirmToggle(item.id, false)}>{t("abbonamenti.riattiva")}</Text>
                <IconButton icon="trash-can-outline" size={18} onPress={() => confirmDelete(item.id)} accessibilityLabel={t("abbonamenti.eliminaTitolo")} />
              </View>
            ))}
          </>
        )}

        {dueForRenewal.length > 0 && (
          <>
            <Text variant="headlineMedium">{t("abbonamenti.daRinnovare")}</Text>
            {dueForRenewal.map((item) => (
              <View key={item.id} style={styles.dueCard}>
                <View style={styles.dueHeader}>
                  <View style={styles.subInfo}>
                    <Text style={styles.subDesc}>{item.description}</Text>
                    <View style={styles.dueBadgeRow}>
                      <Text style={styles.dueBadge}>{t("abbonamenti.inAttesa")}</Text>
                      <Text style={styles.dueOverdue}>{getOverdueText(item.next_date)}</Text>
                    </View>
                  </View>
                  <Text style={styles.subAmount}>{importoIn(item.amount, item.currency)}</Text>
                </View>
                <Text style={styles.dueQuestion}>
                  {t("abbonamenti.domanda", { mese: new Date().toLocaleDateString(localeAttuale(), { month: "long" }) })}
                </Text>
                <View style={styles.dueActions}>
                  <Button
                    mode="contained"
                    onPress={() => handleMarkPaid(item.id)}
                    loading={inPagamento === item.id}
                    disabled={inPagamento !== null}
                  >
                    {t("abbonamenti.hoRinnovato")}
                  </Button>
                  <Button mode="outlined" onPress={() => confirmToggle(item.id, true)}>{t("abbonamenti.nonRinnovo")}</Button>
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
        confirmLabel={conferma ? testiConferma[conferma.tipo].confirmLabel : t("comune.conferma")}
        destructive={conferma ? testiConferma[conferma.tipo].destructive : false}
        onConfirm={eseguiConferma}
        onDismiss={() => setConferma(null)}
      />

      <Snackbar
    wrapperStyle={{ marginBottom: spazioBarra }}
        visible={loadError}
        onDismiss={() => setLoadError(false)}
        action={{ label: t("comune.riprova"), onPress: loadSubscriptions }}
      >
        {t("abbonamenti.erroreCaricamento")}
      </Snackbar>
    </View>
  );
}