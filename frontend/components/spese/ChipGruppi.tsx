import { Pressable, ScrollView } from "react-native";
import { Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { creaStili } from "@/styles/all_expenses.styles";
import { useStili } from "@/utils/tema";
import { nomeCategoria } from "@/utils/categorie";

//i chip per filtrare per gruppo, con "Tutte" in testa
export function ChipGruppi({ gruppi, scelto, onScegli }: {
  //[id, nome] dei gruppi che hanno spese
  gruppi: [number, string][];
  scelto: number | null;
  onScegli: (id: number | null) => void;
}) {
  const styles = useStili(creaStili);
  const { t } = useTranslation();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.chipScroll}
      contentContainerStyle={styles.chipRow}
    >
      <Pressable
        onPress={() => onScegli(null)}
        style={[styles.chip, scelto === null && styles.chipSelected]}
        accessibilityRole="button"
        accessibilityState={{ selected: scelto === null }}
      >
        <Text style={[styles.chipLabel, scelto === null && styles.chipLabelSelected]}>
          {t("spese.tutte")}
        </Text>
      </Pressable>
      {gruppi.map(([id, name]) => (
        <Pressable
          key={id}
          onPress={() => onScegli(id)}
          style={[styles.chip, scelto === id && styles.chipSelected]}
          accessibilityRole="button"
          accessibilityState={{ selected: scelto === id }}
        >
          <Text style={[styles.chipLabel, scelto === id && styles.chipLabelSelected]}>
            {nomeCategoria(name)}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
