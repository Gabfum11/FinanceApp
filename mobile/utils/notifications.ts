import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "@/utils/apiFetch";

// Promemoria per gli abbonamenti in scadenza: il giorno prima alle 9:00.
//
// Le notifiche sono pianificate localmente, non inviate dal server: arrivano
// anche ad app chiusa e non richiedono un servizio che giri di continuo. Il
// prezzo è che vanno ripianificate ogni volta che gli abbonamenti cambiano.

const CHIAVE_ATTIVE = "promemoria_abbonamenti";
const ORA_AVVISO = 9;
const GIORNI_PRIMA = 1;

type Abbonamento = {
  id: number;
  description: string;
  amount: number;
  next_date: string;
  is_active: boolean;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function promemoriaAttivi(): Promise<boolean> {
  return (await AsyncStorage.getItem(CHIAVE_ATTIVE)) === "true";
}

/** Chiede il permesso se non è già stato dato. Restituisce se è concesso. */
async function assicuraPermesso(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return true;
  //su Android il permesso è negabile definitivamente: se l'utente ha già
  //rifiutato, richiederlo non mostra nulla e status resta "denied"
  const richiesta = await Notifications.requestPermissionsAsync();
  return richiesta.status === "granted";
}

async function preparaCanaleAndroid() {
  if (Platform.OS !== "android") return;
  //senza un canale esplicito Android usa quello predefinito, che l'utente
  //non può regolare separatamente dalle altre notifiche dell'app
  await Notifications.setNotificationChannelAsync("abbonamenti", {
    name: "Promemoria abbonamenti",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: null,
  });
}

/**
 * Ricalcola tutte le notifiche a partire dagli abbonamenti attuali.
 *
 * Si cancella e ripianifica tutto invece di aggiornare le singole: un
 * abbonamento può essere stato eliminato, messo in pausa o spostato di data,
 * e tenere traccia di ogni caso sarebbe più fragile che rifare da capo.
 */
export async function ripianificaPromemoria(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!(await promemoriaAttivi())) return;

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;

    await preparaCanaleAndroid();

    const response = await apiFetch("/subscriptions/");
    if (!response.ok) return;
    const abbonamenti: Abbonamento[] = await response.json();

    for (const sub of abbonamenti) {
      if (!sub.is_active) continue;

      const rinnovo = new Date(sub.next_date);
      const quando = new Date(
        rinnovo.getFullYear(),
        rinnovo.getMonth(),
        rinnovo.getDate() - GIORNI_PRIMA,
        ORA_AVVISO,
        0,
        0
      );
      //una data già passata verrebbe rifiutata: succede quando il rinnovo
      //è domani o oggi, e in quel caso l'avviso non serve più
      if (quando.getTime() <= Date.now()) continue;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Abbonamento in scadenza",
          body: `${sub.description} si rinnova domani, ${sub.amount.toFixed(2).replace(".", ",")} €`,
          data: { subscriptionId: sub.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: quando,
          channelId: "abbonamenti",
        },
      });
    }
  } catch {
    //senza rete o senza permesso i promemoria saltano: si riproverà
    //alla prossima apertura della schermata Abbonamenti
  }
}

/** Accende o spegne i promemoria. Restituisce lo stato effettivo. */
export async function impostaPromemoria(attivi: boolean): Promise<boolean> {
  if (!attivi) {
    await AsyncStorage.setItem(CHIAVE_ATTIVE, "false");
    await Notifications.cancelAllScheduledNotificationsAsync();
    return false;
  }

  if (!(await assicuraPermesso())) return false;

  await AsyncStorage.setItem(CHIAVE_ATTIVE, "true");
  await ripianificaPromemoria();
  return true;
}
