import { useEffect, useState } from "react";
import Constants from "expo-constants";
import i18n from "@/utils/i18n";
import { scambiaTokenGoogle } from "@/utils/scambioGoogle";

// Il modulo nativo non esiste in Expo Go: importarlo in cima farebbe fallire
// il caricamento della schermata di login, non solo del pulsante Google.
// Con require() dentro un try, in Expo Go l'app parte e il pulsante resta
// nascosto; in una build vera funziona normalmente.
// Nel browser si usa useGoogleLogin.web.ts: questa libreria li' funziona solo
// per chi la sponsorizza.
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
      onError(i18n.t("google.nonDisponibile"));
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
        onError(i18n.t("google.incompleta"));
        return;
      }
      await exchangeToken(idToken);
    } catch (errore: any) {
      //l'utente che chiude la finestra non è un errore da mostrare
      if (errore?.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (errore?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        onError(i18n.t("google.playServices"));
        return;
      }
      //il messaggio a schermo resta generico, ma senza la causa nei log
      //ogni fallimento diverso sembra lo stesso
      console.error("[google] signIn fallito:", errore?.code, errore?.message, errore);
      onError(i18n.t("google.nonRiuscito"));
    } finally {
      setIsLoading(false);
    }
  }

  async function exchangeToken(idToken: string) {
    const errore = await scambiaTokenGoogle(idToken);
    if (errore) onError(errore);
    else onSuccess();
  }

  return {
    signIn,
    isReady: !!WEB_CLIENT_ID && !!GoogleSignin && isAvailable,
    isLoading,
  };
}
