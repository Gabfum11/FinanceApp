import { useCallback, useEffect, useRef, useState } from "react";
import { View, Image, Pressable, BackHandler, type LayoutChangeEvent } from "react-native";
import { Portal, Text, Button } from "react-native-paper";
import Svg, { Path, Rect } from "react-native-svg";
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useReducedMotion,
} from "react-native-reanimated";
import { misuraBersaglio, type Rettangolo } from "@/utils/tour";
import { styles, VELO } from "@/styles/tour.styles";

type Passaggio = {
  bersaglio: string;
  titolo: string;
  testo: string;
  margine: number;
  raggio: number;
  //nella barra delle schede si registra solo l'icona: il buco si allarga
  //a tutta la colonna, etichetta compresa
  colonnaTab?: boolean;
};

const PASSAGGI: Passaggio[] = [
  {
    bersaglio: "aggiungi",
    titolo: "Aggiungi una spesa",
    testo: "Tocca + per registrarla. Scegliendo “Abbonamento” in alto, ti avviso il giorno prima di ogni rinnovo.",
    margine: 6,
    raggio: 34,
  },
  {
    bersaglio: "nuovo-budget",
    titolo: "Imposta il budget",
    testo: "Decidi quanto spendere al mese: qui sotto vedrai quanto ti resta.",
    margine: 6,
    raggio: 24,
  },
  {
    bersaglio: "occhio",
    titolo: "Nascondi gli importi",
    testo: "Utile quando sei in pubblico. La scelta resta anche quando riapri l'app.",
    margine: 4,
    raggio: 26,
  },
  {
    bersaglio: "assistente",
    titolo: "Scrivila a parole",
    testo: "Scrivi “Pizza 15 euro ieri” e l'assistente registra la spesa per te.",
    margine: 6,
    raggio: 24,
  },
  {
    bersaglio: "abbonamenti",
    titolo: "I tuoi abbonamenti",
    testo: "Qui li trovi tutti: mettili in pausa, modificali e conferma quelli da rinnovare.",
    margine: 4,
    raggio: 14,
    colonnaTab: true,
  },
];

const COLONNE_TAB = 5;
const ICONA_APP = require("../assets/images/logo/trackit-icon-rounded-180.png");

