import i18n from "@/utils/i18n";
import { Platform } from "react-native";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "@/utils/apiFetch";

// expo-notifications è stato rimosso da Expo Go con SDK 53: importarlo in cima
// farebbe fallire il caricamento delle schermate che usano questo file. Con
// require() dentro un try, in Expo Go l'app parte e i promemoria restano disattivati.
const IN_EXPO_GO = Constants.appOwnership === "expo";
//nel browser le push di Expo non esistono: lo switch sparisce come in Expo Go
const SUL_WEB = Platform.OS === "web";

let Notifications: any = null;
if (!IN_EXPO_GO && !SUL_WEB) {
  try {
    Notifications = require("expo-notifications");
  } catch {
    //modulo assente: lo switch dei promemoria non comparirà
  }
}

/** Se false, le notifiche non sono disponibili: lo switch va nascosto. */
export const NOTIFICHE_DISPONIBILI = Notifications !== null;

// Promemoria per gli abbonamenti in scadenza: il giorno prima alle 9:00.
//
// Li invia il server come notifiche push. Prima erano pianificati sul telefono,
// ma se all'ora prevista era spento l'avviso andava perso; una push invece
// resta in coda sui server di Google e arriva alla riaccensione.
// Qui l'app si limita a registrare il telefono presso il backend (push token).

const CHIAVE_ATTIVE = "promemoria_abbonamenti";
//deve coincidere con il channelId che il backend mette nelle push
const CANALE = "abbonamenti";

export type EsitoPromemoria = "attivi" | "spenti" | "permesso_negato" | "errore";

if (Notifications) {
  //di default una notifica che arriva ad app aperta non viene mostrata
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function promemoriaAttivi(): Promise<boolean> {
  return (await AsyncStorage.getItem(CHIAVE_ATTIVE)) === "true";
}

/** Chiede il permesso se non è già stato dato. Restituisce se è concesso. */
async function assicuraPermesso(): Promise<boolean> {
  if (!Notifications) return false;
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return true;
  //su Android il permesso è negabile definitivamente: se l'utente ha già
  //rifiutato, richiederlo non mostra nulla e status resta "denied"
  const richiesta = await Notifications.requestPermissionsAsync();
  return richiesta.status === "granted";
}

async function preparaCanaleAndroid() {
  if (!Notifications || Platform.OS !== "android") return;
  //senza un canale esplicito Android usa quello predefinito, che l'utente
  //non può regolare separatamente dalle altre notifiche dell'app
  await Notifications.setNotificationChannelAsync(CANALE, {
    //il nome che l'utente vede nelle impostazioni di Android
    name: i18n.t("notifiche.canale"),
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: null,
  });
}

/** Ottiene il push token del telefono e lo consegna al backend. */
async function registraDispositivo(): Promise<boolean> {
  await preparaCanaleAndroid();
  //le versioni precedenti pianificavano i promemoria sul telefono: vanno
  //tolti, altrimenti arriverebbero doppi insieme alle push
  await Notifications.cancelAllScheduledNotificationsAsync();

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

  const response = await apiFetch("/auth/push-token", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  return response.ok;
}

/**
 * Da chiamare a ogni apertura dell'app.
 *
 * Il token può cambiare (reinstallazione, dati cancellati) e il backend deve
 * avere sempre l'ultimo; se nel frattempo l'utente ha tolto il permesso dalle
 * impostazioni del telefono, il server smette di inviare.
 */
export async function sincronizzaDispositivo(): Promise<void> {
  if (!Notifications) return;
  try {
    if (!(await promemoriaAttivi())) return;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      await dimenticaDispositivo();
      return;
    }
    await registraDispositivo();
  } catch {
    //senza rete si riproverà alla prossima apertura: il token già
    //registrato resta valido nel frattempo
  }
}

/**
 * Il telefono smette di ricevere i promemoria di questo account.
 *
 * avvisaServer=false quando il server l'ha già fatto da sé (logout da tutti i
 * dispositivi, account eliminato): lì il token di accesso non è più valido e
 * la chiamata risponderebbe 401.
 */
export async function dimenticaDispositivo(avvisaServer = true): Promise<void> {
  //prima lo stato locale: chi entra dopo su questo telefono non deve
  //ritrovarsi registrato con i promemoria di qualcun altro
  await AsyncStorage.setItem(CHIAVE_ATTIVE, "false");
  if (!avvisaServer) return;
  try {
    await apiFetch("/auth/push-token", { method: "DELETE" });
  } catch {
    //senza rete il token resta sul server finché un altro account non lo
    //registra: il backend lo toglie a chiunque lo avesse prima
  }
}

/** Accende o spegne i promemoria. Restituisce l'esito, da cui dipende lo switch. */
export async function impostaPromemoria(attivi: boolean): Promise<EsitoPromemoria> {
  if (!Notifications) return "spenti";
  try {
    if (!attivi) {
      const response = await apiFetch("/auth/push-token", { method: "DELETE" });
      //se il server non lo sa, continuerebbe a inviare: lo switch resta acceso
      if (!response.ok) return "errore";
      await AsyncStorage.setItem(CHIAVE_ATTIVE, "false");
      return "spenti";
    }

    if (!(await assicuraPermesso())) return "permesso_negato";
    if (!(await registraDispositivo())) return "errore";
    await AsyncStorage.setItem(CHIAVE_ATTIVE, "true");
    return "attivi";
  } catch {
    return "errore";
  }
}
