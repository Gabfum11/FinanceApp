import { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, TextInput as CampoNascosto, View, useWindowDimensions } from "react-native";
import { Dialog, Portal, Text, TextInput } from "react-native-paper";
import * as WebBrowser from "expo-web-browser";
import { useTranslation } from "react-i18next";
import { PRIVACY_URL } from "@/config";
import { IconaDialogo, PulsantiDialogo, creaStiliFinestra } from "@/components/Dialogo";
import { inviaMessaggio, type Argomento } from "@/utils/support";
import { messaggioErrore } from "@/utils/messaggioErrore";
import { DIALOGO_LARGO, useSchermoLargo } from "@/utils/layout";
import { useStili } from "@/utils/tema";
import { fontSize, fontWeight, radius, spacing, type Colori } from "@/styles/tokens";

const ARGOMENTI: Argomento[] = ["problema", "idea", "domanda", "altro"];
const MASSIMO = 2000;

//basta a cogliere gli errori di battitura (manca la @, manca il dominio):
//il controllo vero lo fa il server
const EMAIL_PLAUSIBILE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = {
  visible: boolean;
  onDismiss: () => void;
  /** l'email dell'account, se chi scrive ha fatto l'accesso */
  emailIniziale?: string;
};

/**
 * Il modulo «Scrivici»: dalla landing (senza account) e dal Profilo.
 *
 * Prima "Contattaci" apriva un mailto:, che sul computer spesso non fa nulla:
 * molti usano la posta dal browser e non hanno un programma configurato.
 * Il testo resta se si chiude la finestra senza inviare: si perde solo dopo
 * l'invio riuscito.
 */
