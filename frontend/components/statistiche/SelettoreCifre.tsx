import { View, Pressable } from "react-native";
import { Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { creaStili } from "@/styles/stats.styles";
import { useStili } from "@/utils/tema";
import { usePreferenze } from "@/utils/preferenze";
import { simbolo } from "@/utils/formato";

export type Cifre = "importi" | "percentuali";

//l'interruttore € / %: come si leggono le cifre della legenda sul telefono
export function SelettoreCifre({ cifre, onScegli }: { cifre: Cifre; onScegli: (cifre: Cifre) => void }) {
  const styles = useStili(creaStili);
  const { valuta } = usePreferenze();
  const { t } = useTranslation();

  return (
    <View style={styles.cifreRiga}>
      <View style={styles.cifre}>
        <Pressable
          style={[styles.cifraVoce, cifre === "importi" && styles.cifraScelta]}
          onPress={() => onScegli("importi")}
          accessibilityRole="button"
          accessibilityLabel={t("statistiche.mostraImporti")}
          accessibilityState={{ selected: cifre === "importi" }}
        >
          <Text style={[styles.cifraTesto, cifre === "importi" && styles.cifraTestoScelto]}>{simbolo(valuta)}</Text>
        </Pressable>
        <Pressable
          style={[styles.cifraVoce, cifre === "percentuali" && styles.cifraScelta]}
          onPress={() => onScegli("percentuali")}
          accessibilityRole="button"
          accessibilityLabel={t("statistiche.mostraPercentuali")}
          accessibilityState={{ selected: cifre === "percentuali" }}
        >
          <Text style={[styles.cifraTesto, cifre === "percentuali" && styles.cifraTestoScelto]}>%</Text>
        </Pressable>
      </View>
    </View>
  );
}
