import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Avviso } from "@/components/AvvisoEliminazione";

type Testi = { fatto: string; nonRiuscito: string; dettaglio: string };

/** Eliminazione con "Annulla": l'elemento sparisce subito dalla lista, ma la
 *  richiesta al server parte solo quando il messaggio si chiude. Cosi' Annulla
 *  lo rimette com'era, senza ricrearlo (stesso id, stesso estratto conto).
 *  `mostra(item, false)` lo toglie dalla lista, `mostra(item, true)` lo rimette. */
export function useEliminaConAnnulla<T>(
  elimina: (item: T) => Promise<boolean>,
  mostra: (item: T, visibile: boolean) => void,
) {
  const { t } = useTranslation();
  const [avviso, setAvviso] = useState<Avviso | null>(null);
  const sospeso = useRef<{ item: T; testi: Testi } | null>(null);
  //l'uscita dalla schermata usa le funzioni piu' recenti, non quelle del primo render
  const funzioni = useRef({ elimina, mostra });
  funzioni.current = { elimina, mostra };

  async function esegui(item: T, testi: Testi) {
    let riuscito = false;
    try {
      riuscito = await funzioni.current.elimina(item);
    } catch {
      //senza rete: come una risposta di errore
    }
    if (riuscito) return;
    funzioni.current.mostra(item, true);
    setAvviso({
      id: Date.now(),
      tipo: "errore",
      titolo: testi.nonRiuscito,
      dettaglio: t("errori.eliminazione"),
      azione: {
        label: t("comune.riprova"),
        onPress: () => {
          funzioni.current.mostra(item, false);
          esegui(item, testi);
        },
      },
    });
  }

  function confermaSospeso() {
    const s = sospeso.current;
    sospeso.current = null;
    if (s) esegui(s.item, s.testi);
  }

  function avvia(item: T, testi: Testi) {
    //un'altra eliminazione ancora in attesa parte subito: Annulla vale per l'ultima
    confermaSospeso();
    mostra(item, false);
    sospeso.current = { item, testi };
    setAvviso({
      id: Date.now(),
      tipo: "fatto",
      titolo: testi.fatto,
      dettaglio: testi.dettaglio,
      azione: {
        label: t("comune.annulla"),
        onPress: () => {
          sospeso.current = null;
          mostra(item, true);
        },
      },
    });
  }

  //chiamata anche dopo Annulla o Riprova: a quel punto non c'e' piu' niente in sospeso
  function chiudi() {
    setAvviso(null);
    confermaSospeso();
  }

  //lasciando la schermata prima dei 5 secondi l'eliminazione parte comunque.
  //shortcut: chiudendo la scheda del browser in quei 5 secondi l'elemento resta; se capita, inviare la richiesta anche su "pagehide"
  useEffect(() => () => confermaSospeso(), []);

  return { avviso, avvia, chiudi };
}
