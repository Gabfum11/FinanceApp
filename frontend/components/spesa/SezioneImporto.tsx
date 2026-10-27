import { useEffect, useMemo, useState } from "react";
import { Animated, Pressable, View } from "react-native";
import { Text, Menu } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { creaStili, coloriSpesa } from "@/styles/add-expense.styles";
import { useStili, useTema } from "@/utils/tema";
import { usePreferenze } from "@/utils/preferenze";
import { simbolo, VALUTE, type Valuta } from "@/utils/formato";
import { fromDateString, localeAttuale } from "@/utils/date";

//l'importo con la sua valuta, e sotto l'anteprima nella valuta dell'account
export function SezioneImporto({
  amountRaw, focused, onFocus, onApriMenu, valutaSpesa, onScegliValuta, cambioAttuale, senzaCambio, isSubscription,
}: {
  amountRaw: string;
  focused: boolean;
  onFocus: () => void;
  onApriMenu: () => void;
  valutaSpesa: Valuta;
  onScegliValuta: (valuta: Valuta) => void;
  cambioAttuale: { rate: number; date: string } | null;
  senzaCambio: boolean;
  isSubscription: boolean;
}) {
  const styles = useStili(creaStili);
  const { colors: tokens } = useTema();
  const colors = useMemo(() => coloriSpesa(tokens), [tokens]);
  const { importo: formatta } = usePreferenze();
  const { t } = useTranslation();
  const [menuValuta, setMenuValuta] = useState(false);
  const amount = parseFloat(amountRaw.replace(",", "."));

  return (
    <Pressable style={styles.amountSection} onPress={onFocus}>
      <Text variant="labelSmall" style={styles.amountLabel}>
        {t("spesa.importo")}
      </Text>
      <View style={styles.amountRow}>
        <Menu
          visible={menuValuta}
          onDismiss={() => setMenuValuta(false)}
          anchorPosition="bottom"
          contentStyle={styles.menu}
          anchor={
            <Pressable
              style={styles.valutaTocco}
              onPress={() => {
                onApriMenu();
                setMenuValuta(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={t("spesa.valuta", { valuta: valutaSpesa })}
            >
              <Text style={styles.currency}>{simbolo(valutaSpesa)}</Text>
              <MaterialCommunityIcons name="chevron-down" size={18} color={colors.green} />
            </Pressable>
          }
        >
          {VALUTE.map((v) => (
            <Menu.Item
              key={v}
              title={`${simbolo(v)}  ${v}`}
              //la spunta a destra: a sinistra spostava il testo solo sulla voce scelta
              trailingIcon={v === valutaSpesa ? "check" : undefined}
              style={[styles.menuVoce, v === valutaSpesa && styles.menuVoceScelta]}
              titleStyle={[styles.menuTesto, v === valutaSpesa && styles.menuTestoScelto]}
              accessibilityState={{ selected: v === valutaSpesa }}
              onPress={() => {
                onScegliValuta(v);
                setMenuValuta(false);
              }}
            />
          ))}
        </Menu>
        <Text style={styles.amountValue}>{amountRaw}</Text>
        {focused && <BlinkingCursor />}
      </View>
      <View style={[styles.amountUnderline, !focused && styles.amountUnderlineBlurred]} />
      {cambioAttuale && amount > 0 && (
        <Text style={styles.anteprima}>
          {t("spesa.anteprima", {
            importo: formatta(amount * cambioAttuale.rate),
            data: fromDateString(cambioAttuale.date).toLocaleDateString(localeAttuale(), { day: "numeric", month: "short" }),
          })}
          {isSubscription && t("spesa.ricalcolato")}
        </Text>
      )}
      {senzaCambio && (
        <Text style={styles.anteprimaErrore}>
          {isSubscription
            ? t("spesa.senzaCambioAbbonamento")
            : t("spesa.senzaCambioSpesa")}
        </Text>
      )}
    </Pressable>
  );
}

function BlinkingCursor() {
  const styles = useStili(creaStili);
  //useState e non useRef: il valore si crea una volta e si legge durante il
  //disegno, cosa che con .current di un ref il linter non permette
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[styles.cursor, { opacity }]} />;
}
