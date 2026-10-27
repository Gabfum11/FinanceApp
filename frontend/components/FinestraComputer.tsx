import { useEffect, type ReactNode } from "react";
import { Platform, Pressable, View } from "react-native";
import { IconButton } from "react-native-paper";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSchermoLargo } from "@/utils/layout";
import { creaStili } from "@/styles/finestra-computer.styles";
import { useStili } from "@/utils/tema";

type Props = {
  children: ReactNode;
  /** Invio: di solito il salvataggio del modulo */
  onInvio?: () => void;
  /** la ✕ in alto a destra; da togliere se il modulo ha gia' il suo "Annulla" */
  conChiudi?: boolean;
};

// I moduli brevi (budget, profilo, password) sul computer: una card sopra la
// pagina da cui si e' partiti, che resta visibile dietro, scurita e sfocata.
// Sul telefono il modulo resta una schermata intera e questo componente non
// aggiunge niente.
//
// Esc e un clic fuori dalla card chiudono, come la ✕; Invio salva.
export function FinestraComputer({ children, onInvio, conChiudi = true }: Props) {
  const styles = useStili(creaStili);
  const largo = useSchermoLargo();
  const router = useRouter();
  const { t } = useTranslation();

  //senza elenco di dipendenze: a ogni disegno si riprende l'onInvio attuale,
  //che legge i valori appena scritti nel modulo
  useEffect(() => {
    if (!largo || Platform.OS !== "web") return;
    function tasto(evento: KeyboardEvent) {
      if (evento.key === "Escape") router.back();
      //in un campo su piu' righe Invio va a capo, non salva
      else if (evento.key === "Enter" && (evento.target as HTMLElement | null)?.tagName !== "TEXTAREA") onInvio?.();
    }
    window.addEventListener("keydown", tasto);
    return () => window.removeEventListener("keydown", tasto);
  });

  if (!largo) return <>{children}</>;

  return (
    <View style={styles.velo}>
      <Pressable style={styles.fuori} onPress={() => router.back()} accessibilityLabel={t("comune.chiudi")} />
      <View style={styles.finestra}>
        {children}
        {conChiudi && (
          <IconButton
            icon="close"
            style={styles.chiudi}
            onPress={() => router.back()}
            accessibilityLabel={t("comune.chiudi")}
          />
        )}
      </View>
    </View>
  );
}

/** Da aggiungere allo stile della View principale del modulo: sul computer non
 *  deve riempire lo schermo, ma prendere l'altezza del suo contenuto. */
export const contenutoInFinestra = {
  //non "flex: 0": sul web vuol dire base zero, e il modulo sparirebbe
  flexGrow: 0,
  flexShrink: 1,
  flexBasis: "auto",
} as const;
