import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { palette, type Colori } from "@/styles/tokens";

// Tema chiaro o scuro, scelto dall'interruttore nel Profilo.
//
// La scelta resta sul telefono e non sull'account: dipende da dove e quando si
// usa l'app (di sera, in un posto buio), non da chi la usa.

const CHIAVE_TEMA = "tema_scuro";

type Tema = {
  scuro: boolean;
  impostaScuro: (scuro: boolean) => void;
  /** i colori del tema attuale, con gli stessi nomi in chiaro e in scuro */
  colors: Colori;
};

const ContestoTema = createContext<Tema | null>(null);

export function TemaProvider({ children }: { children: ReactNode }) {
  const [scuro, setScuro] = useState(false);
  //finche' la scelta salvata non e' letta non si disegna niente: chi usa il
  //tema scuro vedrebbe l'app lampeggiare in chiaro a ogni apertura
  const [letto, setLetto] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CHIAVE_TEMA)
      .then((valore) => setScuro(valore === "1"))
      .catch(() => {})
      .finally(() => setLetto(true));
  }, []);

  const impostaScuro = useCallback((nuovo: boolean) => {
    setScuro(nuovo);
    AsyncStorage.setItem(CHIAVE_TEMA, nuovo ? "1" : "0").catch(() => {});
  }, []);

  const valore = useMemo<Tema>(
    () => ({ scuro, impostaScuro, colors: scuro ? palette.scuro : palette.chiaro }),
    [scuro, impostaScuro]
  );

  if (!letto) return null;
  return <ContestoTema.Provider value={valore}>{children}</ContestoTema.Provider>;
}

export function useTema(): Tema {
  const contesto = useContext(ContestoTema);
  if (!contesto) throw new Error("useTema va usato dentro TemaProvider");
  return contesto;
}

/** Il foglio di stile della schermata, con i colori del tema attuale.
 *  Si ricalcola solo quando il tema cambia, non a ogni disegno. */
export function useStili<T>(creaStili: (colors: Colori) => T): T {
  const { colors } = useTema();
  return useMemo(() => creaStili(colors), [creaStili, colors]);
}
