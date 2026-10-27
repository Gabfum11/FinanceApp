import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Snackbar, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTema } from "@/utils/tema";
import { fontSize, fontWeight } from "@/styles/tokens";

export type Avviso = {
  /** cambia a ogni messaggio: un messaggio nuovo riparte da capo, con il suo tempo */
  id: number;
  tipo: "fatto" | "errore";
  titolo: string;
  /** cosa e' stato eliminato, o cosa fare dopo un errore */
  dettaglio?: string;
  azione?: { label: string; onPress: () => void };
};

const DURATA = 5000;

// Il messaggio dopo un'eliminazione, uguale in ogni schermata: cerchio verde o
// rosso, cosa e' successo e l'azione (Annulla o Riprova). Gli errori restano
// finche' non si chiudono, i messaggi riusciti spariscono dopo 5 secondi.
export function AvvisoEliminazione({ avviso, onChiudi, wrapperStyle }: {
  avviso: Avviso | null;
  onChiudi: () => void;
  wrapperStyle?: StyleProp<ViewStyle>;
}) {
  const { colors, scuro } = useTema();
  //mentre sfuma in chiusura il testo resta quello di prima, non sparisce di colpo
  const ultimo = useRef(avviso);
  if (avviso) ultimo.current = avviso;
  const mostrato = ultimo.current;
  const errore = mostrato?.tipo === "errore";
  //la barra del tempo rimasto per Annulla
  const tempo = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!avviso || errore || !avviso.azione) return;
    tempo.setValue(1);
    Animated.timing(tempo, { toValue: 0, duration: DURATA, useNativeDriver: false }).start();
  }, [avviso?.id]);

  //colori invertiti rispetto alla pagina, come ogni Snackbar, ma presi dall'app:
  //quelli di Material 3 davano un "Annulla" viola
  const testo = colors.background;
  const azione = scuro ? colors.surfaceDark : colors.primary;

  return (
    <Snackbar
      key={mostrato?.id}
      visible={avviso !== null}
      onDismiss={onChiudi}
      duration={errore ? Number.POSITIVE_INFINITY : DURATA}
      wrapperStyle={wrapperStyle}
      style={{ backgroundColor: colors.text }}
      action={mostrato?.azione && { label: mostrato.azione.label, onPress: mostrato.azione.onPress, textColor: azione }}
      //senza scadenza serve un modo per chiuderlo
      onIconPress={errore ? onChiudi : undefined}
      icon={errore ? () => <MaterialCommunityIcons name="close" size={20} color={testo} /> : undefined}
      accessibilityLiveRegion={errore ? "assertive" : "polite"}
      accessibilityRole={errore ? "alert" : undefined}
    >
      {mostrato && (
        <View style={styles.riga}>
          <View style={[styles.cerchio, { backgroundColor: errore ? colors.danger : colors.primary }]}>
            <MaterialCommunityIcons name={errore ? "exclamation-thick" : "check-bold"} size={16} color={colors.textOnPrimary} />
          </View>
          <View style={styles.testi}>
            <Text style={[styles.titolo, { color: testo }]}>{mostrato.titolo}</Text>
            {mostrato.dettaglio && (
              <Text style={[styles.dettaglio, { color: testo }]} numberOfLines={2}>{mostrato.dettaglio}</Text>
            )}
          </View>
        </View>
      )}
      {mostrato?.azione && !errore && (
        <Animated.View
          style={[styles.barra, { backgroundColor: azione, width: tempo.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]}
        />
      )}
    </Snackbar>
  );
}

const styles = StyleSheet.create({
  riga: { flexDirection: "row", alignItems: "center", gap: 12 },
  cerchio: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  testi: { flex: 1 },
  titolo: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  dettaglio: { fontSize: fontSize.sm, opacity: 0.75, marginTop: 2 },
  barra: { height: 2, borderRadius: 1, marginTop: 10, opacity: 0.8 },
});
