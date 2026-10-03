import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "@/utils/apiFetch";
import { eLingua, eValuta, formattaImporto, importoNascosto, type Lingua, type Valuta } from "@/utils/formato";

// Valuta e lingua dell'utente, a disposizione di tutte le schermate.
//
// La fonte vera e' l'account (/auth/me): qui se ne tiene una copia sul
// telefono, cosi' all'apertura gli importi compaiono subito nella valuta giusta
// invece di passare da "€" mentre si aspetta il server.

const CHIAVE_VALUTA = "preferenze_valuta";
const CHIAVE_LINGUA = "preferenze_lingua";

type Preferenze = {
  valuta: Valuta;
  lingua: Lingua;
  /** salva sull'account e, se il server accetta, anche qui. converti: anche le spese passate */
  impostaValuta: (valuta: Valuta, converti?: boolean) => Promise<EsitoValuta>;
  /** allinea alla risposta di /auth/me: vince sempre l'account */
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

export function PreferenzeProvider({ children }: { children: ReactNode }) {
  const [valuta, setValuta] = useState<Valuta>("EUR");
  const [lingua, setLingua] = useState<Lingua>("it");

  useEffect(() => {
    AsyncStorage.multiGet([CHIAVE_VALUTA, CHIAVE_LINGUA])
      .then(([[, v], [, l]]) => {
        if (eValuta(v)) setValuta(v);
        if (eLingua(l)) setLingua(l);
      })
      .catch(() => {});
  }, []);

  const sincronizza = useCallback((dati: { currency?: unknown; language?: unknown }) => {
    if (eValuta(dati.currency)) {
      setValuta(dati.currency);
      AsyncStorage.setItem(CHIAVE_VALUTA, dati.currency).catch(() => {});
    }
    if (eLingua(dati.language)) {
      setLingua(dati.language);
      AsyncStorage.setItem(CHIAVE_LINGUA, dati.language).catch(() => {});
    }
  }, []);

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
      sincronizza,
      importo: (v, decimali = 2) => formattaImporto(v, valuta, lingua, decimali),
      importoIn: (v, valutaImporto) => formattaImporto(v, eValuta(valutaImporto) ? valutaImporto : valuta, lingua),
      nascosto: importoNascosto(valuta, lingua),
    }),
    [valuta, lingua, impostaValuta, sincronizza]
  );

  return <ContestoPreferenze.Provider value={valore}>{children}</ContestoPreferenze.Provider>;
}

export function usePreferenze(): Preferenze {
  const contesto = useContext(ContestoPreferenze);
  if (!contesto) throw new Error("usePreferenze va usato dentro PreferenzeProvider");
  return contesto;
}
