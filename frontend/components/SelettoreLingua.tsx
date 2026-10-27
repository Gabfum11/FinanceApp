import { Pressable, View } from "react-native";
import { Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { usePreferenze } from "@/utils/preferenze";
import { LINGUE } from "@/utils/formato";
import { creaStili } from "@/styles/selettore-lingua.styles";
import { Bandiera } from "@/components/Bandiera";
import { useStili } from "@/utils/tema";

// Pillola con bandiera e codice (IT | EN) per chi non ha ancora un account: sta in alto nella prima
// pagina della presentazione e nel login. Dopo l'accesso la lingua si cambia
// dal Profilo. Ogni lingua e' scritta nella sua lingua ("English", non
// "Inglese"): chi non capisce l'italiano deve riconoscerla.
export function SelettoreLingua({ scuro = false }: { scuro?: boolean }) {
  const styles = useStili(creaStili);
  const { lingua, impostaLingua } = usePreferenze();
  const { t } = useTranslation();

  return (
    <View style={[styles.pillola, scuro && styles.pillolaScura]} accessibilityRole="radiogroup" accessibilityLabel={t("lingua.selettore")}>
      {LINGUE.map((l) => {
        const scelta = l === lingua;
        return (
          <Pressable
            key={l}
            onPress={() => impostaLingua(l)}
            style={[styles.voce, scelta && (scuro ? styles.voceSceltaScura : styles.voceScelta)]}
            accessibilityRole="radio"
            accessibilityState={{ checked: scelta }}
            accessibilityLabel={t(`lingua.${l}`)}
            hitSlop={6}
          >
            <Bandiera lingua={l} />
            <Text
              style={[
                styles.testo,
                scuro && styles.testoScuro,
                scelta && (scuro ? styles.testoSceltoScuro : styles.testoScelto),
              ]}
            >
              {l.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
