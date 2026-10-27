import { View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTema } from "@/utils/tema";
import { fontWeight } from "@/styles/tokens";

// Iniziali del nome in un cerchio verde pieno: nel profilo e nella modifica
// del profilo, dove cambiano mentre si scrive il nome.
//
// Prima erano verdi su verde tenue (1,9:1, si leggevano a fatica): ora il
// testo e' verde scuro sul verde del marchio, come i pulsanti di conferma.

export function iniziali(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((parola) => parola[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({ nome, dimensione = 56 }: { nome: string; dimensione?: number }) {
  const { colors } = useTema();
  const testo = iniziali(nome);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: dimensione,
        height: dimensione,
        borderRadius: dimensione / 2,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* nome ancora vuoto (caricamento, campo cancellato): la sagoma, non un cerchio vuoto */}
      {testo === "" ? (
        <MaterialCommunityIcons name="account" size={Math.round(dimensione * 0.55)} color={colors.surfaceDark} />
      ) : (
      <Text
        style={{
          color: colors.surfaceDark,
          fontWeight: fontWeight.bold,
          fontSize: Math.round(dimensione * 0.36),
          lineHeight: Math.round(dimensione * 0.44),
        }}
      >
        {testo}
      </Text>
      )}
    </View>
  );
}
