import { StyleSheet, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import type { Lingua } from "@/utils/formato";

// Bandierina tonda accanto al codice della lingua nel selettore.
//
// Disegnata e non emoji: su Windows le emoji delle bandiere non esistono e il
// browser mostrerebbe le lettere "IT" e "GB". Il cerchio si ottiene ritagliando
// un quadrato con overflow: hidden, che funziona uguale su telefono e browser.
// Inglese = Regno Unito: la bandiera aiuta a riconoscere, il codice accanto
// dice che e' una lingua e non un Paese.
export function Bandiera({ lingua, dimensione = 18 }: { lingua: Lingua; dimensione?: number }) {
  return (
    <View
      style={[styles.cerchio, { width: dimensione, height: dimensione, borderRadius: dimensione / 2 }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={dimensione} height={dimensione} viewBox="0 0 20 20">
        {lingua === "it" ? (
          <>
            <Rect width={7} height={20} fill="#009246" />
            <Rect x={7} width={6} height={20} fill="#FFFFFF" />
            <Rect x={13} width={7} height={20} fill="#CE2B37" />
          </>
        ) : (
          <>
            <Rect width={20} height={20} fill="#012169" />
            <Path d="M0 0L20 20M20 0L0 20" stroke="#FFFFFF" strokeWidth={4} />
            <Path d="M0 0L20 20M20 0L0 20" stroke="#C8102E" strokeWidth={1.5} />
            <Path d="M10 0V20M0 10H20" stroke="#FFFFFF" strokeWidth={6} />
            <Path d="M10 0V20M0 10H20" stroke="#C8102E" strokeWidth={3.5} />
          </>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  //il bordo sottile tiene distinta la striscia bianca dell'Italia sugli sfondi chiari
  cerchio: {
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.15)",
  },
});
