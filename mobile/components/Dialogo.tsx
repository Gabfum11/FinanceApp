import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { Button } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { radius, spacing, type Colori, fontSize, fontWeight } from "@/styles/tokens";
import { useStili, useTema } from "@/utils/tema";
import { useSchermoLargo } from "@/utils/layout";

// Pezzi comuni a tutte le finestre di dialogo dell'app.
//
// Prima ogni finestra metteva due pulsanti di solo testo, colorati a caso:
// "Salva" verde chiaro su bianco (contrasto 2:1, sotto il minimo), "Elimina"
// rosso, "Annulla" a volte grigio e a volte verde. Il pulsante che conferma
// non si distingueva da quello che annulla, e i bersagli erano bassi 40px.

/** Altezza minima dei pulsanti nelle finestre: 44px, il minimo per il dito. */
const ALTEZZA_PULSANTE = 44;

// Sul verde pieno il testo e' verde scuro e non bianco: il bianco sul verde
// del marchio arriva a 2,2:1, il verde scuro supera 5:1 (come nella landing).

/** Testo sopra il rosso pieno: bianco sul rosso scuro del tema chiaro,
 *  quasi nero sul rosso chiaro del tema scuro, dove il bianco non si legge. */
const TESTO_SU_ROSSO = { chiaro: "#FFFFFF", scuro: "#2A0E0B" };

/** Rosso del cerchio uguale nei due temi: il rosso chiaro del tema scuro,
 *  sotto un'icona bianca, scendeva a 2,2:1. */
const ROSSO_ICONA = "#C0392B";

type PropsPulsanti = {
  conferma: string;
  onConferma: () => void;
  /** se manca, il pulsante Annulla non c'e' (finestre solo informative) */
  onAnnulla?: () => void;
  annulla?: string;
  /** conferma in rosso pieno: per cancellazioni e uscite */
  distruttivo?: boolean;
  loading?: boolean;
  /** disattiva solo la conferma (es. password ancora vuota) */
  confermaDisattivata?: boolean;
};

/**
 * Coppia Annulla / Conferma. Sul telefono uno sopra l'altro, a tutta
 * larghezza: bersagli grandi e etichette lunghe ("Continua a modificare")
 * senza tagli. Sul computer affiancati a destra, come ci si aspetta li'.
 */
export function PulsantiDialogo({
  conferma,
  onConferma,
  onAnnulla,
  annulla,
  distruttivo = false,
  loading = false,
  confermaDisattivata = false,
}: PropsPulsanti) {
  const { t } = useTranslation();
  const { colors, scuro } = useTema();
  const styles = useStili(creaStili);
  const largo = useSchermoLargo();

  return (
    <View style={[styles.azioni, largo && styles.azioniLarghe]}>
      <Button
        mode="contained"
        onPress={onConferma}
        loading={loading}
        disabled={loading || confermaDisattivata}
        buttonColor={distruttivo ? colors.dangerDark : undefined}
        textColor={distruttivo ? (scuro ? TESTO_SU_ROSSO.scuro : TESTO_SU_ROSSO.chiaro) : colors.surfaceDark}
        style={[styles.pulsante, largo && styles.pulsanteLargo]}
        contentStyle={styles.contenuto}
        labelStyle={styles.etichetta}
      >
        {conferma}
      </Button>
      {onAnnulla && (
        <Button
          mode="outlined"
          onPress={onAnnulla}
          disabled={loading}
          textColor={colors.text}
          style={[styles.pulsante, styles.annulla, largo && styles.pulsanteLargo]}
          contentStyle={styles.contenuto}
          labelStyle={styles.etichetta}
        >
          {annulla ?? t("comune.annulla")}
        </Button>
      )}
    </View>
  );
}

/**
 * Cerchio pieno con l'icona bianca in cima alla finestra: dice a colpo
 * d'occhio di che si tratta (rosso = qualcosa si perde). Stesso stile delle
 * icone delle categorie.
 */
export function IconaDialogo({ nome, distruttivo = false }: { nome: string; distruttivo?: boolean }) {
  const { colors } = useTema();
  const styles = useStili(creaStili);
  return (
    <View
      style={[styles.icona, { backgroundColor: distruttivo ? ROSSO_ICONA : colors.primary }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <MaterialCommunityIcons name={nome as any} size={26} color="#FFFFFF" />
    </View>
  );
}

const creaStili = (colors: Colori) =>
  StyleSheet.create({
    //Dialog.Actions di Paper allinea a destra e stringe: qui serve una colonna
    azioni: {
      flexDirection: "column",
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xl,
      paddingTop: spacing.sm,
    },
    //sul computer: Annulla a sinistra, Conferma a destra
    azioniLarghe: {
      flexDirection: "row-reverse",
      justifyContent: "flex-start",
    },
    pulsante: {
      borderRadius: radius.pill,
    },
    pulsanteLargo: {
      minWidth: 120,
    },
    //il grigio dei separatori qui spariva (1,3:1 sullo sfondo): serve un
    //contorno che si veda, senza competere con la conferma
    annulla: {
      borderColor: colors.chevron,
    },
    contenuto: {
      minHeight: ALTEZZA_PULSANTE,
      paddingHorizontal: spacing.sm,
    },
    etichetta: {
      fontSize: fontSize.md,
      fontWeight: fontWeight.semibold,
      letterSpacing: 0.1,
    },
    icona: {
      width: 52,
      height: 52,
      borderRadius: radius.pill,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
      marginTop: spacing.xl,
      marginBottom: -spacing.sm,
    },
  });

/** Stile comune della finestra: angoli e sfondo come le card dell'app. */
export const creaStiliFinestra = (colors: Colori) =>
  StyleSheet.create({
    //il bordo serve nel tema scuro: li' l'ombra non si vede e la finestra
    //si confondeva con la pagina scurita dietro (1,2:1)
    finestra: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    titolo: {
      fontSize: fontSize.xl,
      lineHeight: 26,
      fontWeight: fontWeight.bold,
      color: colors.text,
    },
    titoloCentrato: {
      textAlign: "center",
    },
    testo: {
      fontSize: fontSize.md,
      lineHeight: 22,
      color: colors.textSecondary,
    },
    testoCentrato: {
      textAlign: "center",
    },
  });
