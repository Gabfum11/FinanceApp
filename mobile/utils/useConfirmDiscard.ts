import { useRef, useState } from "react";
import { useNavigation } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";

type AzioneBloccata = Parameters<Parameters<typeof usePreventRemove>[1]>[0]["data"]["action"];

/**
 * Chiede conferma prima di lasciare una schermata con modifiche non salvate.
 *
 * Intercetta ogni uscita (freccia indietro, tasto indietro di Android, swipe
 * della modale): controllare solo il pulsante in alto lascerebbe scoperte le altre.
 *
 * Restituisce le prop per ConfirmDialog e `lasciaUscire`, da chiamare prima di
 * router.back() dopo un salvataggio riuscito: li' le modifiche non vanno perse.
 */
export function useConfirmDiscard(modificato: boolean) {
  const navigation = useNavigation();
  const [azioneInAttesa, setAzioneInAttesa] = useState<AzioneBloccata | null>(null);
  //un ref e non uno stato: dopo il salvataggio si esce subito, senza aspettare un nuovo render
  const uscitaConsentita = useRef(false);

  usePreventRemove(modificato, ({ data }) => {
    if (uscitaConsentita.current) navigation.dispatch(data.action);
    else setAzioneInAttesa(data.action);
  });

  return {
    lasciaUscire: () => {
      uscitaConsentita.current = true;
    },
    //da passare cosi' com'e' a ConfirmDialog: <ConfirmDialog {...dialogo} />
    dialogo: {
      title: "Scartare le modifiche?",
      message: "Le modifiche che hai fatto non sono state salvate e andranno perse.",
      confirmLabel: "Scarta",
      cancelLabel: "Continua a modificare",
      destructive: true,
      visible: azioneInAttesa !== null,
      onConfirm: () => {
        const azione = azioneInAttesa;
        setAzioneInAttesa(null);
        if (azione) navigation.dispatch(azione);
      },
      onDismiss: () => setAzioneInAttesa(null),
    },
  };
}
