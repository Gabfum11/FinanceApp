import { Dialog, Portal, Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useStili } from "@/utils/tema";
import { DIALOGO_LARGO, useSchermoLargo } from "@/utils/layout";
import { IconaDialogo, PulsantiDialogo, creaStiliFinestra } from "@/components/Dialogo";

// Un'unica conferma per tutta l'app.
//
// Prima convivevano due sistemi: Alert.alert (dialogo nativo di Android, con
// l'aspetto del sistema) per eliminare spese e abbonamenti, e Dialog di Paper
// per eliminare l'account. Azioni identiche con aspetti diversi.

type Props = {
  visible: boolean;
  title: string;
  message: string;
  /** testo del pulsante che conferma */
  confirmLabel?: string;
  cancelLabel?: string;
  /** colora di rosso il pulsante di conferma: per cancellazioni e simili */
  destructive?: boolean;
  /** icona in cima; se manca, un avviso per le azioni distruttive e un punto
   *  di domanda per le altre */
  icon?: string;
  loading?: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = false,
  icon,
  loading = false,
  onConfirm,
  onDismiss,
}: Props) {
  const { t } = useTranslation();
  const styles = useStili(creaStiliFinestra);
  const largo = useSchermoLargo();
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={[styles.finestra, largo && DIALOGO_LARGO]}>
        <IconaDialogo nome={icon ?? (destructive ? "alert" : "help")} distruttivo={destructive} />
        <Dialog.Title style={[styles.titolo, styles.titoloCentrato]}>{title}</Dialog.Title>
        <Dialog.Content>
          <Text style={[styles.testo, styles.testoCentrato]}>{message}</Text>
        </Dialog.Content>
        <PulsantiDialogo
          conferma={confirmLabel ?? t("comune.conferma")}
          onConferma={onConfirm}
          annulla={cancelLabel}
          onAnnulla={onDismiss}
          distruttivo={destructive}
          loading={loading}
        />
      </Dialog>
    </Portal>
  );
}
