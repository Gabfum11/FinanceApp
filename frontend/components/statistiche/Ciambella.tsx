import { View } from "react-native";
import { Text } from "react-native-paper";
import { PieChart } from "react-native-gifted-charts";
import { creaStili } from "@/styles/stats.styles";
import { useStili, useTema } from "@/utils/tema";
import { useSchermoLargo } from "@/utils/layout";

//la ciambella con il totale (o la categoria aperta) al centro
export function Ciambella({ dati, etichetta, valore }: {
  dati: { value: number; color: string }[];
  etichetta: string;
  valore: string;
}) {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const largo = useSchermoLargo();

  return (
    <View style={styles.ciambella}>
      <PieChart
        data={dati}
        donut
        radius={largo ? 110 : 75}
        innerRadius={largo ? 86 : 60}
        //il buco della ciambella e' un cerchio pieno, bianco se non si dice altro
        innerCircleColor={colors.surface}
        centerLabelComponent={() => (
          <View style={styles.centroCiambella}>
            <Text style={styles.totalLabel} numberOfLines={2}>{etichetta}</Text>
            <Text style={styles.totalAmount}>{valore}</Text>
          </View>
        )}
      />
    </View>
  );
}
