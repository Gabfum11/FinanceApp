import { useState, useSyncExternalStore } from "react";
import { View } from "react-native";
import { Text, Button } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { puoAggiungereAllaHome } from "@/utils/aggiuntaHome";
import { colors } from "@/styles/tokens";
import { styles } from "@/styles/invito-home.styles";
import { useTranslation } from "react-i18next";

const CHIAVE = "invito_home_rimandato";
const PAUSA_GIORNI = 14;

//niente da ascoltare: si legge una volta, il dispositivo non cambia mentre si usa
const nessunaIscrizione = () => () => {};

function rimandato(): boolean {
  try {
    const quando = Number(localStorage.getItem(CHIAVE));
    return quando > 0 && Date.now() - quando < PAUSA_GIORNI * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

// Invito ad aggiungere TrackIt alla Home, solo su iPhone e appena si apre il link.
// Subito e non dopo la registrazione: l'icona ha dati suoi, separati da Safari,
// e chi si registra prima di aggiungerla dovrebbe poi accedere di nuovo.
export function InvitoHome() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  //il terzo argomento vale durante la build del sito, dove non c'e' un browser
  //da interrogare: li' l'invito non c'e', e compare appena la pagina si apre
  const disponibile = useSyncExternalStore(
    nessunaIscrizione,
    () => puoAggiungereAllaHome() && !rimandato(),
    () => false
  );
  const [chiuso, setChiuso] = useState(false);

  function chiudi() {
    try {
      localStorage.setItem(CHIAVE, String(Date.now()));
    } catch {}
    setChiuso(true);
  }

  if (!disponibile || chiuso) return null;

  return (
    <View style={[styles.card, { bottom: insets.bottom + 16 }]} accessibilityRole="alert">
      <Text style={styles.titolo}>{t("invitoHome.titolo")}</Text>
      <Text style={styles.testo}>{t("invitoHome.testo")}</Text>

      <View style={styles.passi}>
        <View style={styles.passo}>
          <Text style={styles.numero}>1</Text>
          <Text style={styles.testo}>{t("invitoHome.tocca")}</Text>
          <MaterialCommunityIcons name="export-variant" size={20} color={colors.link} />
          <Text style={styles.testo}>{t("invitoHome.condividi")}</Text>
        </View>
        <View style={styles.passo}>
          <Text style={styles.numero}>2</Text>
          <Text style={styles.testo}>{t("invitoHome.scegli")}</Text>
          <Text style={styles.evidenza}>{t("invitoHome.voce")}</Text>
        </View>
      </View>

      <View style={styles.azioni}>
        <Button onPress={chiudi}>{t("invitoHome.nonOra")}</Button>
        <Button mode="contained" onPress={chiudi}>
          {t("invitoHome.hoCapito")}
        </Button>
      </View>
      {/* la punta indica il pulsante Condividi, al centro della barra di Safari */}
      <View style={styles.punta} />
    </View>
  );
}
