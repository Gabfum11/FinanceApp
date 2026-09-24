import { useEffect, useState } from "react";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "@/config";

// Il modulo nativo non esiste in Expo Go: importarlo in cima farebbe fallire
// il caricamento della schermata di login, non solo del pulsante Google.
// Con require() dentro un try, in Expo Go l'app parte e il pulsante resta
// nascosto; in una build vera funziona normalmente.
const IN_EXPO_GO = Constants.appOwnership === "expo";

let GoogleSignin: any = null;
let statusCodes: any = {};
if (!IN_EXPO_GO) {
  try {
    const modulo = require("@react-native-google-signin/google-signin");
    GoogleSignin = modulo.GoogleSignin;
    statusCodes = modulo.statusCodes;
  } catch {
    //modulo assente: il pulsante non comparirà
  }
}

// Si usa il Google Play Services nativo invece del flusso OAuth via browser:
// con expo-auth-session un client ID di tipo Android faceva rispondere a Google
// "Errore 400: invalid_request", perché quei client non supportano il flusso
// implicito che restituisce direttamente un id_token.
//
// Serve il client ID WEB, non quello Android: quest'ultimo non va passato qui,
// associa soltanto la firma dell'app al progetto Google.
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

if (WEB_CLIENT_ID && GoogleSignin) {
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
} else if (GoogleSignin) {
  //senza webClientId il modulo nativo fallisce al primo signIn, ma il
  //pulsante resta visibile: senza questo avviso la causa e' invisibile
  console.error("[google] EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID assente nel bundle");
}

type Options = {
  onSuccess: () => void;
  onError: (message: string) => void;
};

export function useGoogleLogin({ onSuccess, onError }: Options) {
  const [isLoading, setIsLoading] = useState(false);
  //Google Play Services manca su alcuni dispositivi (emulatori, telefoni
  //senza servizi Google): senza, il pulsante non deve comparire
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    if (!WEB_CLIENT_ID || !GoogleSignin) return;
    GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: false })
      .then(() => setIsAvailable(true))
      .catch(() => setIsAvailable(false));
  }, []);

  async function signIn() {
    if (!GoogleSignin) {
      onError("Accesso con Google non disponibile in questa versione dell'app.");
      return;
    }
    setIsLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      //signOut prima: senza, riapre l'ultimo account usato senza chiedere,
      //e non si potrebbe cambiare utente
      await GoogleSignin.signOut().catch(() => {});
      const risposta = await GoogleSignin.signIn();

      const idToken =
        (risposta as any)?.data?.idToken ?? (risposta as any)?.idToken;
      if (!idToken) {
        onError("Risposta di Google incompleta. Riprova.");
        return;
      }
      await exchangeToken(idToken);
    } catch (errore: any) {
      //l'utente che chiude la finestra non è un errore da mostrare
      if (errore?.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (errore?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        onError("Google Play Services non disponibile su questo dispositivo.");
        return;
      }
      //il messaggio a schermo resta generico, ma senza la causa nei log
      //ogni fallimento diverso sembra lo stesso
      console.error("[google] signIn fallito:", errore?.code, errore?.message, errore);
      onError("Accesso con Google non riuscito. Riprova.");
    } finally {
      setIsLoading(false);
    }
  }

  async function exchangeToken(idToken: string) {
    try {
      // il token di Google non è il nostro: lo scambiamo con un token dell'app
      const res = await fetch(`${API_URL}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: idToken, remember_me: true }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        console.error("[google] scambio token rifiutato:", res.status, body);
        onError(
          typeof body?.detail === "string"
            ? body.detail
            : "Accesso con Google non riuscito. Riprova."
        );
        return;
      }

      const data = await res.json();
      await SecureStore.setItemAsync("token", data.access_token);
      onSuccess();
    } catch (errore) {
      console.error("[google] rete non raggiungibile:", API_URL, errore);
      onError("Errore di rete. Riprova.");
    }
  }

  return {
    signIn,
    isReady: !!WEB_CLIENT_ID && !!GoogleSignin && isAvailable,
    isLoading,
  };
}
