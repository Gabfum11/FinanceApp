import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { creaStili, coloriSpesa } from "@/styles/add-expense.styles";
import { useStili, useTema } from "@/utils/tema";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "backspace"];

//il tastierino dell'importo, solo sul telefono
export function Tastierino({ onTasto }: { onTasto: (key: string) => void }) {
  const styles = useStili(creaStili);
  const { colors: tokens } = useTema();
  const colors = useMemo(() => coloriSpesa(tokens), [tokens]);

  return (
    <View style={styles.keypad}>
      {KEYS.map((key) => (
        <Pressable
          key={key}
          style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
          onPress={() => onTasto(key)}
        >
          {key === "backspace" ? (
            <MaterialCommunityIcons name="backspace-outline" size={24} color={colors.keypadText} />
          ) : (
            <Text style={styles.keyText}>{key}</Text>
          )}
        </Pressable>
      ))}
    </View>
  );
}