//velo pieno con un rettangolo arrotondato vuoto: evenodd lascia trasparente
//la parte interna, cosi' il pulsante resta visibile sotto
function pathConBuco(larghezza: number, altezza: number, b: Rettangolo, raggio: number) {
  const r = Math.min(raggio, b.w / 2, b.h / 2);
  const { x, y, w, h } = b;
  return (
    `M0 0H${larghezza}V${altezza}H0Z ` +
    `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}` +
    `V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}` +
    `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}` +
    `V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
  );
}

type Props = {
  onFine: (come: "completato" | "saltato") => void;
};

//va montato solo quando serve: ogni apertura riparte dalla card di benvenuto
export function TourGuidato({ onFine }: Props) {
  //-1 = card di benvenuto, poi gli indici di PASSAGGI
  const [indice, setIndice] = useState(-1);
  const [schermo, setSchermo] = useState<Rettangolo | null>(null);
  //il riquadro ricorda a quale passaggio appartiene: cambiando passaggio,
  //quello vecchio non si disegna mentre si misura il pulsante nuovo
  const [misura, setMisura] = useState<{ indice: number; rett: Rettangolo } | null>(null);
  const origine = useRef<View>(null);
  const riduciMovimento = useReducedMotion();
  const impulso = useSharedValue(0);

  //il bordo giallo si allarga e svanisce: attira l'occhio sul pulsante
  useEffect(() => {
    if (riduciMovimento) return;
    impulso.value = withRepeat(withTiming(1, { duration: 1600 }), -1, false);
  }, [riduciMovimento, impulso]);

  const anello = useAnimatedStyle(() => ({
    opacity: 0.9 * (1 - impulso.value),
    transform: [{ scale: 1 + impulso.value * 0.18 }],
  }));

  //il tasto indietro di Android vale come "Salta"; registrato dopo quello
  //della home, viene chiamato per primo
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onFine("saltato");
      return true;
    });
    return () => sub.remove();
  }, [onFine]);

  //il velo e i pulsanti misurano la posizione rispetto alla finestra:
  //sottraendo l'origine del velo i due sistemi coincidono anche se non parte da 0
  const misuraSchermo = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    origine.current?.measureInWindow((x, y) => setSchermo({ x, y, w: width, h: height }));
  }, []);

  useEffect(() => {
    if (indice < 0 || !schermo) return;
    const p = PASSAGGI[indice];
    let annullato = false;
    misuraBersaglio(p.bersaglio).then((r) => {
      if (annullato) return;
      //pulsante non trovato (schermata diversa, layout non pronto): meglio
      //saltare il passaggio che evidenziare un punto vuoto
      if (!r) {
        if (indice + 1 < PASSAGGI.length) setIndice(indice + 1);
        else onFine("completato");
        return;
      }
      let rett = { x: r.x - schermo.x, y: r.y - schermo.y, w: r.w, h: r.h };
      if (p.colonnaTab) {
        const colonna = schermo.w / COLONNE_TAB;
        const centro = rett.x + rett.w / 2;
        rett = { x: centro - colonna / 2, y: rett.y - 4, w: colonna, h: rett.h + 22 };
      }
      setMisura({
        indice,
        rett: {
          x: rett.x - p.margine,
          y: rett.y - p.margine,
          w: rett.w + p.margine * 2,
          h: rett.h + p.margine * 2,
        },
      });
    });
    return () => {
      annullato = true;
    };
  }, [indice, schermo, onFine]);

  const buco = misura && misura.indice === indice ? misura.rett : null;
  const passaggio = indice >= 0 ? PASSAGGI[indice] : null;
  const ultimo = indice === PASSAGGI.length - 1;
  const avanti = () => (ultimo ? onFine("completato") : setIndice(indice + 1));
  //il fumetto va dalla parte dello schermo dove c'e' piu' spazio
  const sotto = buco && schermo ? buco.y + buco.h / 2 < schermo.h / 2 : true;
  const frecciaX =
    buco && schermo ? Math.max(18, Math.min(buco.x + buco.w / 2 - 12 - 7, schermo.w - 24 - 32)) : 0;

  return (
    <Portal>
      <View ref={origine} style={{ flex: 1 }} onLayout={misuraSchermo}>
        {schermo && (
          <Svg width={schermo.w} height={schermo.h} style={{ position: "absolute" }}>
            {buco && passaggio ? (
              <Path d={pathConBuco(schermo.w, schermo.h, buco, passaggio.raggio)} fill={VELO} fillRule="evenodd" />
            ) : (
              <Rect width={schermo.w} height={schermo.h} fill={VELO} />
            )}
          </Svg>
        )}

        {passaggio && buco && schermo ? (
          <>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.ring,
                { left: buco.x - 4, top: buco.y - 4, width: buco.w + 8, height: buco.h + 8, borderRadius: passaggio.raggio + 4 },
                anello,
              ]}
            />
            {/* toccare il pulsante evidenziato vale come "Avanti" */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Avanti"
              onPress={avanti}
              style={{ position: "absolute", left: buco.x, top: buco.y, width: buco.w, height: buco.h }}
            />
            <Animated.View
              key={indice}
              entering={FadeIn.duration(220)}
              accessibilityViewIsModal
              style={[
                styles.tip,
                sotto ? { top: buco.y + buco.h + 14 } : { bottom: schermo.h - buco.y + 14 },
              ]}
            >
              <View style={[styles.arrow, { left: frecciaX }, sotto ? { top: -6 } : { bottom: -6 }]} />
              <Text style={styles.count}>
                {indice + 1} DI {PASSAGGI.length}
              </Text>
              <Text style={styles.tipTitle}>{passaggio.titolo}</Text>
              <Text style={styles.tipText}>{passaggio.testo}</Text>
              <View style={styles.tipFooter}>
                <View style={styles.pips}>
                  {PASSAGGI.map((p, i) => (
                    <View key={p.bersaglio} style={[styles.pip, i === indice && styles.pipActive]} />
                  ))}
                </View>
                <View style={styles.tipButtons}>
                  {!ultimo && (
                    <Button onPress={() => onFine("saltato")} labelStyle={styles.skipLabel}>
                      Salta
                    </Button>
                  )}
                  <Button mode="contained" onPress={avanti}>
                    {ultimo ? "Fine" : "Avanti"}
                  </Button>
                </View>
              </View>
            </Animated.View>
          </>
        ) : indice < 0 && schermo ? (
          <Animated.View
            entering={FadeIn.duration(220)}
            accessibilityViewIsModal
            style={[styles.introCard, { top: schermo.h / 2 - 150 }]}
          >
            <Image source={ICONA_APP} style={styles.introLogo} />
            <Text variant="titleLarge" style={styles.introTitle}>
              Benvenuto in TrackIt
            </Text>
            <Text variant="bodyMedium" style={styles.introText}>
              Ti mostro in pochi secondi dove si trova tutto.
            </Text>
            <Button
              mode="contained"
              onPress={() => setIndice(0)}
              style={styles.introButton}
              labelStyle={styles.introButtonLabel}
            >
              Iniziamo
            </Button>
            <Button onPress={() => onFine("saltato")} labelStyle={styles.skipLabel}>
              Salta
            </Button>
          </Animated.View>
        ) : null}
      </View>
    </Portal>
  );
}
