import { useCallback, useEffect, useState, type ReactNode } from "react";
import { View, Image, ScrollView } from "react-native";
import { Button, Text } from "react-native-paper";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useTranslation } from "react-i18next";
import { PRIVACY_URL } from "@/config";
import { SelettoreLingua } from "@/components/SelettoreLingua";
import { FinestraContatto } from "@/components/FinestraContatto";
import { FinestraAccesso, type ModoAccesso } from "@/components/FinestraAccesso";
import { creaStili } from "@/styles/presentazione.styles";
import { useStili } from "@/utils/tema";
import { LARGHEZZA_CONTENUTO } from "@/utils/layout";
import {
  IllustrazioneSpese,
  IllustrazioneBudget,
  IllustrazioneAbbonamenti,
  IllustrazioneImport,
  IllustrazioneStatistiche,
  IllustrazioneAssistente,
} from "@/components/landing/Illustrazioni";

// La pagina che vede nel browser chi non ha fatto l'accesso: cosa fa TrackIt
// e il pulsante per registrarsi. Le illustrazioni stanno in
// components/landing/Illustrazioni.tsx, condivise con la presentazione sul telefono.
//
// La pagina viene generata gia' durante la build, perche' Google legga i testi
// senza eseguire l'app: per questo niente qui dentro dipende dalla larghezza
// della finestra, che durante la build non esiste. Righe e riquadri vanno a
// capo da soli quando lo spazio finisce.

export const LOGO = require("../assets/images/logo/trackit-icon-rounded-180.png");

