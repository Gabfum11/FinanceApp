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
  /** salva sull'account e, se il server accetta, anche qui */
  impostaValuta: (valuta: Valuta) => Promise<boolean>;
  /** allinea alla risposta di /auth/me: vince sempre l'account */
  sincronizza: (dati: { currency?: unknown; language?: unknown }) => void;
  /** importo nella valuta e nella lingua dell'utente */
  importo: (valore: number, decimali?: number) => string;
  /** importo coperto dall'occhio della home */
  nascosto: string;
};

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
    async (nuova: Valuta) => {
      try {
        const response = await apiFetch("/auth/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currency: nuova }),
        });
        if (!response.ok) return false;
        sincronizza(await response.json());
        return true;
      } catch {
        return false;
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
