import { Pressable, View } from "react-native";
import { Text, Switch } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { creaStili } from "@/styles/add-expense.styles";
import { useStili } from "@/utils/tema";

export type Frequency = "monthly" | "weekly" | "yearly";

export const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "monthly", label: "frequenze.monthly" },
  { value: "weekly", label: "frequenze.weekly" },
  { value: "yearly", label: "frequenze.yearly" },
];

//i due campi che ha solo un abbonamento: ogni quanto si rinnova e se da solo
export function CampiAbbonamento({ frequency, onFrequency, autoRenew, onAutoRenew }: {
  frequency: Frequency;
  onFrequency: (valore: Frequency) => void;
  autoRenew: boolean;
  onAutoRenew: (valore: boolean) => void;
}) {
  const styles = useStili(creaStili);
  const { t } = useTranslation();

  return (
    <>
      <View>
        <Text variant="bodySmall" style={styles.fieldLabel}>
          {t("spesa.frequenza")}
        </Text>
        <View style={styles.frequencyRow}>
          {FREQUENCIES.map((option) => {
            const selected = frequency === option.value;
            return (
              <Pressable
                key={option.value}
                style={[styles.frequencyChip, selected && styles.frequencyChipSelected]}
                onPress={() => onFrequency(option.value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text
                  style={[
                    styles.frequencyLabel,
                    selected && styles.frequencyLabelSelected,
                  ]}
                >
                  {t(option.label)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.autoRenewRow}>
        <View style={styles.autoRenewText}>
          <Text style={styles.autoRenewLabel}>{t("spesa.rinnovoAutomatico")}</Text>
          <Text style={styles.autoRenewHint}>
            {autoRenew
              ? t("spesa.rinnovoAutomaticoSi")
              : t("spesa.rinnovoAutomaticoNo")}
          </Text>
        </View>
        <Switch value={autoRenew} onValueChange={onAutoRenew} />
      </View>
    </>
  );
}
