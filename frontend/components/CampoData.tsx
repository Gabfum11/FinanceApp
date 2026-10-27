import { useState, type ReactNode } from "react";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

//la riga che mostra la data e' anche quella che la cambia: chi la usa passa
//l'aspetto (children) e riceve la data scelta. Sul telefono il calendario
//nativo; CampoData.web.tsx apre quello del browser con lo stesso tocco
export type PropsCampoData = {
  value: Date;
  onChange: (date: Date) => void;
  /** al tocco, prima che si apra il calendario (es. chiudere il tastierino) */
  onApri?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  children: ReactNode;
};

export function CampoData({ value, onChange, onApri, style, accessibilityLabel, children }: PropsCampoData) {
  const [aperto, setAperto] = useState(false);
  return (
    <>
      <Pressable
        style={style}
        onPress={() => {
          onApri?.();
          setAperto(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </Pressable>
      {aperto && (
        <DateTimePicker
          value={value}
          mode="date"
          display="default"
          onValueChange={(_, data) => {
            setAperto(false);
            onChange(data);
          }}
          onDismiss={() => setAperto(false)}
        />
      )}
    </>
  );
}
