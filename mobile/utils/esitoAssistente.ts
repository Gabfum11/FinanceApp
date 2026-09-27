// "Modifica" nell'assistente apre il form di aggiunta, che salva per conto suo.
// Con router.back() il form non puo' restituire dati alla chat: lascia qui
// l'esito, e l'assistente lo legge quando torna in primo piano.

export type SpesaSalvata = {
  id: number;
  description: string;
  amount: number;
  date: string;
  category_id: number | null;
  category_name: string | null;
  category_group: string | null;
  recurring: boolean;
  frequency: string | null;
};

let ultimaSalvata: SpesaSalvata | null = null;

export function segnalaSalvataggio(spesa: SpesaSalvata) {
  ultimaSalvata = spesa;
}

/** Restituisce l'esito e lo cancella: ogni salvataggio va mostrato una volta sola. */
export function prendiSalvataggio(): SpesaSalvata | null {
  const spesa = ultimaSalvata;
  ultimaSalvata = null;
  return spesa;
}
