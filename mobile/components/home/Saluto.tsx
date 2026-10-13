import { useEffect } from "react";
import { View, Pressable } from "react-native";
import { Text } from "react-native-paper";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  useReducedMotion,
} from "react-native-reanimated";
import { creaStili } from "@/styles/home.styles";
import { useStili } from "@/utils/tema";
import { bersaglio } from "@/utils/tour";
import { useSchermoStretto, SCHERMO_MOLTO_STRETTO } from "@/utils/layout";

//"Ciao, nome" e la pillola dell'assistente con il bot che saluta
export function Saluto({ nickname }: { nickname: string }) {
  const styles = useStili(creaStili);
  const router = useRouter();
  const { t } = useTranslation();
  //la scritta "Assistente" resta quasi sempre: e' la funzione principale dell'app.
  //Se lo spazio manca e' il saluto a rimpicciolirsi; solo sui telefoni molto
  //stretti la pillola passa alla sola icona
  const stretto = useSchermoStretto(SCHERMO_MOLTO_STRETTO);
  const rotazioneBot = useSharedValue(0);
  const riduciMovimento = useReducedMotion();

  useEffect(() => {
    if (riduciMovimento) return;
    //un saluto breve ogni 4s, poi si ferma: invita a chiedere senza disturbare
    rotazioneBot.value = withRepeat(
      withDelay(4000, withSequence(
        withTiming(-12, { duration: 120 }),
        withTiming(12, { duration: 160 }),
        withTiming(-8, { duration: 140 }),
        withTiming(0, { duration: 120 }),
      )),
      3,
    );
  }, [riduciMovimento]);

  const salutoStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotazioneBot.value}deg` }],
  }));

  return (
    <View style={styles.titleRow}>
      {/* una riga sola: con un nome lungo il testo si rimpicciolisce invece di
          andare a capo o finire sotto la pillola */}
      <Text variant="headlineMedium" style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {t("home.ciao", { nome: nickname })}
      </Text>
      <Pressable
        ref={bersaglio("assistente")}
        onPress={() => router.push("/assistant")}
        accessibilityRole="button"
        accessibilityLabel={t("home.apriAssistente")}
        accessibilityHint={t("home.suggerimentoAssistente")}
        hitSlop={8}
        style={({ pressed }) => [
          styles.assistantButton,
          pressed && styles.assistantButtonPressed,
        ]}
      >
        <Animated.Image
          source={require("../../assets/images/logo/trackit-bot-1024.png")}
          style={[styles.assistantIcon, salutoStyle]}
        />
        {!stretto && <Text style={styles.assistantButtonLabel}>{t("home.assistente")}</Text>}
      </Pressable>
    </View>
  );
}
