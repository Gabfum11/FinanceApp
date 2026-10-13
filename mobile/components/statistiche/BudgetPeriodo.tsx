import { View, Pressable } from "react-native";
import { Text, Dialog, Portal, TextInput } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { creaStili } from "@/styles/stats.styles";
import { useStili, useTema } from "@/utils/tema";
import { usePreferenze } from "@/utils/preferenze";
import { simbolo } from "@/utils/formato";
import { DIALOGO_LARGO, useSchermoLargo } from "@/utils/layout";
import { PulsantiDialogo, creaStiliFinestra } from "@/components/Dialogo";
import { IconaCerchio } from "@/components/IconaCategoria";

//il budget del mese mostrato, con la matita per cambiarlo
export function RigaBudget({ budgetMensile, onModifica }: { budgetMensile: number | null; onModifica: () => void }) {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const { importo } = usePreferenze();
  const { t } = useTranslation();
  const largo = useSchermoLargo();

  return (
    <View style={[styles.budgetRiga, largo && styles.senzaMargine]}>
      <IconaCerchio icona="cash" sfondo={colors.primary} dimensione={32} />
      <View style={styles.budgetTesti}>
        <Text style={styles.budgetEtichetta}>{t("statistiche.budget")}</Text>
        <Text style={styles.budgetValore}>
          {budgetMensile != null ? importo(budgetMensile) : t("statistiche.budgetNonImpostato")}
        </Text>
      </View>
      <Pressable
        style={({ pressed }) => [styles.matita, pressed && styles.premuto]}
        onPress={onModifica}
        accessibilityRole="button"
        accessibilityLabel={t("statistiche.modificaBudget")}
      >
        <MaterialCommunityIcons name="pencil" size={20} color={colors.primaryDark} />
      </Pressable>
    </View>
  );
}

//solo sul computer, accanto alla ciambella: quanto resta e quanto e' stato usato
export function RiquadroResto({ resto, meseInCorso, usato }: { resto: number; meseInCorso: boolean; usato: number }) {
  const styles = useStili(creaStili);
  const { importo } = usePreferenze();
  const { t } = useTranslation();

  return (
    <View style={styles.riquadroResto}>
      <Text style={styles.budgetEtichetta}>
        {meseInCorso ? t("statistiche.disponibile") : t("statistiche.avanzato")}
      </Text>
      <Text style={styles.restoValore}>{importo(resto)}</Text>
      <Text style={styles.restoTesto}>{t("statistiche.usato", { percentuale: usato })}</Text>
    </View>
  );
}

//la finestra della matita: valore ed errore stanno nella schermata, che la riempie a ogni apertura
export function FinestraBudget({ visible, periodo, valore, onValore, errore, inCorso, meseInCorso, onSalva, onChiudi }: {
  visible: boolean;
  periodo: string;
  valore: string;
  onValore: (testo: string) => void;
  errore: string;
  inCorso: boolean;
  meseInCorso: boolean;
  onSalva: () => void;
  onChiudi: () => void;
}) {
  const styles = useStili(creaStili);
  const finestra = useStili(creaStiliFinestra);
  const { valuta } = usePreferenze();
  const { t } = useTranslation();
  const largo = useSchermoLargo();

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onChiudi} style={[finestra.finestra, largo && DIALOGO_LARGO]}>
        <Dialog.Title style={finestra.titolo}>{t("statistiche.budget")}</Dialog.Title>
        <Dialog.Content>
          <Text style={styles.dialogPeriodo}>{periodo}</Text>
          <TextInput
            value={valore}
            onChangeText={onValore}
            keyboardType="decimal-pad"
            mode="outlined"
            autoFocus
            left={<TextInput.Affix text={simbolo(valuta)} />}
            error={errore !== ""}
          />
          {errore !== "" && <Text style={styles.dialogErrore}>{errore}</Text>}
          <Text style={styles.dialogSpiegazione}>
            {meseInCorso ? t("statistiche.budgetDaOra") : t("statistiche.budgetSoloPeriodo")}
          </Text>
        </Dialog.Content>
        <PulsantiDialogo
          conferma={t("statistiche.salva")}
          onConferma={onSalva}
          onAnnulla={onChiudi}
          loading={inCorso}
        />
      </Dialog>
    </Portal>
  );
}