// In alto la domanda e il pulsante per registrarsi, con accanto la chat
// dell'assistente; sotto le cose che fa TrackIt, una per riga con
// l'illustrazione alternata a sinistra e a destra; poi di nuovo l'invito a
// registrarsi e in fondo i collegamenti.
// Accesso e registrazione si aprono in una finestra sopra la landing
// (FinestraAccesso), sul computer e sul telefono
export function Landing() {
  const styles = useStili(creaStili);
  const { t } = useTranslation();
  const [contatto, setContatto] = useState(false);
  const [accesso, setAccesso] = useState<ModoAccesso | null>(null);

  //?accedi=1: chi arriva da una sessione scaduta, dal reset password o dal vecchio /login.
  //Dopo il primo disegno: la pagina statica e' generata senza indirizzo
  const { accedi } = useLocalSearchParams<{ accedi?: string }>();
  useEffect(() => {
    if (accedi) setAccesso("accesso");
  }, [accedi]);

  //stabile: la finestra la usa per ascoltare Esc solo mentre e' aperta
  const chiudiAccesso = useCallback(() => setAccesso(null), []);

  //una riga per ogni cosa che fa TrackIt: illustrazione e testo affiancati,
  //con l'illustrazione una volta a sinistra e una a destra. "row-reverse" e non
  //l'ordine dei figli invertito: quando va a capo l'illustrazione resta sopra.
  //L'illustrazione e' un'immagine con una descrizione: i suoi testi sono
  //importi di esempio, che letti uno per uno da un lettore di schermo non dicono nulla
  function riga(indice: number, titolo: string, testo: string, descrizione: string, illustrazione: ReactNode) {
    return (
      <View style={[styles.pcRiga, indice % 2 === 1 && styles.pcRigaInvertita]}>
        <View style={styles.pcIllustrazione} role="img" aria-label={descrizione}>{illustrazione}</View>
        <View style={styles.pcRigaTesti}>
          <Text role="heading" aria-level={3} style={styles.pcRiquadroTitolo}>{titolo}</Text>
          <Text style={styles.pcRiquadroTesto}>{testo}</Text>        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.pcPagina}>
      <StatusBar style="light" />
      <View style={styles.pcTesta}>
        <View style={[styles.pcColonna, { maxWidth: LARGHEZZA_CONTENUTO + 80 }]}>
          <View style={styles.pcNavigazione}>
            <View style={styles.pcMarchio}>
              <Image source={LOGO} style={styles.pcLogo} accessibilityIgnoresInvertColors />
              <Text style={styles.pcNomeApp}>TrackIt</Text>
            </View>
            <View style={styles.pcAzioni}>
              <SelettoreLingua scuro />
              <Button mode="outlined" textColor={styles.pcNomeApp.color} style={styles.pcAccedi} onPress={() => setAccesso("accesso")}>
                {t("presentazione.p1.hoAccount")}
              </Button>
            </View>
          </View>
          <View style={styles.pcEroe}>
            <View style={styles.pcEroeTesti}>
              <Text role="heading" aria-level={1} style={styles.pcTitolo}>{t("presentazione.p1.titolo")}</Text>
              <Text style={styles.pcSottotitolo}>{t("presentazione.p1.testo")}</Text>
              <Button
                mode="contained"
                onPress={() => setAccesso("registrazione")}
                style={styles.pcCrea}
                labelStyle={[styles.buttonLabel, styles.pcCreaTesto]}
              >
                {t("presentazione.p5.crea")}
              </Button>
            </View>
            <IllustrazioneAssistente />
          </View>
        </View>
      </View>

      <View style={[styles.pcColonna, styles.pcCorpo, { maxWidth: LARGHEZZA_CONTENUTO + 80 }]}>
        <Text role="heading" aria-level={2} style={styles.pcSezione}>{t("presentazione.cosaFa")}</Text>
        <View>
          {/* una frase sola per riga: dei tre punti dell'import restano il controllo e i formati */}
          {riga(
            0,
            t("presentazione.importa.titolo"),
            `${t("presentazione.importa.testo")} ${t("presentazione.importa.punto2")}`,
            t("presentazione.descrizioni.importa"),
            <IllustrazioneImport />
          )}
          {riga(
            1,
            t("presentazione.p2.titolo"),
            t("presentazione.p2.testo"),
            t("presentazione.descrizioni.spese"),
            <IllustrazioneSpese />
          )}
          {riga(
            2,
            t("presentazione.p3.titolo"),
            t("presentazione.p3.testo"),
            t("presentazione.descrizioni.budget"),
            <IllustrazioneBudget />
          )}
          {riga(
            3,
            t("presentazione.statistiche.titolo"),
            t("presentazione.statistiche.testo"),
            t("presentazione.descrizioni.statistiche"),
            <IllustrazioneStatistiche />
          )}
          {/* nel browser niente notifiche: vale il testo che non le promette */}
          {riga(
            4,
            t("presentazione.p4.titolo"),
            t("presentazione.p4.testoWeb"),
            t("presentazione.descrizioni.abbonamenti"),
            <IllustrazioneAbbonamenti />
          )}
        </View>

        {/* l'invito ripetuto in fondo: chi ha letto fino a qui non deve risalire */}
        <View style={styles.pcInvito}>
          <View style={styles.pcInvitoTesti}>
            <Text role="heading" aria-level={2} style={styles.pcInvitoTitolo}>{t("presentazione.p5.titolo")}</Text>
            <Text style={styles.pcInvitoTesto}>{t("presentazione.p5.testo")}</Text>
          </View>
          <Button
            mode="contained"
            onPress={() => setAccesso("registrazione")}
            style={styles.pcCrea}
            labelStyle={[styles.buttonLabel, styles.pcCreaTesto]}
          >
            {t("presentazione.p5.crea")}
          </Button>
        </View>
      </View>

      <View style={styles.piede}>
        <View style={[styles.pcColonna, styles.piedeRiga, { maxWidth: LARGHEZZA_CONTENUTO + 80 }]}>
          <View style={styles.piedeLink}>
            <Text style={styles.piedeVoce} role="link" onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}>
              {t("presentazione.piede.privacy")}
            </Text>
            <Text style={styles.piedeVoce} role="link" onPress={() => setContatto(true)}>
              {t("profilo.contattaci")}
            </Text>
            <Text style={styles.piedeVoce} role="link" onPress={() => setAccesso("accesso")}>
              {t("accesso.accedi")}
            </Text>
          </View>
          <Text style={styles.piedeCopyright}>
            {t("presentazione.piede.copyright", { anno: new Date().getFullYear() })}
          </Text>
        </View>
      </View>

      <FinestraContatto visible={contatto} onDismiss={() => setContatto(false)} />
      <FinestraAccesso modo={accesso} onCambia={setAccesso} onDismiss={chiudiAccesso} />
    </ScrollView>
  );
}
