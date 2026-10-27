import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import i18n from "@/utils/i18n";
import { scambiaTokenGoogle } from "@/utils/scambioGoogle";

// Nel browser si usa Google Identity Services: il pulsante lo disegna Google
// (GoogleButton.web.tsx) e, a accesso riuscito, consegna direttamente l'id_token,
// lo stesso che il backend gia' verifica per l'app.
//
// Funziona solo dagli indirizzi elencati tra le "Authorized JavaScript origins"
// del client Web nella Google Cloud Console: altrove Google risponde origin_mismatch.
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const SCRIPT_GIS = "https://accounts.google.com/gsi/client";

// initialize va chiamato una volta sola per pagina, con una sola callback:
// la riceve la schermata in primo piano, l'unica in cui si puo' premere il pulsante
let gestoreAttivo: ((idToken: string | undefined) => void) | null = null;
let caricamento: Promise<any> | null = null;

export function caricaGoogle(): Promise<any> {
  if (!WEB_CLIENT_ID) return Promise.reject(new Error("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID assente nel bundle"));
  if (!caricamento) {
    caricamento = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_GIS;
      script.async = true;
      script.onload = () => {
        const gis = (window as any).google?.accounts?.id;
        if (!gis) {
          reject(new Error("Google Identity Services assente dopo il caricamento"));
          return;
        }
        gis.initialize({
          client_id: WEB_CLIENT_ID,
          callback: (risposta: { credential?: string }) => gestoreAttivo?.(risposta.credential),
          //senza, chi ha gia' usato Google entrerebbe senza aver premuto nulla
          auto_select: false,
        });
        resolve(gis);
      };
      //script bloccato (adblock, rete): si riprova alla prossima schermata
      script.onerror = () => {
        caricamento = null;
        script.remove();
        reject(new Error("script di Google non caricato"));
      };
      document.head.appendChild(script);
    });
  }
  return caricamento;
}

type Options = {
  onSuccess: () => void;
  onError: (message: string) => void;
};

export function useGoogleLogin({ onSuccess, onError }: Options) {
  const [isLoading, setIsLoading] = useState(false);
  //senza script di Google il pulsante non compare, e si entra con email e password
  const [isAvailable, setIsAvailable] = useState(false);
  //le callback cambiano a ogni render: il gestore registrato usa sempre le ultime
  const callbacks = useRef({ onSuccess, onError });
  callbacks.current = { onSuccess, onError };

  useEffect(() => {
    let montato = true;
    caricaGoogle()
      .then(() => montato && setIsAvailable(true))
      .catch((errore) => console.error("[google]", errore?.message ?? errore));
    return () => {
      montato = false;
    };
  }, []);

  const riceviToken = useCallback(async (idToken: string | undefined) => {
    if (!idToken) {
      callbacks.current.onError(i18n.t("google.incompleta"));
      return;
    }
    setIsLoading(true);
    try {
      const errore = await scambiaTokenGoogle(idToken);
      if (errore) callbacks.current.onError(errore);
      else callbacks.current.onSuccess();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      gestoreAttivo = riceviToken;
      return () => {
        if (gestoreAttivo === riceviToken) gestoreAttivo = null;
      };
    }, [riceviToken])
  );

  return {
    //il clic lo riceve il pulsante disegnato da Google, non il nostro onPress
    signIn: () => {},
    isReady: !!WEB_CLIENT_ID && isAvailable,
    isLoading,
  };
}
