import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { IconButton, Text } from "react-native-paper";
import { useSchermoStretto } from "@/utils/layout";
import { useTranslation } from "react-i18next";
import { ModuloAccesso, ModuloRegistrazione } from "@/components/ModuliAccesso";
import { useStili } from "@/utils/tema";
import { creaStili as creaStiliVelo } from "@/styles/finestra-computer.styles";
import { fontSize, fontWeight, spacing, type Colori } from "@/styles/tokens";

const LOGO = require("../assets/images/logo/trackit-icon-rounded-180.png");

export type ModoAccesso = "accesso" | "registrazione";

type Props = {
  /** null: finestra chiusa */
  modo: ModoAccesso | null;
  onCambia: (modo: ModoAccesso) => void;
  onDismiss: () => void;
};

/**
 * Accesso e registrazione sopra la landing, sul computer e sul telefono: chi
 * legge la pagina non la perde di vista, e passa da un modulo all'altro senza
 * cambiare pagina. /register resta per chi ci arriva da un link; /login rimanda qui (?accedi=1).
 *
 * Esc, un clic fuori e la ✕ chiudono, come nelle altre finestre del computer.
 *
 * Modal di React Native e non il Dialog di Paper: il Dialog si disegna fuori
 * dalla schermata, e il pulsante di Google nel browser ha bisogno della
 * navigazione della pagina in cui si trova (useFocusEffect).
 */
export function FinestraAccesso({ modo, onCambia, onDismiss }: Props) {
  const { t } = useTranslation();
  const styles = useStili(creaStili);
  const velo = useStili(creaStiliVelo);
  //sul telefono i 24px di margine intorno rubano spazio al modulo
  const stretto = useSchermoStretto();
  //l'errore sta sotto il modulo, vicino al pulsante: una Snackbar finirebbe
  //in fondo alla pagina, dietro il velo della finestra
  const [errore, setErrore] = useState("");

  //un errore del modulo di prima non vale per l'altro
  useEffect(() => setErrore(""), [modo]);

  //il Modal resta sopra anche alle pagine aperte da qui (codice di verifica,
  //password dimenticata): si chiude quando la landing perde il focus
  useFocusEffect(useCallback(() => onDismiss, [onDismiss]));

  useEffect(() => {
    if (!modo || Platform.OS !== "web") return;
    function tasto(evento: KeyboardEvent) {
      if (evento.key === "Escape") onDismiss();
    }
    window.addEventListener("keydown", tasto);
    return () => window.removeEventListener("keydown", tasto);
  }, [modo, onDismiss]);

  return (
    <Modal visible={modo !== null} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={[velo.velo, stretto && styles.veloStretto]}>
        <Pressable style={velo.fuori} onPress={onDismiss} accessibilityLabel={t("comune.chiudi")} />
        <View style={[velo.finestra, styles.finestra]} role="dialog" aria-modal>
          <ScrollView contentContainerStyle={[styles.contenuto, stretto && styles.contenutoStretto]} keyboardShouldPersistTaps="handled">
            <View style={styles.marchio}>
              <Image source={LOGO} style={styles.logo} accessibilityIgnoresInvertColors />
              <Text style={styles.nomeApp}>TrackIt</Text>
            </View>
            {/* key: passando all'altro modulo i campi ripartono vuoti */}
            {modo === "registrazione" ? (
              <ModuloRegistrazione key="registrazione" onErrore={setErrore} onCambia={() => onCambia("accesso")} />
            ) : (
              <ModuloAccesso key="accesso" onErrore={setErrore} onCambia={() => onCambia("registrazione")} />
            )}
            {!!errore && (
              <Text style={styles.errore} accessibilityLiveRegion="polite" role="alert">{errore}</Text>
            )}
          </ScrollView>
          <IconButton
            icon="close"
            style={velo.chiudi}
            onPress={onDismiss}
            accessibilityLabel={t("comune.chiudi")}
          />
        </View>
      </View>
    </Modal>
  );
}

const creaStili = (colors: Colori) =>
  StyleSheet.create({
    //i moduli di accesso sono pensati stretti: 440 come le altre finestre con un modulo
    finestra: {
      maxWidth: 440,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    contenuto: {
      padding: spacing.xl,
    },
    veloStretto: {
      padding: spacing.md,
    },
    contenutoStretto: {
      padding: spacing.lg,
      paddingTop: spacing.xl,
    },
    marchio: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    logo: {
      width: 36,
      height: 36,
      borderRadius: 9,
    },
    nomeApp: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    errore: {
      color: colors.dangerDark,
      marginTop: spacing.md,
      textAlign: "center",
    },
  });
