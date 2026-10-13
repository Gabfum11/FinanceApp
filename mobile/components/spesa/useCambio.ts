import { useEffect, useState } from "react";
import { apiFetch } from "@/utils/apiFetch";
import type { Valuta } from "@/utils/formato";

//il tasso per l'anteprima "≈ 46,20 €" di una spesa in valuta estera
export function useCambio(estera: boolean, valutaSpesa: Valuta, giorno: string) {
  // Tasso per l'anteprima, legato a valuta e giorno per cui è stato chiesto:
  // cambiando l'una o l'altro, quello vecchio non si mostra più.
  const [cambio, setCambio] = useState<{ chiave: string; rate: number; date: string } | null>(null);
  const [cambioMancante, setCambioMancante] = useState<string | null>(null);
  const chiaveCambio = `${valutaSpesa}-${giorno}`;

  useEffect(() => {
    if (!estera) return;
    let annullato = false;
    apiFetch(`/exchange-rate?from_currency=${valutaSpesa}&day=${giorno}`)
      .then(async (response) => {
        if (annullato) return;
        if (!response.ok) {
          setCambioMancante(chiaveCambio);
          return;
        }
        const dati = await response.json();
        if (!annullato) setCambio({ chiave: chiaveCambio, rate: dati.rate, date: dati.date });
      })
      .catch(() => {
        if (!annullato) setCambioMancante(chiaveCambio);
      });
    return () => {
      annullato = true;
    };
  }, [estera, valutaSpesa, giorno, chiaveCambio]);

  return {
    cambioAttuale: estera && cambio?.chiave === chiaveCambio ? cambio : null,
    senzaCambio: estera && cambioMancante === chiaveCambio,
    //il tasso c'era per l'anteprima ma non al salvataggio
    segnaMancante: () => setCambioMancante(chiaveCambio),
  };
}
