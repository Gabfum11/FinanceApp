import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { useNavigation } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";

type AzioneBloccata = Parameters<Parameters<typeof usePreventRemove>[1]>[0]["data"]["action"];

/** Testi del dialogo, per le schermate dove "Scartare le modifiche?" non basta */
type Testi = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  icon?: string;
};

/**
 * Chiede conferma prima di lasciare una schermata con modifiche non salvate.
 *
 * Intercetta ogni uscita (freccia indietro, tasto indietro di Android, swipe
 * della modale): controllare solo il pulsante in alto lascerebbe scoperte le altre.
 * Sul web anche chiudere o ricaricare la scheda: li' il browser mostra il suo avviso.
 *
 * Restituisce le prop per ConfirmDialog e `lasciaUscire`, da chiamare prima di
 * router.back() dopo un salvataggio riuscito: li' le modifiche non vanno perse.
 */
export function useConfirmDiscard(modificato: boolean, testi?: Testi) {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [azioneInAttesa, setAzioneInAttesa] = useState<AzioneBloccata | null>(null);
  //un ref e non uno stato: dopo il salvataggio si esce subito, senza aspettare un nuovo render
  const uscitaConsentita = useRef(false);

  usePreventRemove(modificato, ({ data }) => {
    if (uscitaConsentita.current) navigation.dispatch(data.action);
    else setAzioneInAttesa(data.action);
  });

  useEffect(() => {
    if (!modificato || Platform.OS !== "web") return;
    //il testo lo decide il browser: basta chiedergli di avvisare
    function avvisa(evento: BeforeUnloadEvent) {
      if (uscitaConsentita.current) return;
      evento.preventDefault();
      evento.returnValue = "";
    }
    window.addEventListener("beforeunload", avvisa);
    return () => window.removeEventListener("beforeunload", avvisa);
  }, [modificato]);

  return {
    lasciaUscire: () => {
      uscitaConsentita.current = true;
    },
    //da passare cosi' com'e' a ConfirmDialog: <ConfirmDialog {...dialogo} />
    dialogo: {
      title: testi?.title ?? t("scarta.titolo"),
      message: testi?.message ?? t("scarta.testo"),
      confirmLabel: testi?.confirmLabel ?? t("scarta.conferma"),
      cancelLabel: testi?.cancelLabel ?? t("scarta.annulla"),
      icon: testi?.icon,
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
