import { View } from "react-native";
import { Text, Button, Switch } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { creaStili } from "@/styles/assistant.styles";
import { useStili, useTema } from "@/utils/tema";
import { fromDateString, localeAttuale } from "@/utils/date";
import { CampoData } from "@/components/CampoData";
import { CorpoSpesa, type ExpenseConfirmation } from "./Messaggio";

//la spesa capita dall'assistente, da confermare, modificare o annullare
export function CardProposta({ spesa, onCambiaData, autoRenew, onAutoRenew, onAnnulla, onModifica, onConferma }: {
  spesa: ExpenseConfirmation;
  onCambiaData: (data: Date) => void;
  autoRenew: boolean;
  onAutoRenew: (valore: boolean) => void;
  onAnnulla: () => void;
  onModifica: () => void;
  onConferma: () => void;
}) {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const { t } = useTranslation();

  return (
    //la stessa card dell'esito: confermando cambiano solo intestazione e colore
    <View style={[styles.savedCard, styles.pendingCard]}>
      <View style={[styles.savedHeader, styles.pendingHeader]}>
        <MaterialCommunityIcons name="clock-outline" size={20} color={colors.textMuted} />
        <Text style={styles.pendingTitle}>
          {spesa.recurring ? t("assistente.abbonamentoDaConfermare") : t("assistente.spesaDaConfermare")}
        </Text>
      </View>
      <CorpoSpesa spesa={spesa} />
      {/* un tocco sulla riga apre subito il calendario */}
      <CampoData
        value={fromDateString(spesa.date)}
        onChange={onCambiaData}
        style={styles.pendingLine}
        accessibilityLabel={spesa.recurring ? t("assistente.primoAddebito") : t("assistente.data")}
      >
        <MaterialCommunityIcons name="calendar-outline" size={20} color={colors.textMuted} />
        <Text style={styles.pendingLineLabel}>
          {spesa.recurring ? t("assistente.primoAddebito") : t("assistente.data")}
        </Text>
        <Text style={styles.pendingLineValue}>
          {fromDateString(spesa.date).toLocaleDateString(localeAttuale())}
        </Text>
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.chevron} />
      </CampoData>
      {spesa.recurring && (
        <View style={styles.pendingLine}>
          <MaterialCommunityIcons name="autorenew" size={20} color={colors.textMuted} />
          <Text style={styles.pendingLineLabel}>{t("assistente.rinnovoAutomatico")}</Text>
          <Switch value={autoRenew} onValueChange={onAutoRenew} />
        </View>
      )}
      <View style={styles.cardActions}>
        <Button mode="text" onPress={onAnnulla}>{t("comune.annulla")}</Button>
        <Button mode="outlined" icon="pencil-outline" onPress={onModifica}>{t("comune.modifica")}</Button>
        <Button mode="contained" onPress={onConferma}>{t("comune.conferma")}</Button>
      </View>
    </View>
  );
}
