import { View } from "react-native";
import { fromDateString, toDateString } from "@/utils/date";
import { useTema } from "@/utils/tema";
import type { PropsCampoData } from "./CampoData";

//Prima il tocco apriva una finestra "Scegli la data" con dentro il campo del
//browser, e solo cliccando il campo compariva il calendario: due passaggi.
//Ora un campo data invisibile copre la riga e il tocco apre subito il
//calendario del browser (la rotella di Safari su iPhone)
export function CampoData({ value, onChange, onApri, style, accessibilityLabel, children }: PropsCampoData) {
  const { scuro } = useTema();
  return (
    <View style={[style, { position: "relative" }]}>
      {children}
      <input
        type="date"
        value={toDateString(value)}
        aria-label={accessibilityLabel}
        onClick={(evento) => {
          onApri?.();
          //Chrome sul computer apre il calendario solo dall'icona: showPicker
          //lo apre da qualunque punto della riga
          try {
            evento.currentTarget.showPicker();
          } catch {
            //browser senza showPicker: il campo si apre comunque al tocco
          }
        }}
        onChange={(evento) => {
          //scrivendo l'anno a tastiera arrivano valori a meta' ("0002-10-09")
          const anno = Number(evento.target.value.slice(0, 4));
          if (anno >= 1900 && anno <= 2100) onChange(fromDateString(evento.target.value));
        }}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0,
          cursor: "pointer",
          border: 0,
          padding: 0,
          colorScheme: scuro ? "dark" : "light",
        }}
      />
    </View>
  );
}
