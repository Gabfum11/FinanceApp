import { useEffect, useState } from "react";
import { Animated, View } from "react-native";
import { useTranslation } from "react-i18next";
import { creaStili } from "@/styles/assistant.styles";
import { useStili } from "@/utils/tema";

//i tre puntini delle chat mentre l'assistente risponde; chi usa un lettore
//di schermo sente "Sto analizzando"
export function PuntiniAttesa() {
  const styles = useStili(creaStili);
  const { t } = useTranslation();
  //useState e non useRef: i valori si creano una volta e si leggono nel disegno
  const [valori] = useState(() => [0, 1, 2].map(() => new Animated.Value(0.3)));

  useEffect(() => {
    const animazione = Animated.loop(
      Animated.stagger(
        150,
        valori.map((valore) =>
          Animated.sequence([
            Animated.timing(valore, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(valore, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          ])
        )
      )
    );
    animazione.start();
    return () => animazione.stop();
  }, [valori]);

  return (
    <View
      style={[styles.messageBubble, styles.systemBubble, styles.puntini]}
      accessible
      accessibilityLabel={t("assistente.analizzo")}
      accessibilityLiveRegion="polite"
    >
      {valori.map((valore, i) => (
        <Animated.View key={i} style={[styles.puntino, { opacity: valore }]} />
      ))}
    </View>
  );
}
