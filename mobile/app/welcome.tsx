import { useCallback, useEffect, useState } from "react";
import { View, Image, ScrollView, KeyboardAvoidingView, Platform, BackHandler } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, TextInput, Button, Snackbar } from "react-native-paper";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInRight, useReducedMotion } from "react-native-reanimated";
import { apiFetch } from "@/utils/apiFetch";
import { messaggioErrore } from "@/utils/messaggioErrore";
import { segnaBenvenutoVisto } from "@/utils/benvenuto";
import { styles } from "@/styles/welcome.styles";
import { colors } from "@/styles/tokens";

const TUTTI_I_PASSAGGI = ["spese", "budget", "assistente", "abbonamenti"] as const;
type Passaggio = (typeof TUTTI_I_PASSAGGI)[number];

const BOT = require("../assets/images/logo/trackit-bot-1024.png");
const FRASE_ESEMPIO = "Pizza 15 euro ieri";

//la frase si scrive da sola, poi compare la risposta: mostra in pochi secondi
//cosa fa l'assistente senza doverlo spiegare a parole
function ChatEsempio() {
  const riduciMovimento = useReducedMotion();
  const [lettere, setLettere] = useState(riduciMovimento ? FRASE_ESEMPIO.length : 0);

  useEffect(() => {
    if (riduciMovimento) return;
    const id = setInterval(() => {
      setLettere((n) => {
        if (n >= FRASE_ESEMPIO.length) {
          clearInterval(id);
          return n;
        }
        return n + 1;
      });
    }, 55);
    return () => clearInterval(id);
  }, [riduciMovimento]);

  return (
    <View style={styles.chat}>
      <View style={styles.userBubble}>
        <Text style={styles.userText}>{FRASE_ESEMPIO.slice(0, lettere) || " "}</Text>
      </View>
      {lettere >= FRASE_ESEMPIO.length && (
        <Animated.View entering={FadeIn.delay(400)} style={styles.replyCard}>
          <Text style={styles.replyLabel}>DA CONFERMARE</Text>
          <View style={styles.replyRow}>
            <Text style={styles.replyDesc}>Pizza</Text>
            <Text style={styles.replyAmount}>15,00 €</Text>
          </View>
          <Text style={styles.replyMeta}>Cibo e bevande · ieri</Text>
        </Animated.View>
      )}
    </View>
  );
}

