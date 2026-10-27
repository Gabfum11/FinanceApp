import { Pressable, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useStili, useTema } from "@/utils/tema";
import { creaStili } from "@/styles/import-estratto.styles";
import type { ErroreImport } from "@/utils/importEstratto";

//mentre il server legge il file: la rotella e la sagoma delle righe in arrivo
export function FaseCaricamento({ mostraAttesa, attesaLunga, movimentoRidotto, nomeFile, onAnnulla }: {
  //sotto mezzo secondo l'attesa non si mostra
  mostraAttesa: boolean;
  attesaLunga: boolean;
  movimentoRidotto: boolean;
  nomeFile: string;
  onAnnulla: () => void;
}) {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const { t } = useTranslation();

  return (
    <>
      {mostraAttesa && (
        <>
          <View style={styles.stato} accessibilityRole="progressbar" accessibilityLiveRegion="polite">
            <ActivityIndicator animating={!movimentoRidotto} color={colors.primary} />
            <View style={styles.statoTesti}>
              <Text style={styles.statoTitolo}>{t("importa.analisi")}</Text>
              <Text style={styles.statoNota} numberOfLines={2}>{nomeFile}</Text>
              {attesaLunga && <Text style={styles.statoNota}>{t("importa.analisiLenta")}</Text>}
            </View>
          </View>
          <View style={styles.sagoma} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {[0.8, 0.65, 0.75, 0.55].map((larghezza, i) => (
              <View key={i} style={[styles.sagomaRiga, i > 0 && styles.sagomaSeparata]}>
                <View style={[styles.blocco, { width: 22, height: 22 }]} />
                <View style={[styles.blocco, { width: 36, height: 36, borderRadius: 18 }]} />
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={[styles.blocco, { width: `${larghezza * 100}%` }]} />
                  <View style={[styles.blocco, { width: "40%", height: 10 }]} />
                </View>
                <View style={[styles.blocco, { width: 56 }]} />
              </View>
            ))}
          </View>
        </>
      )}
      <View style={styles.spazio} />
      <Pressable
        style={({ pressed }) => [styles.pulsanteSecondario, pressed && styles.premuto]}
        onPress={onAnnulla}
        accessibilityRole="button"
      >
        <Text style={styles.pulsanteSecondarioTesto}>{t("comune.annulla")}</Text>
      </Pressable>
    </>
  );
}

//il file non si e' potuto leggere: perche', e la scelta di un altro
export function FaseErrore({ errore, onAltroFile, onTorna }: {
  errore: ErroreImport;
  onAltroFile: () => void;
  onTorna: () => void;
}) {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const { t } = useTranslation();

  return (
    <>
      <View style={styles.errore} accessibilityRole="alert">
        <View style={styles.erroreIcona}>
          <MaterialCommunityIcons name="information" size={30} color={colors.msgArancio} />
        </View>
        <Text style={styles.erroreTitolo}>{t("importa.erroreTitolo")}</Text>
        <Text style={styles.erroreTesto}>{t(`importa.errore_${errore}`)}</Text>
      </View>
      <View style={styles.spazio} />
      <Pressable
        style={({ pressed }) => [styles.pulsante, { marginHorizontal: 16 }, pressed && styles.premuto]}
        onPress={onAltroFile}
        accessibilityRole="button"
      >
        <Text style={styles.pulsanteTesto}>{t("importa.altroFile")}</Text>
      </Pressable>
      <Text style={styles.link} onPress={onTorna} accessibilityRole="link">
        {t("importa.tornaSpesa")}
      </Text>
    </>
  );
}
