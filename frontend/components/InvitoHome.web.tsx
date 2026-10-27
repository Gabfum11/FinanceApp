import { useState, useSyncExternalStore } from "react";
import { Image, Text as TestoSemplice, View } from "react-native";
import { Text, Button } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  puoAggiungereAllaHome,
  procedura,
  sottoBarraGalleggiante,
  ascoltaInstallazione,
  installazioneDiretta,
  installa,
} from "@/utils/aggiuntaHome";
import { creaStili } from "@/styles/invito-home.styles";
import { Trans, useTranslation } from "react-i18next";
import { useStili, useTema } from "@/utils/tema";

const CHIAVE = "invito_home_rimandato";
//chiuso, torna dopo una settimana se si apre ancora il sito dal browser
const PAUSA_GIORNI = 7;
const LOGO = require("../assets/images/logo/trackit-icon-rounded-180.png");

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

// Invito ad aggiungere TrackIt alla Home, sui telefoni e appena si apre il link.
// Subito e non dopo la registrazione: l'icona ha dati suoi, separati dal
// browser, e chi si registra prima di aggiungerla dovrebbe poi accedere di nuovo.
//
// Su iPhone con Safari i passi esatti; altrove un messaggio per tutti, che dice
// cosa cercare nel menu invece di dove toccare: i menu cambiano da browser a
// browser e da una versione all'altra.
export function InvitoHome() {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  //il terzo argomento vale durante la build del sito, dove non c'e' un browser
  //da interrogare: li' l'invito non c'e', e compare appena la pagina si apre
  const disponibile = useSyncExternalStore(
    nessunaIscrizione,
    () => puoAggiungereAllaHome() && !rimandato(),
    () => false
  );
  //Chrome su Android puo' installarlo con un tocco: lo dice quando e' pronto
  const diretta = useSyncExternalStore(ascoltaInstallazione, installazioneDiretta, () => false);
  const [chiuso, setChiuso] = useState(false);

  function chiudi() {
    try {
      localStorage.setItem(CHIAVE, String(Date.now()));
    } catch {}
    setChiuso(true);
  }

  async function installaOra() {
    await installa();
    chiudi();
  }

  if (!disponibile || chiuso) return null;

  const passi = procedura();
  //Trans ci mette dentro la parola in grassetto: il Text di Paper vorrebbe gia' un contenuto
  const grassetto = <TestoSemplice style={styles.evidenza} />;
  const numero = (n: number) => <Text style={styles.numero}>{n}</Text>;
  const condividi = (n: number) => (
    <View style={styles.passo}>
      {numero(n)}
      <Text style={styles.testo}>{t("invitoHome.tocca")}</Text>
      <MaterialCommunityIcons name="export-variant" size={18} color={colors.link} />
      <Text style={styles.evidenza}>{t("invitoHome.condividi")}</Text>
    </View>
  );
  const aggiungi = (n: number) => (
    <View style={styles.passo}>
      {numero(n)}
      <Text style={styles.testo}>{t("invitoHome.scegli")}</Text>
      <Text style={styles.evidenza}>{t("invitoHome.voce")}</Text>
    </View>
  );

  return (
    <View
      //la barra di Safari 26 galleggia sopra il fondo della pagina: l'invito le sta sopra
      style={[styles.card, { bottom: insets.bottom + (sottoBarraGalleggiante() ? 88 : 16) }]}
      accessibilityRole="alert"
    >
      <View style={styles.intestazione}>
        <Image source={LOGO} style={styles.logo} accessibilityIgnoresInvertColors />
        <Text style={styles.titolo}>{t("invitoHome.titolo")}</Text>
      </View>

      {passi === "safari26" && (
        <View style={styles.passi}>
          <View style={styles.passo}>
            {numero(1)}
            <Text style={styles.testo}>{t("invitoHome.tocca")}</Text>
            <Text style={styles.evidenza}>{t("invitoHome.puntini")}</Text>
            <Text style={styles.testo}>{t("invitoHome.inBassoADestra")}</Text>
          </View>
          {condividi(2)}
          <View style={styles.passo}>
            {numero(3)}
            <Text style={styles.testo}>{t("invitoHome.tocca")}</Text>
            <Text style={styles.evidenza}>{t("invitoHome.altro")}</Text>
          </View>
          {aggiungi(4)}
        </View>
      )}
      {passi === "safari" && (
        <View style={styles.passi}>
          {condividi(1)}
          {aggiungi(2)}
        </View>
      )}
      {passi === "generica" && (
        <Text style={[styles.testo, styles.istruzioni]}>
          <Trans i18nKey="invitoHome.istruzioni" components={{ b: grassetto }} />
        </Text>
      )}

      <View style={styles.azioni}>
        <Button onPress={chiudi} textColor={colors.primaryDark}>
          {t("invitoHome.nonOra")}
        </Button>
        {diretta ? (
          <Button mode="contained" icon="download" onPress={installaOra}>
            {t("invitoHome.installa")}
          </Button>
        ) : (
          <Button mode="contained" onPress={chiudi}>
            {t("invitoHome.hoCapito")}
          </Button>
        )}
      </View>
    </View>
  );
}