export default function Welcome() {
  //dal profilo il budget di solito c'e' gia': "Salva e continua" lo
  //sovrascriverebbe, riportando anche il giorno di inizio ciclo a 1
  const { rivedi } = useLocalSearchParams<{ rivedi?: string }>();
  const PASSAGGI: readonly Passaggio[] = rivedi
    ? TUTTI_I_PASSAGGI.filter((p) => p !== "budget")
    : TUTTI_I_PASSAGGI;
  const [passaggio, setPassaggio] = useState<Passaggio>("spese");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const indice = PASSAGGI.indexOf(passaggio);

  //dal profilo e' gia' segnato come visto: non serve richiamare il server
  const fine = useCallback(async () => {
    if (!rivedi) await segnaBenvenutoVisto();
    router.back();
  }, [rivedi]);

  //il tasto indietro di Android vale come "Salta": uscire senza flag
  //farebbe ricomparire il tutorial appena la home torna a fuoco
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        fine();
        return true;
      });
      return () => sub.remove();
    }, [fine])
  );

  function avanti() {
    setPassaggio(PASSAGGI[indice + 1]);
  }

  async function salvaBudget() {
    const parsedAmount = parseFloat(amount.replace(",", "."));
    if (!parsedAmount || parsedAmount <= 0) {
      setErrorMessage("Inserisci un importo valido");
      setSnackbarVisible(true);
      return;
    }
    try {
      setLoading(true);
      //giorno 1: il ciclo segue il mese solare, chi vuole un altro giorno lo cambia da "+ Nuovo"
      const response = await apiFetch("/auth/updateBudget", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthly_budget: parsedAmount, budget_start_day: 1 }),
      });
      if (!response.ok) {
        setErrorMessage(await messaggioErrore(response, "Errore nel salvataggio"));
        setSnackbarVisible(true);
        return;
      }
      avanti();
    } catch {
      setErrorMessage("Errore di rete");
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.topBar}>
          <View
            style={styles.dots}
            accessible
            accessibilityLabel={`Passaggio ${indice + 1} di ${PASSAGGI.length}`}
          >
            {PASSAGGI.map((p, i) => (
              <View key={p} style={[styles.dot, i === indice && styles.dotActive]} />
            ))}
          </View>
          {/* sempre visibile: nessuno deve sentirsi bloccato nel tutorial */}
          <Text style={styles.skip} onPress={fine} accessibilityRole="button">
            Salta
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* la key nuova a ogni passaggio fa ripartire l'animazione d'ingresso */}
          <Animated.View key={passaggio} entering={FadeInRight.duration(280)} style={styles.slide}>
            {passaggio === "spese" ? (
              <>
                <View style={[styles.iconContainer, { backgroundColor: colors.infoSoft }]}>
                  <MaterialCommunityIcons name="wallet-outline" size={32} color="#F5A623" />
                </View>
                <Text style={styles.title} variant="titleLarge">Benvenuto in TrackIt</Text>
                <Text style={styles.subtitle} variant="bodyMedium">
                  Registra ogni spesa con il pulsante + in basso.
                </Text>
                <View style={styles.infoCard}>
                  <View style={styles.infoIcon}>
                    <MaterialCommunityIcons name="bell-outline" size={22} color={colors.warningText} />
                  </View>
                  <View style={styles.infoText}>
                    <Text style={styles.infoTitle}>Anche gli abbonamenti</Text>
                    <Text style={styles.infoHint}>Ti avviso il giorno prima di ogni rinnovo.</Text>
                    <View style={styles.segmented} importantForAccessibility="no-hide-descendants">
                      <View style={styles.segment}>
                        <Text style={styles.segmentLabel}>Spesa</Text>
                      </View>
                      <View style={[styles.segment, styles.segmentSelected]}>
                        <Text style={[styles.segmentLabel, styles.segmentLabelSelected]}>Abbonamento</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </>
            ) : passaggio === "budget" ? (
              <>
                <View style={[styles.iconContainer, { backgroundColor: colors.primarySoft }]}>
                  <MaterialCommunityIcons name="target" size={32} color={colors.primary} />
                </View>
                <Text style={styles.title} variant="titleLarge">Quanto vuoi spendere al mese?</Text>
                <Text style={styles.subtitle} variant="bodyMedium">
                  Ti mostro quanto ti resta, giorno per giorno. Puoi cambiarlo quando vuoi.
                </Text>
                <View style={styles.field}>
                  <Text style={styles.label}>Budget mensile</Text>
                  <TextInput
                    value={amount}
                    onChangeText={(text) => setAmount(text.replace(/[^0-9,.]/g, ""))}
                    placeholder="Es. 1200"
                    keyboardType="numeric"
                    mode="outlined"
                    outlineStyle={styles.inputOutline}
                    style={styles.input}
                    left={<TextInput.Icon icon="currency-eur" />}
                    onSubmitEditing={salvaBudget}
                  />
                  <Text style={styles.helperText}>
                    Il ciclo parte dal giorno 1. Se ricevi lo stipendio un altro giorno lo cambi dopo da “+ Nuovo”.
                  </Text>
                </View>
              </>
            ) : passaggio === "assistente" ? (
              <>
                <Image source={BOT} style={styles.botLogo} />
                <Text style={styles.title} variant="titleLarge">Scrivila come la diresti</Text>
                <Text style={styles.subtitle} variant="bodyMedium">
                  L&apos;assistente capisce cosa hai comprato, quanto e quando, e la registra per te.
                </Text>
                <ChatEsempio />
                <View style={styles.whereRow}>
                  <Text style={styles.whereText}>Lo trovi in alto nella home</Text>
                  <View style={styles.assistantPill} importantForAccessibility="no-hide-descendants">
                    <Image source={BOT} style={styles.assistantPillIcon} />
                    <Text style={styles.assistantPillLabel}>Assistente</Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={[styles.iconContainer, { backgroundColor: colors.warningBadge }]}>
                  <MaterialCommunityIcons name="autorenew" size={32} color={colors.warningText} />
                </View>
                <Text style={styles.title} variant="titleLarge">I tuoi abbonamenti</Text>
                <Text style={styles.subtitle} variant="bodyMedium">
                  Li trovi nella scheda Abbonamenti, divisi in tre gruppi.
                </Text>
                {/* esempi fermi, copiati dalle righe vere della scheda */}
                <View style={styles.groups} importantForAccessibility="no-hide-descendants">
                  <View>
                    <Text style={styles.groupLabel}>ATTIVI</Text>
                    <View style={styles.subRow}>
                      <View style={styles.subIcon}>
                        <MaterialCommunityIcons name="repeat" size={18} color={colors.primary} />
                      </View>
                      <View style={styles.subInfo}>
                        <Text style={styles.subDesc}>Palestra</Text>
                        <Text style={styles.subMeta}>Sport · Scade tra 12 giorni</Text>
                      </View>
                      <Text style={styles.subAmount}>€50.00</Text>
                      <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.textMuted} />
                      <MaterialCommunityIcons name="pause" size={18} color={colors.textMuted} style={{ marginLeft: 8 }} />
                    </View>
                    <Text style={styles.caption}>Modificali o mettili in pausa.</Text>
                  </View>
                  <View>
                    <Text style={styles.groupLabel}>DA RINNOVARE</Text>
                    <View style={[styles.subRow, styles.dueRow]}>
                      <View style={styles.subIcon}>
                        <MaterialCommunityIcons name="repeat" size={18} color={colors.primary} />
                      </View>
                      <View style={styles.subInfo}>
                        <Text style={styles.subDesc}>Netflix</Text>
                        <Text style={styles.dueBadge}>IN ATTESA</Text>
                      </View>
                      <Text style={styles.subAmount}>€12.99</Text>
                    </View>
                    <Text style={styles.caption}>
                      Se il pagamento non è automatico, ti chiedo se hai rinnovato.
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.groupLabel}>IN PAUSA</Text>
                    <View style={[styles.subRow, styles.pausedRow]}>
                      <View style={[styles.subIcon, styles.pausedIcon]}>
                        <MaterialCommunityIcons name="repeat" size={18} color={colors.textMuted} />
                      </View>
                      <View style={styles.subInfo}>
                        <Text style={styles.subDesc}>Spotify</Text>
                        <Text style={styles.subMeta}>In pausa</Text>
                      </View>
                      <Text style={styles.reactivate}>Riattiva</Text>
                      <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.textMuted} />
                    </View>
                  </View>
                </View>
              </>
            )}
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          {passaggio === "budget" ? (
            <>
              <Button
                mode="contained"
                onPress={salvaBudget}
                style={styles.button}
                labelStyle={styles.buttonLabel}
                loading={loading}
                disabled={loading}
              >
                Salva e continua
              </Button>
              <Button onPress={avanti} disabled={loading}>Lo imposto dopo</Button>
            </>
          ) : passaggio === "abbonamenti" ? (
            <Button mode="contained" onPress={fine} style={styles.button} labelStyle={styles.buttonLabel}>
              Inizia
            </Button>
          ) : (
            <Button mode="contained" onPress={avanti} style={styles.button} labelStyle={styles.buttonLabel}>
              Avanti
            </Button>
          )}
        </View>

        <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={3000}>
          {errorMessage}
        </Snackbar>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
