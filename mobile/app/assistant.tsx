import { Animated, KeyboardAvoidingView, View, FlatList, Platform, Pressable, Image } from "react-native";
import { useSchermoLargo } from "@/utils/layout";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, IconButton, TextInput, Button, Switch, Portal } from "react-native-paper";
import { useCallback, useEffect, useRef, useState } from "react";
import { API_URL } from "@/config";
import { creaStili } from "../styles/assistant.styles";
import { useFocusEffect, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { apiFetch } from "@/utils/apiFetch";
import { toDateString, fromDateString } from "@/utils/date"
import { IconaCategoria } from "@/components/IconaCategoria";
import { usePreferenze } from "@/utils/preferenze";
import { CampoData } from "@/components/CampoData";
import { useConfirmDiscard } from "@/utils/useConfirmDiscard";
import { prendiSalvataggio } from "@/utils/esitoAssistente";
import { useTranslation } from "react-i18next";
import { nomeCategoria } from "@/utils/categorie";
import { localeAttuale } from "@/utils/date";
import { traduciErrore } from "@/utils/messaggioErrore";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useStili, useTema } from "@/utils/tema";

export default function AssistantScreen() {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const { importoIn } = usePreferenze();
  const { t } = useTranslation();
  const frequenza = (f: string | null) => t(`frequenze.${f ?? "monthly"}`);
  type ExpenseConfirmation = {
    id: number;
    description: string;
    amount: number;
    category_name: string | null;
    category_group: string | null;
    date: string;
    category_id:number | null;
    recurring: boolean;
    frequency: string | null;
    currency?: string | null; //riconosciuta nel testo ("40 sterline"), se diversa da quella dell'utente
  };

  type ChatMessage = {
    id: string;
    sender: "user" | "system";
    text?: string;
    examples?: string[]; //elenco sotto il testo, solo per il benvenuto
    expenseData?: ExpenseConfirmation;
  };

  const router = useRouter();
  //sul computer: pannello a destra, con la pagina visibile accanto
  const largo = useSchermoLargo();

  const [expenseText, setExpenseText] = useState(""); //stato collegato al campo di testo dove l'utente scrive
  const [pendingExpense, setPendingExpense] = useState<ExpenseConfirmation | null>(null); //rappresenta la card in attesa di decisione dell'utente
  const [isLoading, setIsLoading] = useState(false); //gestisce il messaggio "sto analizzando"
  //il benvenuto è il primo messaggio del bot: sembra che l'assistente parli davvero
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "benvenuto",
      sender: "system",
      text: t("assistente.benvenuto"),
      //coprono i casi che l'assistente sa riconoscere: base, con data, ricorrente, domanda
      examples: [
        t("assistente.esempio1"),
        t("assistente.esempio2"),
        t("assistente.esempio3"),
        t("assistente.esempio4"),
        t("assistente.esempio5"),
      ],
    },
  ]);
  const [autoRenew, setAutoRenew] = useState(true);
  //chiudere con una proposta ancora da confermare la perderebbe senza avviso
  const { dialogo } = useConfirmDiscard(pendingExpense !== null || expenseText.trim() !== "");
  //la proposta aperta nel form con "Modifica": serve al ritorno, per mostrare
  //l'esito o rimettere la card se l'utente non ha salvato.
  //Un ref e non uno stato: cambiarlo non deve rilanciare l'effetto qui sotto
  const propostaInModifica = useRef<ExpenseConfirmation | null>(null);
  //l'ultima domanda con la sua risposta: il server la manda al modello per
  //capire i seguiti come "quali sono?" o "e il mese scorso?"
  const ultimoScambio = useRef<{ domanda: string; risposta: string } | null>(null);
  const lista = useRef<FlatList<ChatMessage>>(null);

  useFocusEffect(
    useCallback(() => {
      const proposta = propostaInModifica.current;
      if (!proposta) return; //prima apertura, o ritorno da altro
      propostaInModifica.current = null;
      const salvata = prendiSalvataggio();
      if (salvata) {
        //la stessa card di "Conferma", con i dati come sono stati salvati dal form
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), sender: "system", expenseData: salvata },
        ]);
      } else {
        //uscito senza salvare: la proposta torna in chat invece di sparire
        setPendingExpense(proposta);
      }
    }, [])
  );
  
  //il campo e' bloccato mentre l'assistente risponde o c'e' una spesa da confermare
  const bloccato = isLoading || pendingExpense !== null;
  const puoInviare = !bloccato && expenseText.trim() !== "";

  async function handleSend() {
    //Invio sul computer arriva anche col campo vuoto: una bolla vuota
    //farebbe rispondere "non ho capito" a un messaggio mai scritto
    if (!puoInviare) return;
    const userMessage: ChatMessage = {
      id: Date.now().toString(), //id basato sul timestamp attuale
      sender: "user",
      text: expenseText.trim(),
    };
    setMessages((prev) => [...prev, userMessage]); //crea un array contenente tutti i messaggi precedenti, più il nuovo aggiunto in fondo
    setExpenseText("");
    setIsLoading(true);

    try {
      //lo stesso endpoint per spese e domande: decide il server cosa e' il messaggio
      const response = await apiFetch("/assistant/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: userMessage.text, precedente: ultimoScambio.current }),
      });

      if (!response.ok) {
        //429 e 503 significano "servizio occupato", non "frase incomprensibile":
        //col messaggio sbagliato l'utente riscrive la stessa cosa e fallisce di nuovo
        const occupato = response.status === 429 || response.status === 503;
        const detail = await response
          .json()
          .then((body) => (typeof body?.detail === "string" ? body.detail : null))
          .catch(() => null);

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "system",
            text: occupato
              ? traduciErrore(detail, t("errori.troppeRichieste"))
              : t("assistente.nonCapito"),
          },
        ]);
        return;
      }

      const data = await response.json();
      if (data.tipo === "risposta") {
        //una domanda sulle spese: la risposta e' un messaggio come gli altri
        ultimoScambio.current = { domanda: userMessage.text ?? "", risposta: data.testo };
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), sender: "system", text: data.testo },
        ]);
        return;
      }
      setPendingExpense(data.spesa);
      setAutoRenew(true); //ogni proposta riparte dal default, non dalla scelta fatta sulla precedente
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), sender: "system", text: t("errori.rete") },
      ]);
    } finally {
      setIsLoading(false);
    }
  }
  async function handleConfirm() {
    if (!pendingExpense) return;
    const endpoint= pendingExpense.recurring ? "/subscriptions/" : "/expenses/"
    const body= pendingExpense.recurring ?
    {
      description: pendingExpense.description,
      amount: pendingExpense.amount,
      frequency: pendingExpense.frequency,
      category_id: pendingExpense.category_id,
      start_date: pendingExpense.date, //da quando parte: genera gli eventuali arretrati
      auto_renew: autoRenew,
      currency: pendingExpense.currency ?? undefined,
    }:
    {
      description: pendingExpense.description,
      amount: pendingExpense.amount,
      date: pendingExpense.date,
      category_id: pendingExpense.category_id,
      currency: pendingExpense.currency ?? undefined,
    }
    const response = await apiFetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      //la card resta aperta: l'utente puo' correggere la data e riprovare
      const detail = await response
        .json()
        .then((data) => (typeof data?.detail === "string" ? data.detail : null))
        .catch(() => null);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "system",
          text: traduciErrore(detail, t("assistente.nonSalvato")),
        },
      ]);
      return;
    }

    const saved = await response.json();
    //la risposta di /subscriptions/ non ha "recurring" né "date": si parte dalla proposta
    //confermata, così la card sa dire se è stata aggiunta una spesa o un abbonamento
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), sender: "system", expenseData: { ...pendingExpense, id: saved.id } },
    ]);
    setPendingExpense(null); //rimuove la card di conferma
  }

  function handleEdit() {
    if (!pendingExpense) return;
    // la card sparisce: la proposta prosegue nel form, che salva per conto suo;
    // al ritorno useFocusEffect mostra l'esito o la rimette in chat
    const proposal = pendingExpense;
    propostaInModifica.current = proposal;
    setPendingExpense(null);
    router.push({
      pathname: "/add_expense",
      params: {
        amount: String(proposal.amount),
        description: proposal.description,
        date: proposal.date,
        recurring: String(proposal.recurring),
        ...(proposal.category_id !== null && { categoryId: String(proposal.category_id) }),
        ...(proposal.frequency !== null && { frequency: proposal.frequency }),
        fromAssistant: "true",
        autoRenew: String(autoRenew),
        ...(proposal.currency && { currency: proposal.currency }),
      },
    });
  }

  function handleCancel() {
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), sender: "system", text: t("assistente.annullata") },
    ]);
    setPendingExpense(null);
  }

  //icona, descrizione, categoria e data, importo: uguale nella spesa da
  //confermare e in quella salvata, che cosi' si riconosce come la stessa
  function corpoSpesa(spesa: ExpenseConfirmation) {
    return (
      <View style={styles.savedBody}>
        <IconaCategoria categoria={spesa.category_name} gruppo={spesa.category_group} dimensione={36} />
        <View style={styles.savedInfo}>
          <Text style={styles.savedDescription} numberOfLines={1}>
            {spesa.description}
          </Text>
          <Text style={styles.savedMeta}>
            {nomeCategoria(spesa.category_name)}
            {" · "}
            {spesa.recurring
              ? frequenza(spesa.frequency)
              : fromDateString(spesa.date).toLocaleDateString(localeAttuale())}
          </Text>
        </View>
        <Text style={styles.savedAmount}>{importoIn(spesa.amount, spesa.currency)}</Text>
      </View>
    );
  }

  return (
    //i dialoghi vanno disegnati dentro la modale: con l'host globale, su iOS
    //finirebbero sotto la schermata presentata
    <Portal.Host>
    <View style={largo ? styles.rigaPannello : styles.pieno}>
    {/* sul computer un clic sulla pagina accanto chiude il pannello */}
    {largo && <Pressable style={styles.fuoriPannello} onPress={() => router.back()} accessibilityLabel={t("comune.chiudi")} />}
    {/* senza safe area il benvenuto finiva sotto la barra di stato e l'input sotto i tasti di navigazione */}
    <SafeAreaView style={[styles.container, largo && styles.pannello]} edges={["top", "bottom"]}>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"} //height fa si che su android, quando appare la tastiera, il contenitore si ridimensiona spingendo il campo input verso l'alto
    >
      <View style={styles.header}>
        <Image
          source={require("../assets/images/logo/trackit-bot-1024.png")}
          style={styles.headerAvatar}
        />
        <View style={styles.headerText}>
          <Text variant="titleMedium" style={styles.headerTitle}>{t("assistente.titolo")}</Text>
          <Text variant="bodySmall" style={styles.headerSubtitle}>{t("assistente.sottotitolo")}</Text>
        </View>
        <IconButton icon="close" onPress={() => router.back()} accessibilityLabel={t("assistente.chiudiAssistente")} />
      </View>

      <FlatList
        ref={lista}
        data={messages}
        //resta sull'ultimo messaggio quando ne arriva uno nuovo e quando la
        //tastiera accorcia la lista, altrimenti finirebbe nascosto sotto
        onContentSizeChange={() => lista.current?.scrollToEnd({ animated: true })}
        onLayout={() => lista.current?.scrollToEnd({ animated: false })}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.chatContainer}
        renderItem={({ item }) => (
          item.expenseData ? (
            //card di esito: dice chiaramente che il salvataggio è andato a buon fine
            <View style={styles.savedCard}>
              <View style={styles.savedHeader}>
                <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />
                <Text style={styles.savedTitle}>
                  {item.expenseData.recurring ? t("assistente.abbonamentoAggiunto") : t("assistente.spesaAggiunta")}
                </Text>
              </View>
              {corpoSpesa(item.expenseData)}
            </View>
          ) : (
            <View
              style={[
                styles.messageBubble,
                item.sender === "user" ? styles.userBubble : styles.systemBubble,
              ]}
            >
              <Text style={item.sender === "user" ? styles.userText : styles.systemText}>
                {item.text}
              </Text>
              {item.examples && (
                <View style={styles.examples}>
                  <Text style={styles.examplesLabel}>{t("assistente.perEsempio")}</Text>
                  {item.examples.map((esempio) => (
                    <Text key={esempio} style={styles.example}>“{esempio}”</Text>
                  ))}
                </View>
              )}
            </View>
          )
        )}
        ListFooterComponent={
          isLoading ? <PuntiniAttesa /> : null
        }
      />

      {pendingExpense && (
        //la stessa card dell'esito: confermando cambiano solo intestazione e colore
        <View style={[styles.savedCard, styles.pendingCard]}>
          <View style={[styles.savedHeader, styles.pendingHeader]}>
            <MaterialCommunityIcons name="clock-outline" size={20} color={colors.textMuted} />
            <Text style={styles.pendingTitle}>
              {pendingExpense.recurring ? t("assistente.abbonamentoDaConfermare") : t("assistente.spesaDaConfermare")}
            </Text>
          </View>
          {corpoSpesa(pendingExpense)}
          {/* un tocco sulla riga apre subito il calendario */}
          <CampoData
            value={fromDateString(pendingExpense.date)}
            onChange={(data) => setPendingExpense({ ...pendingExpense, date: toDateString(data) })}
            style={styles.pendingLine}
            accessibilityLabel={pendingExpense.recurring ? t("assistente.primoAddebito") : t("assistente.data")}
          >
            <MaterialCommunityIcons name="calendar-outline" size={20} color={colors.textMuted} />
            <Text style={styles.pendingLineLabel}>
              {pendingExpense.recurring ? t("assistente.primoAddebito") : t("assistente.data")}
            </Text>
            <Text style={styles.pendingLineValue}>
              {fromDateString(pendingExpense.date).toLocaleDateString(localeAttuale())}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.chevron} />
          </CampoData>
          {pendingExpense.recurring && (
            <View style={styles.pendingLine}>
              <MaterialCommunityIcons name="autorenew" size={20} color={colors.textMuted} />
              <Text style={styles.pendingLineLabel}>{t("assistente.rinnovoAutomatico")}</Text>
              <Switch value={autoRenew} onValueChange={setAutoRenew} />
            </View>
          )}
          <View style={styles.cardActions}>
            <Button mode="text" onPress={handleCancel}>{t("comune.annulla")}</Button>
            <Button mode="outlined" icon="pencil-outline" onPress={handleEdit}>{t("comune.modifica")}</Button>
            <Button mode="contained" onPress={handleConfirm}>{t("comune.conferma")}</Button>
          </View>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          value={expenseText}
          onChangeText={setExpenseText}
          //bloccato da una spesa da confermare: il campo dice cosa fare, non solo che e' grigio
          placeholder={pendingExpense ? t("assistente.confermaPrima") : t("assistente.segnaposto")}
          mode="outlined"
          style={styles.textInput}
          disabled={bloccato}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        {/* cerchio pieno come le icone dell'app, grigio finche' non c'e' niente da inviare */}
        <Pressable
          style={[styles.sendButton, !puoInviare && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!puoInviare}
          accessibilityRole="button"
          accessibilityLabel={t("assistente.invia")}
          accessibilityState={{ disabled: !puoInviare }}
        >
          <MaterialCommunityIcons
            name="send"
            size={22}
            color={puoInviare ? colors.textOnPrimary : colors.disabledText}
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
    <ConfirmDialog
      {...dialogo}
      title={t("assistente.chiudiTitolo")}
      message={pendingExpense ? t("assistente.chiudiProposta") : t("assistente.chiudiMessaggio")}
      confirmLabel={t("comune.chiudi")}
      cancelLabel={t("assistente.resta")}
      icon="message-off"
    />
    </SafeAreaView>
    </View>
    </Portal.Host>
  );
}

//i tre puntini delle chat mentre l'assistente risponde; chi usa un lettore
//di schermo sente "Sto analizzando"
function PuntiniAttesa() {
  const styles = useStili(creaStili);
  const { t } = useTranslation();
  //useState e non useRef: i valori si creano una volta e si leggono nel disegno
  const [valori] = useState(() => [0, 1, 2].map(() => new Animated.Value(0.3)));

  useEffect(() => {
    const animazione = Animated.loop(
      Animated.stagger(
        150,
        valori.map((valore) =>
          Animated.sequence([
            Animated.timing(valore, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(valore, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          ])
        )
      )
    );
    animazione.start();
    return () => animazione.stop();
  }, [valori]);

  return (
    <View
      style={[styles.messageBubble, styles.systemBubble, styles.puntini]}
      accessible
      accessibilityLabel={t("assistente.analizzo")}
      accessibilityLiveRegion="polite"
    >
      {valori.map((valore, i) => (
        <Animated.View key={i} style={[styles.puntino, { opacity: valore }]} />
      ))}
    </View>
  );
}
