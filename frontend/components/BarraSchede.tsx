import { useEffect, useState, type ComponentProps } from "react";
import { Keyboard, Pressable, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, type Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { bersaglio } from "@/utils/tour";
import { DISTANZA_DAL_FONDO } from "@/utils/barraSchede";
import { useSchermoStretto } from "@/utils/layout";
import { creaStili } from "@/styles/barra-schede.styles";
import { useStili, useTema } from "@/utils/tema";

// Barra delle schede staccata dai bordi, con gli angoli e l'ombra delle card.
//
// Sostituisce quella di React Navigation: con quella standard non si puo'
// staccare dal fondo, e il "+" in mezzo andava comunque disegnato a parte.
// Ogni scheda si registra per il tour guidato con il proprio nome.

//le proprieta' che Tabs passa alla barra: ricavate da Tabs stesso, senza
//dipendere dal percorso interno di Expo Router in cui sono dichiarate
type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

const ICONE: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  home: "home",
  stats: "chart-donut",
  budget: "autorenew",
  profile: "account",
};

//il nome con cui il tour cerca la scheda: deve restare quello di TourGuidato
const BERSAGLI: Record<string, string | undefined> = {
  stats: "statistiche",
  budget: "abbonamenti",
  profile: "profilo",
};

export function BarraSchede({ state, descriptors, navigation }: BottomTabBarProps) {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  //su uno schermo stretto "Abbonamenti" non ci sta: il nome resta solo sulla
  //scheda attiva, le altre mostrano l'icona (il lettore di schermo legge comunque il nome)
  const stretto = useSchermoStretto();
  //con la tastiera aperta la barra le finirebbe sopra
  const [tastiera, setTastiera] = useState(false);

  useEffect(() => {
    const apri = Keyboard.addListener("keyboardDidShow", () => setTastiera(true));
    const chiudi = Keyboard.addListener("keyboardDidHide", () => setTastiera(false));
    return () => {
      apri.remove();
      chiudi.remove();
    };
  }, []);

  if (tastiera) return null;

  return (
    <View style={[styles.barra, { bottom: insets.bottom + DISTANZA_DAL_FONDO }]} accessibilityRole="tablist">
      {state.routes.map((route, indice) => {
        if (route.name === "add-placeholder") {
          return (
            <View key={route.key} style={styles.postoPiu}>
              <Pressable
                ref={bersaglio("aggiungi")}
                onPress={() => router.push("/add_expense")}
                style={({ pressed }) => [styles.piu, pressed && styles.premuto]}
                accessibilityRole="button"
                accessibilityLabel={t("schede.aggiungi")}
              >
                <MaterialCommunityIcons name="plus" color="black" size={28} />
              </Pressable>
            </View>
          );
        }

        const attiva = state.index === indice;
        const titolo = descriptors[route.key].options.title ?? route.name;
        const bersaglioTour = BERSAGLI[route.name];

        function premi() {
          const evento = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!attiva && !evento.defaultPrevented) navigation.navigate(route.name, route.params);
        }

        return (
          <Pressable
            key={route.key}
            ref={bersaglioTour ? bersaglio(bersaglioTour) : undefined}
            onPress={premi}
            style={styles.scheda}
            accessibilityRole="tab"
            accessibilityState={{ selected: attiva }}
            accessibilityLabel={titolo}
          >
            {/* la pillola verde dice dove sei senza dover leggere */}
            <View style={[styles.pillola, attiva && styles.pillolaAttiva]}>
              <MaterialCommunityIcons
                name={ICONE[route.name] ?? "circle-outline"}
                size={22}
                color={attiva ? colors.primaryDark : colors.textMuted}
              />
            </View>
            {(attiva || !stretto) && (
              <Text style={[styles.nome, attiva && styles.nomeAttivo]} numberOfLines={1}>
                {titolo}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
