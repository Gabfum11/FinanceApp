import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { fromDateString, toDateString } from "@/utils/date";
import { radius, scrim, spacing, type Colori, fontSize, fontWeb } from "@/styles/tokens";
import { useStili, useTema } from "@/utils/tema";
import { PulsantiDialogo, creaStiliFinestra } from "@/components/Dialogo";

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
  const finestra = useStili(creaStiliFinestra);
  const { colors, scuro } = useTema();

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss}>
        {/* il tocco sulla card non deve chiudere la finestra */}
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={finestra.titolo}>{t("data.scegli")}</Text>
          <input
            type="date"
            value={scelta}
            onChange={(e) => setScelta(e.target.value)}
            style={{ ...campo(colors), colorScheme: scuro ? "dark" : "light" }}
          />
          {/* il campo si puo' svuotare: senza data non c'e' niente da confermare */}
          <View style={styles.actions}>
            <PulsantiDialogo
              conferma={t("comune.ok")}
              onConferma={() => onValueChange({ type: "set" }, fromDateString(scelta))}
              onAnnulla={onDismiss}
              confermaDisattivata={!scelta}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

//stile del tag HTML: non passa da StyleSheet
const campo = (colors: Colori) => ({
  fontSize: fontSize.base,
  minHeight: 48,
  padding: 12,
  borderRadius: radius.md,
  border: `1.5px solid ${colors.border}`,
  fontFamily: fontWeb,
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
    borderRadius: 24,
    padding: spacing.xl,
    paddingBottom: 0,
    gap: spacing.lg,
  },
  //PulsantiDialogo ha gia' i margini di una finestra di Paper: qui il bordo
  //della card c'e' gia', si annullano quelli laterali
  actions: {
    marginHorizontal: -spacing.xl,
  },
});
