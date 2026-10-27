import { View, Pressable } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { creaStili } from "@/styles/stats.styles";
import { useStili, useTema } from "@/utils/tema";
import { usePreferenze } from "@/utils/preferenze";
import { useSchermoLargo } from "@/utils/layout";
import { nomeCategoria } from "@/utils/categorie";
import { colorePerGruppo } from "@/utils/categoryIcons";
import { IconaCategoria } from "@/components/IconaCategoria";

export type CategoryStat = {
  category_name: string;
  total: number;
  //dalla piu' grande, come arrivano dal server
  subcategories: { category_name: string; total: number }[];
};

//aperta una categoria se ne vedono le voci piu' grandi; le altre stanno in "Altre"
const SOTTOCATEGORIE_VISIBILI = 3;

//una categoria della legenda; toccata si apre e mostra le sue sottocategorie
export function RigaCategoria({ item, separata, isAperta, sbiadita, tutteVisibili, onApri, onMostraTutte, cifra, percentuale }: {
  item: CategoryStat;
  separata: boolean;
  isAperta: boolean;
  //un'altra categoria e' aperta: questa sbiadisce
  sbiadita: boolean;
  tutteVisibili: boolean;
  onApri: () => void;
  onMostraTutte: () => void;
  //la cifra come l'utente ha scelto di leggerla (importo o percentuale)
  cifra: (valore: number) => string;
  percentuale: (valore: number) => number;
}) {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const { importo } = usePreferenze();
  const { t } = useTranslation();
  const largo = useSchermoLargo();

  //con una sola voce dentro, aprire non aggiungerebbe niente
  const apribile = item.subcategories.length > 1;
  const nome = nomeCategoria(item.category_name);
  //se resterebbe fuori una sola voce, tanto vale mostrarla
  const voci = tutteVisibili || item.subcategories.length <= SOTTOCATEGORIE_VISIBILI + 1
    ? item.subcategories
    : item.subcategories.slice(0, SOTTOCATEGORIE_VISIBILI);
  const altre = item.subcategories.slice(voci.length);
  const colore = colorePerGruppo(item.category_name);

  return (
    <View>
      <Pressable
        disabled={!apribile}
        onPress={onApri}
        style={({ pressed }) => [
          styles.legendRow,
          separata && styles.legendRowSeparata,
          sbiadita && styles.rigaSbiadita,
          pressed && styles.premuto,
        ]}
        accessibilityRole={apribile ? "button" : undefined}
        accessibilityLabel={apribile
          ? t(isAperta ? "statistiche.chiudiCategoria" : "statistiche.apriCategoria", { categoria: nome })
          : undefined}
        accessibilityState={apribile ? { expanded: isAperta } : undefined}
      >
        <View style={styles.legendLeft}>
          {/* l'icona oltre al colore: la fetta si riconosce anche
              da chi distingue male i colori */}
          <IconaCategoria gruppo={item.category_name} dimensione={30} />
          <Text style={styles.legendLabel} numberOfLines={2}>{nome}</Text>
        </View>
        {largo ? (
          <>
            <Text style={[styles.legendPercentage, styles.colonnaImporto]}>{importo(item.total)}</Text>
            <Text style={styles.colonnaPercentuale}>{percentuale(item.total)}%</Text>
          </>
        ) : (
          <Text style={styles.legendPercentage}>{cifra(item.total)}</Text>
        )}
        {/* lo spazio resta anche senza freccia: gli importi restano in colonna */}
        <View style={styles.freccina}>
          {apribile && (
            <MaterialCommunityIcons name={isAperta ? "chevron-up" : "chevron-down"} size={20} color={colors.textMuted} />
          )}
        </View>
      </Pressable>
      {isAperta && (
        <View style={styles.sottocategorie}>
          {voci.map((sub) => (
            <View key={sub.category_name} style={styles.sottocategoria}>
              <View style={styles.sottocategoriaTesti}>
                <Text style={styles.sottocategoriaNome} numberOfLines={1}>{nomeCategoria(sub.category_name)}</Text>
                <Text style={styles.sottocategoriaImporto}>{largo ? importo(sub.total) : cifra(sub.total)}</Text>
              </View>
              {/* barra rispetto alla voce piu' grande: si confrontano meglio delle fette */}
              <View style={styles.binario}>
                <View
                  style={[
                    styles.barra,
                    { width: `${(sub.total / item.subcategories[0].total) * 100}%`, backgroundColor: colore },
                  ]}
                />
              </View>
            </View>
          ))}
          {altre.length > 0 && (
            <Pressable
              style={({ pressed }) => [styles.altre, pressed && styles.premuto]}
              onPress={onMostraTutte}
              accessibilityRole="button"
            >
              <Text style={styles.altreTesto}>
                {t("statistiche.altre", {
                  numero: altre.length,
                  importo: importo(altre.reduce((somma, sub) => somma + sub.total, 0)),
                })}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={colors.primaryDark} />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

//l'ultima riga: quanto resta del budget, la parte grigia della ciambella
export function RigaResto({ resto, meseInCorso, sbiadita, cifra, percentuale }: {
  resto: number;
  meseInCorso: boolean;
  sbiadita: boolean;
  cifra: (valore: number) => string;
  percentuale: (valore: number) => number;
}) {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const { importo } = usePreferenze();
  const { t } = useTranslation();
  const largo = useSchermoLargo();

  return (
    <View style={[styles.legendRow, styles.legendRowSeparata, sbiadita && styles.rigaSbiadita]}>
      <View style={styles.legendLeft}>
        {/* un anello vuoto, grigio come la sua fetta: e' il pezzo di ciambella
            che resta, non una categoria, quindi niente icona */}
        <View style={[styles.legendaAnello, { borderColor: colors.donutRemaining }]} />
        <Text style={styles.legendLabel} numberOfLines={1}>
          {meseInCorso ? t("statistiche.disponibile") : t("statistiche.avanzato")}
        </Text>
      </View>
      {largo ? (
        <>
          <Text style={[styles.legendPercentage, styles.legendaResto, styles.colonnaImporto]}>{importo(resto)}</Text>
          <Text style={styles.colonnaPercentuale}>{percentuale(resto)}%</Text>
        </>
      ) : (
        <Text style={[styles.legendPercentage, styles.legendaResto]}>{cifra(resto)}</Text>
      )}
      <View style={styles.freccina} />
    </View>
  );
}
