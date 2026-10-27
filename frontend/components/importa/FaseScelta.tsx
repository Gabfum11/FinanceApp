import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useStili, useTema } from "@/utils/tema";
import { creaStili } from "@/styles/import-estratto.styles";
import { useSchermoLargo } from "@/utils/layout";
import { router } from "expo-router";

//il riquadro per scegliere il file; sul computer lo si puo' anche trascinare dentro
export function FaseScelta({ onScegli, onFile }: { onScegli: () => void; onFile: (file: File) => void }) {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const { t } = useTranslation();
  const largo = useSchermoLargo();
  const riquadro = useRef<View>(null);
  const [sopraRiquadro, setSopraRiquadro] = useState(false);

  useEffect(() => {
    if (!largo || Platform.OS !== "web") return;
    //su react-native-web il ref di una View e' il div della pagina
    const nodo = riquadro.current as unknown as HTMLElement | null;
    if (!nodo) return;
    //dragenter/dragleave scattano anche entrando nei figli: si contano
    let dentro = 0;
    const entra = (e: DragEvent) => { e.preventDefault(); dentro++; setSopraRiquadro(true); };
    const sopra = (e: DragEvent) => e.preventDefault();
    const esce = () => { dentro = Math.max(0, dentro - 1); if (dentro === 0) setSopraRiquadro(false); };
    const lascia = (e: DragEvent) => {
      e.preventDefault();
      dentro = 0;
      setSopraRiquadro(false);
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      onFile(file);
    };
    nodo.addEventListener("dragenter", entra);
    nodo.addEventListener("dragover", sopra);
    nodo.addEventListener("dragleave", esce);
    nodo.addEventListener("drop", lascia);
    return () => {
      nodo.removeEventListener("dragenter", entra);
      nodo.removeEventListener("dragover", sopra);
      nodo.removeEventListener("dragleave", esce);
      nodo.removeEventListener("drop", lascia);
    };
  }, [largo, onFile]);

  return (
    <View style={styles.scelta}>
      <View
        ref={riquadro}
        style={[styles.riquadroFile, largo && styles.riquadroFileComputer, sopraRiquadro && styles.riquadroFileSopra]}
      >
        <View style={styles.iconaFile}>
          <MaterialCommunityIcons
            name={sopraRiquadro ? "tray-arrow-down" : "file-excel"}
            size={30}
            color={colors.primaryDark}
          />
        </View>
        <Text style={styles.sceltaTitolo}>
          {sopraRiquadro
            ? t("importa.sceltaRilascia")
            : largo ? t("importa.sceltaTitoloComputer") : t("importa.sceltaTitolo")}
        </Text>
        <Text style={styles.nota}>{t("importa.sceltaTesto")}</Text>
        {largo && <Text style={styles.oppure}>{t("importa.sceltaOppure")}</Text>}
        <Pressable
          style={({ pressed }) => [styles.pulsante, pressed && styles.premuto]}
          onPress={onScegli}
          accessibilityRole="button"
        >
          <Text style={styles.pulsanteTesto}>{t("importa.sceltaPulsante")}</Text>
        </Pressable>
      </View>
      {/* chi ricarica un estratto spesso vuole prima togliere quello sbagliato */}
      <Pressable onPress={() => router.replace("/estratti_conto")} accessibilityRole="link" style={styles.linkEstratti}>
        <Text style={styles.linkEstrattiTesto}>{t("estratti.titolo")}</Text>
      </Pressable>
    </View>
  );
}
