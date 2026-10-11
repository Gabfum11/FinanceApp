import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { apertaDallaHome } from "@/utils/avvio";
import { useStili, useTema } from "@/utils/tema";
import { fontSize, fontWeight, spacing, type Colori } from "@/styles/tokens";

/**
 * «← Indietro» sopra il modulo di accesso e registrazione: porta alla landing.
 *
 * Il pulsante indietro del browser non basta: chi arriva su /login dopo un
 * logout o da un link non ha una pagina a cui tornare.
 */
export function TornaAllaLanding() {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTema();
  const styles = useStili(creaStili);
  // La landing c'e' solo nel browser (app/index.tsx): nell'app aperta dall'icona
  // sulla Home "/" rimanda al login, e la freccia girerebbe in tondo.
  // Si decide dopo il primo disegno: la pagina statica e' generata senza
  // browser, e un valore diverso al primo disegno non combacerebbe con lei
  const [disponibile, setDisponibile] = useState(false);
  useEffect(() => {
    setDisponibile(Platform.OS === "web" && !apertaDallaHome());
  }, []);

  if (!disponibile) return null;

  return (
    <Pressable
      //navigate e non push: se la landing e' gia' dietro si torna a quella,
      //senza accumulare pagine nella cronologia
      onPress={() => router.navigate("/")}
      style={({ hovered }: { hovered?: boolean }) => [styles.freccia, hovered && styles.sopra]}
      accessibilityRole="link"
      hitSlop={4}
    >
      <MaterialCommunityIcons name="arrow-left" size={20} color={colors.text} />
      <Text style={styles.testo}>{t("comune.indietro")}</Text>
    </Pressable>
  );
}

const creaStili = (colors: Colori) =>
  StyleSheet.create({
    //44px di altezza: il minimo per il dito
    freccia: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: spacing.xs,
      minHeight: 44,
      paddingLeft: spacing.xs,
      paddingRight: spacing.md,
      borderRadius: 999,
    },
    sopra: {
      backgroundColor: colors.surfaceAlt,
    },
    testo: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
      color: colors.text,
    },
  });
