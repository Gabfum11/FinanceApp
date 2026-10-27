import type { ComponentProps } from "react";
import { Image, Pressable, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, type Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { bersaglio } from "@/utils/tour";
import { creaStili } from "@/styles/barra-laterale.styles";
import { useStili, useTema } from "@/utils/tema";

// Barra delle schede per il computer: sta a sinistra, sempre aperta.
//
// Le stesse schede della barra in basso, con il "+" diventato "Nuova spesa":
// sullo schermo largo c'e' posto per scriverlo. Le schede si registrano per il
// tour con gli stessi nomi, cosi' il tour funziona anche qui.

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

const LOGO = require("../assets/images/logo/trackit-icon-rounded-180.png");

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

export function BarraLaterale({ state, descriptors, navigation }: BottomTabBarProps) {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <View style={styles.barra} accessibilityRole="tablist">
      <View style={styles.marchio}>
        <Image source={LOGO} style={styles.logo} accessibilityIgnoresInvertColors />
        <Text style={styles.nomeApp}>TrackIt</Text>
      </View>

      <Pressable
        ref={bersaglio("aggiungi")}
        onPress={() => router.push("/add_expense")}
        style={({ pressed }) => [styles.nuova, pressed && styles.premuto]}
        accessibilityRole="button"
      >
        <MaterialCommunityIcons name="plus" color="black" size={22} />
        <Text style={styles.nuovaTesto}>{t("schede.nuovaSpesa")}</Text>
      </Pressable>

      {state.routes.map((route, indice) => {
        if (route.name === "add-placeholder") return null;
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
            style={({ hovered }: { hovered?: boolean }) => [
              styles.scheda,
              hovered && !attiva && styles.schedaSopra,
              attiva && styles.schedaAttiva,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: attiva }}
          >
            <MaterialCommunityIcons
              name={ICONE[route.name] ?? "circle-outline"}
              size={22}
              color={attiva ? colors.primaryDark : colors.textMuted}
            />
            <Text style={[styles.nome, attiva && styles.nomeAttivo]}>{titolo}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
