import { View } from "react-native";
import { Text } from "react-native-paper";
import { PieChart } from "react-native-gifted-charts";
import { useTranslation } from "react-i18next";
import { creaStili } from "@/styles/home.styles";
import { useStili, useTema } from "@/utils/tema";
import { usePreferenze } from "@/utils/preferenze";
import { formatDataSpesa } from "@/utils/date";
import { colorePerGruppo } from "@/utils/categoryIcons";
import { IconaCategoria } from "@/components/IconaCategoria";
import { nomeCategoria } from "@/utils/categorie";

//i due riquadri che la home mostra solo sul computer: sul telefono stanno nelle loro schede
export type CategoriaStat = { category_name: string; total: number };
export type Rinnovo = {
  id: number; description: string; amount: number; next_date: string; is_active: boolean; currency?: string | null;
  //per l'icona, come nella scheda Abbonamenti
  category_name?: string | null; category_group?: string | null;
};

//la ciambella piccola e le prime quattro categorie
export function RiquadroCategorie({ categorie, restoBudget, importo }: {
  categorie: CategoriaStat[];
  //la parte grigia della ciambella: quanto resta del budget
  restoBudget: number;
  importo: (valore: number) => string;
}) {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const { t } = useTranslation();

  const spesoCategorie = categorie.reduce((somma, c) => somma + c.total, 0);
  const datiCiambella = [
    ...categorie.map((c) => ({ value: c.total, color: colorePerGruppo(c.category_name) })),
    ...(restoBudget > 0 ? [{ value: restoBudget, color: colors.donutRemaining }] : []),
  ];

  return (
    <View style={styles.riquadro}>
      <View style={styles.riquadroTesta}>
        <Text style={styles.riquadroTitolo}>{t("home.doveVanno")}</Text>
      </View>
      {categorie.length === 0 ? (
        <Text style={styles.emptyHint}>{t("home.nessunaCategoria")}</Text>
      ) : (
        <View style={styles.miniStatistiche}>
          <PieChart
            data={datiCiambella}
            donut
            radius={56}
            innerRadius={44}
            innerCircleColor={colors.surface}
            centerLabelComponent={() => (
              <Text style={styles.miniTotale}>{importo(spesoCategorie)}</Text>
            )}
          />
          <View style={styles.miniLegenda}>
            {categorie.slice(0, 4).map((c) => (
              <View key={c.category_name} style={styles.miniRiga}>
                <IconaCategoria gruppo={c.category_name} dimensione={24} />
                <Text style={styles.miniNome} numberOfLines={1}>{nomeCategoria(c.category_name)}</Text>
                <Text style={styles.miniImporto}>{importo(c.total)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

//i tre abbonamenti attivi che si rinnovano per primi
export function RiquadroRinnovi({ rinnovi, saldoVisibile }: {
  rinnovi: Rinnovo[];
  saldoVisibile: boolean;
}) {
  const styles = useStili(creaStili);
  const { importoIn, nascosto } = usePreferenze();
  const { t } = useTranslation();

  return (
    <View style={styles.riquadro}>
      <View style={styles.riquadroTesta}>
        <Text style={styles.riquadroTitolo}>{t("home.prossimiRinnovi")}</Text>
      </View>
      {rinnovi.length === 0 ? (
        <Text style={styles.emptyHint}>{t("home.nessunRinnovo")}</Text>
      ) : (
        rinnovi.map((sub) => (
          <View key={sub.id} style={styles.miniRiga}>
            <IconaCategoria categoria={sub.category_name} gruppo={sub.category_group} dimensione={24} />
            <Text style={styles.miniNome} numberOfLines={1}>{sub.description}</Text>
            <Text style={styles.rinnovoData}>{formatDataSpesa(sub.next_date)}</Text>
            <Text style={styles.miniImporto}>{saldoVisibile ? importoIn(sub.amount, sub.currency) : nascosto}</Text>
          </View>
        ))
      )}
    </View>
  );
}