export function FinestraContatto({ visible, onDismiss, emailIniziale = "" }: Props) {
  const { t } = useTranslation();
  const styles = useStili(creaStili);
  const finestra = useStili(creaStiliFinestra);
  const largo = useSchermoLargo();
  //sul telefono, con la tastiera aperta, il modulo intero non entra: scorre
  const { height } = useWindowDimensions();

  const [email, setEmail] = useState(emailIniziale);
  const [argomento, setArgomento] = useState<Argomento>("problema");
  const [messaggio, setMessaggio] = useState("");
  //trappola per i bot: invisibile, una persona la lascia vuota
  const [sito, setSito] = useState("");
  const [emailToccata, setEmailToccata] = useState(false);
  const [invio, setInvio] = useState(false);
  const [errore, setErrore] = useState("");
  const [inviato, setInviato] = useState(false);

  //il profilo carica l'email dopo il primo disegno
  useEffect(() => {
    if (emailIniziale && !email) setEmail(emailIniziale);
  }, [emailIniziale]);

  const emailValida = EMAIL_PLAUSIBILE.test(email.trim());
  const pronto = emailValida && messaggio.trim().length > 0;

  function chiudi() {
    onDismiss();
    if (inviato) {
      //dopo l'invio si riparte da capo; l'email resta, e' sempre la stessa persona
      setInviato(false);
      setMessaggio("");
      setArgomento("problema");
    }
    setErrore("");
  }

  async function invia() {
    setInvio(true);
    setErrore("");
    try {
      const response = await inviaMessaggio({ email: email.trim(), argomento, messaggio, sito });
      if (response.ok) setInviato(true);
      else setErrore(await messaggioErrore(response, t("contatto.errore")));
    } catch {
      setErrore(t("errori.rete"));
    } finally {
      setInvio(false);
    }
  }

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={chiudi} style={[finestra.finestra, largo && DIALOGO_LARGO]}>
        {inviato ? (
          <>
            <IconaDialogo nome="check" />
            <Dialog.Title style={[finestra.titolo, finestra.titoloCentrato]}>{t("contatto.inviatoTitolo")}</Dialog.Title>
            <Dialog.Content>
              <Text style={[finestra.testo, finestra.testoCentrato]} accessibilityLiveRegion="polite">
                {t("contatto.inviatoTesto", { email: email.trim() })}
              </Text>
            </Dialog.Content>
            <PulsantiDialogo conferma={t("comune.chiudi")} onConferma={chiudi} />
          </>
        ) : (
          <>
            <IconaDialogo nome="email" />
            <Dialog.Title style={[finestra.titolo, finestra.titoloCentrato]}>{t("contatto.titolo")}</Dialog.Title>
            <ScrollView style={{ maxHeight: height * 0.6 }} keyboardShouldPersistTaps="handled">
            <Dialog.Content>
              <Text style={[finestra.testo, finestra.testoCentrato, styles.sottotitolo]}>{t("contatto.sottotitolo")}</Text>

              <TextInput
                label={t("contatto.email")}
                value={email}
                onChangeText={setEmail}
                onBlur={() => setEmailToccata(true)}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                error={emailToccata && !emailValida}
              />
              {emailToccata && !emailValida && (
                <Text style={styles.errore}>{t("contatto.emailNonValida")}</Text>
              )}

              <Text style={styles.etichetta} nativeID="argomento-contatto">{t("contatto.argomento")}</Text>
              <View style={styles.chips} accessibilityRole="radiogroup" aria-labelledby="argomento-contatto">
                {ARGOMENTI.map((a) => {
                  const scelto = a === argomento;
                  return (
                    <Pressable
                      key={a}
                      onPress={() => setArgomento(a)}
                      style={[styles.chip, scelto && styles.chipScelto]}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: scelto }}
                    >
                      <Text style={[styles.chipTesto, scelto && styles.chipTestoScelto]}>{t(`contatto.argomenti.${a}`)}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                label={t("contatto.messaggio")}
                value={messaggio}
                onChangeText={setMessaggio}
                mode="outlined"
                multiline
                numberOfLines={5}
                maxLength={MASSIMO}
                style={styles.messaggio}
              />
              <Text style={styles.contatore}>{messaggio.length} / {MASSIMO}</Text>

              {/* fuori dallo schermo e fuori dalla tastiera: i bot compilano ogni campo che trovano */}
              {Platform.OS === "web" && (
                <View style={styles.trappola} aria-hidden>
                  <CampoNascosto value={sito} onChangeText={setSito} autoComplete="off" {...({ tabIndex: -1, name: "sito" } as object)} />
                </View>
              )}

              <Text style={styles.legale}>
                {t("contatto.legale")}
                <Text style={styles.link} role="link" onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}>
                  {t("accesso.informativa")}
                </Text>
                {t("contatto.legaleBrowser")}
              </Text>

              {!!errore && (
                <Text style={styles.errore} accessibilityLiveRegion="polite">{errore}</Text>
              )}
            </Dialog.Content>
            </ScrollView>
            <PulsantiDialogo
              conferma={t("contatto.invia")}
              onConferma={invia}
              onAnnulla={chiudi}
              loading={invio}
              confermaDisattivata={!pronto}
            />
          </>
        )}
      </Dialog>
    </Portal>
  );
}

const creaStili = (colors: Colori) =>
  StyleSheet.create({
    sottotitolo: {
      marginBottom: spacing.lg,
    },
    etichetta: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.semibold,
      color: colors.text,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    //44px: il minimo per il dito
    chip: {
      minHeight: 44,
      paddingHorizontal: spacing.lg,
      justifyContent: "center",
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.chevron,
    },
    chipScelto: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    chipTesto: {
      fontSize: fontSize.sm,
      color: colors.text,
    },
    chipTestoScelto: {
      color: colors.primaryDark,
      fontWeight: fontWeight.semibold,
    },
    messaggio: {
      minHeight: 120,
    },
    contatore: {
      alignSelf: "flex-end",
      marginTop: spacing.xs,
      fontSize: fontSize.sm,
      color: colors.textSecondary,
    },
    trappola: {
      position: "absolute",
      left: -10000,
      width: 1,
      height: 1,
      overflow: "hidden",
    },
    legale: {
      marginTop: spacing.md,
      fontSize: fontSize.sm,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    link: {
      color: colors.primaryDark,
      textDecorationLine: "underline",
    },
    errore: {
      color: colors.dangerDark,
      marginTop: spacing.sm,
    },
  });
