import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { fromDateString, toDateString } from "@/utils/date";
import { scrim, type Colori } from "@/styles/tokens";
import { useStili, useTema } from "@/utils/tema";

//stesse props del DateTimePicker usate nell'app: chi lo usa non cambia nulla.
//Il campo data del browser su iPhone apre la rotella di Safari, sul computer
//un piccolo calendario
type Props = {
  value: Date;
  onValueChange: (event: unknown, date: Date) => void;
  onDismiss: () => void;
  mode?: "date";
  display?: string;
};

export function SelettoreData({ value, onValueChange, onDismiss }: Props) {
  const { t } = useTranslation();
  const [scelta, setScelta] = useState(toDateString(value));
  const styles = useStili(creaStili);
  const { colors, scuro } = useTema();

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss}>
        {/* il tocco sulla card non deve chiudere la finestra */}
        <Pressable style={styles.card} onPress={() => {}}>
          <Text variant="titleMedium">{t("data.scegli")}</Text>
          <input
            type="date"
            value={scelta}
            onChange={(e) => setScelta(e.target.value)}
            style={{ ...campo(colors), colorScheme: scuro ? "dark" : "light" }}
          />
          <View style={styles.actions}>
            <Button onPress={onDismiss}>{t("comune.annulla")}</Button>
            {/* il campo si puo' svuotare: senza data non c'e' niente da confermare */}
            <Button
              mode="contained"
              disabled={!scelta}
              onPress={() => onValueChange({ type: "set" }, fromDateString(scelta))}
            >
              {t("comune.ok")}
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

//stile del tag HTML: non passa da StyleSheet
const campo = (colors: Colori) => ({
  fontSize: 16,
  padding: 12,
  borderRadius: 12,
  border: `1px solid ${colors.border}`,
  fontFamily: "inherit",
  color: colors.text,
  backgroundColor: colors.surface,
});

const creaStili = (colors: Colori) =>
  StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: scrim,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
});
