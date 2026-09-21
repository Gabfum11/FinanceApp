import { useEffect, useState } from "react";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "@/config";

// chiude la scheda del browser quando l'autenticazione termina
WebBrowser.maybeCompleteAuthSession();

// Gli id client arrivano dalla Google Cloud Console e cambiano per piattaforma.
// Stanno nelle variabili EXPO_PUBLIC_* perché il client deve conoscerli:
// non sono segreti, servono solo a dire a Google quale app sta chiedendo l'accesso.
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

type Options = {
  onSuccess: () => void;
  onError: (message: string) => void;
};

export function useGoogleLogin({ onSuccess, onError }: Options) {
  const [isLoading, setIsLoading] = useState(false);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: ANDROID_CLIENT_ID,
    clientId: WEB_CLIENT_ID, // usato da Expo Go, che non è l'app Android firmata
  });

  useEffect(() => {
    if (response?.type === "success") {
      const idToken = response.params?.id_token;
      if (idToken) {
        exchangeToken(idToken);
      } else {
        onError("Risposta di Google incompleta. Riprova.");
      }
    } else if (response?.type === "error") {
      onError("Accesso con Google non riuscito. Riprova.");
    }
    // il caso "dismiss" è l'utente che ha chiuso la scheda: nessun errore da mostrare
  }, [response]);

  async function exchangeToken(idToken: string) {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  }

  return {
    signIn: () => promptAsync(),
    //request è null finché la configurazione non è pronta: senza questo controllo
    //il pulsante sembrerebbe funzionante ma non aprirebbe nulla
    isReady: !!request && !!(ANDROID_CLIENT_ID || WEB_CLIENT_ID),
    isLoading,
  };
}
