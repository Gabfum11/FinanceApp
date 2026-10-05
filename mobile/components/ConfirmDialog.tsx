import { Button, Dialog, Portal, Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native";
import { radius, type Colori } from "@/styles/tokens";
import { useStili, useTema } from "@/utils/tema";
import { DIALOGO_LARGO, useSchermoLargo } from "@/utils/layout";

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
  loading = false,
  onConfirm,
  onDismiss,
}: Props) {
  const { t } = useTranslation();
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const largo = useSchermoLargo();
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={[styles.dialog, largo && DIALOGO_LARGO]}>
        <Dialog.Title style={styles.title}>{title}</Dialog.Title>
        <Dialog.Content>
          <Text style={styles.message}>{message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss} disabled={loading} textColor={colors.textMuted}>
            {cancelLabel ?? t("comune.annulla")}
          </Button>
          <Button
            onPress={onConfirm}
            loading={loading}
            disabled={loading}
            textColor={destructive ? colors.dangerDark : colors.primary}
          >
            {confirmLabel ?? t("comune.conferma")}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const creaStili = (colors: Colori) =>
  StyleSheet.create({
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  message: {
    lineHeight: 20,
    color: colors.text,
  },
});
