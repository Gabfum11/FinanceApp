import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { caricaGoogle } from "@/utils/useGoogleLogin.web";

// Nel browser il pulsante lo disegna Google, dentro un iframe: e' l'unico modo
// di ottenere l'id_token senza un flusso OAuth da gestire sul server. Aspetto
// e testo li decide Google (tradotti con locale), quindi label e onPress
// dell'app qui non servono: l'accesso arriva a useGoogleLogin.web.ts.
type Props = {
  onPress?: () => void;
  disabled?: boolean;
  label?: string;
};

//limiti di larghezza accettati da renderButton
const MIN = 200;
const MAX = 400;

export function GoogleButton({ disabled = false }: Props) {
  const { i18n } = useTranslation();
  const contenitore = useRef<View>(null);
  const [larghezza, setLarghezza] = useState(0);

  useEffect(() => {
    if (!larghezza) return;
    let montato = true;
    caricaGoogle()
      .then((gis) => {
        //su react-native-web il ref di una View e' l'elemento del DOM
        const nodo = contenitore.current as unknown as HTMLElement | null;
        if (!montato || !nodo) return;
        nodo.innerHTML = "";
        gis.renderButton(nodo, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          logo_alignment: "left",
          width: Math.max(MIN, Math.min(MAX, Math.round(larghezza))),
          locale: i18n.language,
        });
      })
      .catch(() => {
        //lo segnala gia' useGoogleLogin, che in quel caso nasconde il pulsante
      });
    return () => {
      montato = false;
    };
  }, [larghezza, i18n.language]);

  return (
    <View
      onLayout={(e) => setLarghezza(e.nativeEvent.layout.width)}
      style={[styles.riga, disabled && styles.disabilitato]}
    >
      <View ref={contenitore} />
    </View>
  );
}

const styles = StyleSheet.create({
  riga: {
    alignItems: "center",
    minHeight: 44, //il pulsante arriva dopo il caricamento: niente salto della pagina
    justifyContent: "center",
  },
  disabilitato: {
    opacity: 0.5,
    pointerEvents: "none",
  },
});
