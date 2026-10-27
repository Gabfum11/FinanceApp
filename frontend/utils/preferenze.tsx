import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "@/utils/apiFetch";
import { haSessione } from "@/utils/session";
import i18n from "@/utils/i18n";
import { eLingua, eValuta, formattaImporto, importoNascosto, type Lingua, type Valuta } from "@/utils/formato";

// Valuta e lingua dell'utente, a disposizione di tutte le schermate.
//
// La fonte vera e' l'account (/auth/me): qui se ne tiene una copia sul
// telefono, cosi' all'apertura gli importi compaiono subito nella valuta giusta
// e i testi nella lingua giusta, invece di aspettare il server.
//
// La lingua si puo' scegliere anche prima di avere un account (selettore della
// presentazione e del login): resta sul telefono e parte verso l'account al
// primo accesso. Vince la scelta piu' recente: chi tocca "EN" prima del login
// si aspetta l'app in inglese anche dopo.

const CHIAVE_VALUTA = "preferenze_valuta";
const CHIAVE_LINGUA = "preferenze_lingua";
//lingua scelta sul telefono e non ancora salvata sull'account
const CHIAVE_LINGUA_DA_INVIARE = "preferenze_lingua_da_inviare";

type Preferenze = {
  valuta: Valuta;
  lingua: Lingua;
  /** salva sull'account e, se il server accetta, anche qui. converti: anche le spese passate */
  impostaValuta: (valuta: Valuta, converti?: boolean) => Promise<EsitoValuta>;
  /** cambia subito la lingua dell'app e, se c'e' un account, la salva anche li' */
  impostaLingua: (lingua: Lingua) => Promise<void>;
  /** allinea alla risposta di /auth/me: vince l'account, salvo una lingua scelta da poco qui */
  sincronizza: (dati: { currency?: unknown; language?: unknown }) => void;
  /** importo nella valuta e nella lingua dell'utente */
  importo: (valore: number, decimali?: number) => string;
  /** importo in un'altra valuta (spesa o abbonamento in valuta estera); vuota = quella dell'utente */
  importoIn: (valore: number, valutaImporto: string | null | undefined) => string;
  /** importo coperto dall'occhio della home */
  nascosto: string;
};

//"cambio": il servizio dei tassi non ha risposto e non e' cambiato niente
export type EsitoValuta = "ok" | "cambio" | "errore";

const ContestoPreferenze = createContext<Preferenze | null>(null);

async function inviaLingua(lingua: Lingua): Promise<boolean> {
  try {
    const response = await apiFetch("/auth/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: lingua }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function PreferenzeProvider({ children }: { children: ReactNode }) {
  const [valuta, setValuta] = useState<Valuta>("EUR");
  const [lingua, setLingua] = useState<Lingua>("it");
  //letti dalle funzioni qui sotto senza ricrearle a ogni cambio
  const linguaAttuale = useRef<Lingua>("it");
  const linguaDaInviare = useRef(false);

  const applicaLingua = useCallback((nuova: Lingua) => {
    linguaAttuale.current = nuova;
    setLingua(nuova);
    i18n.changeLanguage(nuova);
    AsyncStorage.setItem(CHIAVE_LINGUA, nuova).catch(() => {});
  }, []);

  useEffect(() => {
    AsyncStorage.multiGet([CHIAVE_VALUTA, CHIAVE_LINGUA, CHIAVE_LINGUA_DA_INVIARE])
      .then(([[, v], [, l], [, daInviare]]) => {
        if (eValuta(v)) setValuta(v);
        if (eLingua(l)) applicaLingua(l);
        linguaDaInviare.current = daInviare === "1";
      })
      .catch(() => {});
  }, [applicaLingua]);

  const sincronizza = useCallback(
    (dati: { currency?: unknown; language?: unknown }) => {
      if (eValuta(dati.currency)) {
        setValuta(dati.currency);
        AsyncStorage.setItem(CHIAVE_VALUTA, dati.currency).catch(() => {});
      }
      if (linguaDaInviare.current) {
        //scelta fatta qui prima del login: e' l'account che si adegua
        const daSalvare = linguaAttuale.current;
        inviaLingua(daSalvare).then((riuscito) => {
          if (!riuscito) return;
          linguaDaInviare.current = false;
          AsyncStorage.removeItem(CHIAVE_LINGUA_DA_INVIARE).catch(() => {});
        });
      } else if (eLingua(dati.language) && dati.language !== linguaAttuale.current) {
        applicaLingua(dati.language);
      }
    },
    [applicaLingua]
  );

  const impostaLingua = useCallback(
    async (nuova: Lingua) => {
      applicaLingua(nuova);
      //senza account, o senza rete, la scelta parte al prossimo /auth/me
      const salvata = (await haSessione()) && (await inviaLingua(nuova));
      linguaDaInviare.current = !salvata;
      if (salvata) AsyncStorage.removeItem(CHIAVE_LINGUA_DA_INVIARE).catch(() => {});
      else AsyncStorage.setItem(CHIAVE_LINGUA_DA_INVIARE, "1").catch(() => {});
    },
    [applicaLingua]
  );

  const impostaValuta = useCallback(
    async (nuova: Valuta, converti = false): Promise<EsitoValuta> => {
      try {
        const response = await apiFetch("/auth/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currency: nuova, convert_history: converti }),
        });
        if (response.status === 503) return "cambio";
        if (!response.ok) return "errore";
        sincronizza(await response.json());
        return "ok";
      } catch {
        return "errore";
      }
    },
    [sincronizza]
  );

  const valore = useMemo<Preferenze>(
    () => ({
      valuta,
      lingua,
      impostaValuta,
      impostaLingua,
      sincronizza,
      importo: (v, decimali = 2) => formattaImporto(v, valuta, lingua, decimali),
      importoIn: (v, valutaImporto) => formattaImporto(v, eValuta(valutaImporto) ? valutaImporto : valuta, lingua),
      nascosto: importoNascosto(valuta, lingua),
    }),
    [valuta, lingua, impostaValuta, impostaLingua, sincronizza]
  );

  return <ContestoPreferenze.Provider value={valore}>{children}</ContestoPreferenze.Provider>;
}

export function usePreferenze(): Preferenze {
  const contesto = useContext(ContestoPreferenze);
  if (!contesto) throw new Error("usePreferenze va usato dentro PreferenzeProvider");
  return contesto;
}
