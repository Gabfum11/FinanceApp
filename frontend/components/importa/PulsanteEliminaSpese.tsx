import { Pressable } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useStili, useTema } from "@/utils/tema";
import { creaStili } from "@/styles/estratti_conto.styles";

//"Elimina spese" di un estratto conto: nella sua card e in cima alle sue spese
export function PulsanteEliminaSpese({ onPress }: { onPress: () => void }) {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const { t } = useTranslation();
  return (
    <Pressable
      style={({ pressed }) => [styles.pulsante, styles.elimina, pressed && styles.premuto]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.dangerDark} />
      <Text style={styles.eliminaTesto}>{t("estratti.elimina")}</Text>
    </Pressable>
  );
}
