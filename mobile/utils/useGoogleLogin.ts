import { useEffect, useState } from "react";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "@/config";

// Si usa il Google Play Services nativo invece del flusso OAuth via browser:
// con expo-auth-session un client ID di tipo Android faceva rispondere a Google
// "Errore 400: invalid_request", perché quei client non supportano il flusso
// implicito che restituisce direttamente un id_token.
//
// Serve il client ID WEB, non quello Android: quest'ultimo non va passato qui,
// associa soltanto la firma dell'app al progetto Google.
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

if (WEB_CLIENT_ID) {
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
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
    if (!WEB_CLIENT_ID) return;
    GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: false })
      .then(() => setIsAvailable(true))
      .catch(() => setIsAvailable(false));
  }, []);

  async function signIn() {
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
    } catch {
      onError("Errore di rete. Riprova.");
    }
  }

  return {
    signIn,
    isReady: !!WEB_CLIENT_ID && isAvailable,
    isLoading,
  };
}
