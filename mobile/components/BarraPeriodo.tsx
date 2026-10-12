import { View, Pressable } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { creaStili } from "@/styles/stats.styles";
import { useStili, useTema } from "@/utils/tema";

//la fascia del periodo di Statistiche, usata anche nella lista delle transazioni:
//controllo segmentato, frecce attorno al periodo e "Oggi" per tornare a quello in corso
export function BarraPeriodo<V extends string>({ voci, scelta, onScegli, etichettaGruppo, periodo, nota, inCorso, onSposta, onOggi }: {
  voci: { valore: V; etichetta: string }[];
  scelta: V;
  onScegli: (valore: V) => void;
  etichettaGruppo: string;
  //null: la voce scelta non ha un periodo da scorrere (es. "Tutto")
  periodo: string | null;
  nota?: string;
  inCorso: boolean;
  onSposta: (passo: number) => void;
  onOggi: () => void;
}) {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const { t } = useTranslation();
  return (
    <View style={styles.barraPeriodo}>
      <View style={styles.cifre} accessibilityRole="radiogroup" accessibilityLabel={etichettaGruppo}>
        {voci.map((voce) => (
          <Pressable
            key={voce.valore}
            style={[styles.cifraVoce, styles.vistaVoce, scelta === voce.valore && styles.cifraScelta]}
            onPress={() => onScegli(voce.valore)}
            accessibilityRole="radio"
            accessibilityState={{ checked: scelta === voce.valore }}
          >
            <Text style={[styles.cifraTesto, scelta === voce.valore && styles.cifraTestoScelto]}>{voce.etichetta}</Text>
          </Pressable>
        ))}
      </View>
      {periodo !== null && (
        <View style={styles.navigatore}>
          <FrecciaPeriodo icona="chevron-left" onPress={() => onSposta(-1)} etichetta={t("statistiche.periodoPrima")} />
          <View style={styles.periodoTesti}>
            <Text style={styles.periodo} accessibilityRole="header">{periodo}</Text>
            {!!nota && <Text style={styles.periodoNota}>{nota}</Text>}
          </View>
          <FrecciaPeriodo
            icona="chevron-right"
            onPress={() => onSposta(1)}
            disabilitata={inCorso}
            etichetta={t("statistiche.periodoDopo")}
          />
        </View>
      )}
      {periodo !== null && !inCorso && (
        <Pressable
          style={({ pressed }) => [styles.oggi, pressed && styles.premuto]}
          onPress={onOggi}
          accessibilityRole="button"
          accessibilityLabel={t("statistiche.tornaAOggi")}
        >
          <MaterialCommunityIcons name="calendar-today" size={18} color={colors.primaryDark} />
          <Text style={styles.oggiTesto}>{t("statistiche.oggi")}</Text>
        </Pressable>
      )}
    </View>
  );
}

//freccia per cambiare periodo, 44px da toccare dentro la pillola del navigatore.
//Quella del periodo futuro e' grigia: non si puo' toccare
function FrecciaPeriodo({ icona, onPress, disabilitata = false, etichetta }: {
  icona: string;
  onPress: () => void;
  disabilitata?: boolean;
  etichetta: string;
}) {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  return (
    <Pressable
      style={({ pressed }) => [styles.freccia, pressed && styles.premuto]}
      onPress={onPress}
      disabled={disabilitata}
      accessibilityRole="button"
      accessibilityLabel={etichetta}
      accessibilityState={{ disabled: disabilitata }}
    >
      <MaterialCommunityIcons name={icona as any} size={24} color={disabilitata ? colors.textDisabled : colors.text} />
    </Pressable>
  );
}
