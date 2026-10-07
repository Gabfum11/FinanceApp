import { KeyboardAvoidingView, View, FlatList, Platform, Pressable, Image } from "react-native";
import { useSchermoLargo } from "@/utils/layout";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, IconButton, TextInput, Button, Switch, Portal } from "react-native-paper";
import { useCallback, useRef, useState } from "react";
import { API_URL } from "@/config";
import { creaStili } from "../styles/assistant.styles";
import { useFocusEffect, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { apiFetch } from "@/utils/apiFetch";
import { toDateString, fromDateString } from "@/utils/date"
import { iconaPerGruppo } from "@/utils/categoryIcons";
import { usePreferenze } from "@/utils/preferenze";
import { SelettoreData } from "@/components/SelettoreData";
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
  const [showPicker, setShowPicker] = useState(false);
  //chiudere con una proposta ancora da confermare la perderebbe senza avviso
  const { dialogo } = useConfirmDiscard(pendingExpense !== null || expenseText.trim() !== "");
  //la proposta aperta nel form con "Modifica": serve al ritorno, per mostrare
  //l'esito o rimettere la card se l'utente non ha salvato.
  //Un ref e non uno stato: cambiarlo non deve rilanciare l'effetto qui sotto
  const propostaInModifica = useRef<ExpenseConfirmation | null>(null);

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
  
  async function handleSend() {
    const userMessage: ChatMessage = {
      id: Date.now().toString(), //id basato sul timestamp attuale
      sender: "user",
      text: expenseText,
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
        body: JSON.stringify({ text: userMessage.text }),
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
  function handleDateSelected(event: any, selectedDate: Date) {
  setShowPicker(false);
  if (!pendingExpense) return;
  setPendingExpense({ ...pendingExpense, date: toDateString(selectedDate) });
}

function handleDatePickerDismiss() {
  setShowPicker(false);
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
        data={messages}
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
              <View style={styles.savedBody}>
                <View style={styles.savedIcon}>
                  <MaterialCommunityIcons
                    name={iconaPerGruppo(item.expenseData.category_group) as any}
                    size={20}
                    color={colors.primaryDark}
                  />
                </View>
                <View style={styles.savedInfo}>
                  <Text style={styles.savedDescription} numberOfLines={1}>
                    {item.expenseData.description}
                  </Text>
                  <Text style={styles.savedMeta}>
                    {nomeCategoria(item.expenseData.category_name)}
                    {" · "}
                    {item.expenseData.recurring
                      ? frequenza(item.expenseData.frequency)
                      : fromDateString(item.expenseData.date).toLocaleDateString(localeAttuale())}
                  </Text>
                </View>
                <Text style={styles.savedAmount}>{importoIn(item.expenseData.amount, item.expenseData.currency)}</Text>
              </View>
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
          isLoading ? (
            <View style={[styles.messageBubble, styles.systemBubble]}>
              <Text style={styles.systemText}>{t("assistente.analizzo")}</Text>
            </View>
          ) : null
        }
      />

      {pendingExpense && (
        <View style={styles.expenseCard}>
          <Text variant="labelSmall" style={styles.cardLabel}>{t("assistente.importo")}</Text>
          <Text variant="headlineMedium" style={styles.cardAmount}>
            {importoIn(pendingExpense.amount, pendingExpense.currency)}
          </Text>
          <Text style={styles.confirmationDetail}>
            {t("assistente.descrizione", { testo: pendingExpense.description })}
          </Text>
          <View style={styles.categoryRow}>
            <MaterialCommunityIcons
              name={iconaPerGruppo(pendingExpense.category_group) as any}
              size={18}
              color="#2ECC71"
            />
            <Text style={styles.confirmationDetail}>
              {" "}{nomeCategoria(pendingExpense.category_name)}
            </Text>
          </View>
          <Pressable onPress={() => setShowPicker(true)} style={styles.dateRow}>
            <MaterialCommunityIcons name="calendar-outline" size={18} color={colors.textMuted} />
            <Text style={styles.confirmationDetail}>
              {" "}{pendingExpense.recurring ? t("assistente.primoAddebito") : t("assistente.data")}:{" "}
              {fromDateString(pendingExpense.date).toLocaleDateString(localeAttuale())}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.chevron} style={styles.dateChevron} />
          </Pressable>
          {showPicker && (
            <SelettoreData
              value={fromDateString(pendingExpense.date)}
              mode="date"
              display="default"
              onValueChange={handleDateSelected}
              onDismiss={handleDatePickerDismiss}
            />
        )}
          {pendingExpense.recurring && (
            <>
            <Text style={styles.confirmationDetail}>
              {t("assistente.ricorrenza", { frequenza: frequenza(pendingExpense.frequency) })}
            </Text>
            <View style={styles.switchRow}>
            <Text> {t("assistente.rinnovoAutomatico")}</Text>
            <Switch
              value={autoRenew}
              onValueChange={setAutoRenew}
            />
            </View>
            </>
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
          placeholder={t("assistente.segnaposto")}
          mode="outlined"
          style={styles.textInput}
          disabled={isLoading || pendingExpense !== null}
        />
        <IconButton
          icon="send"
          iconColor="#2ECC71"
          accessibilityLabel={t("assistente.invia")}
          onPress={handleSend}
          disabled={isLoading || pendingExpense !== null}
          size={38}
        />
      </View>
    </KeyboardAvoidingView>
    <ConfirmDialog
      {...dialogo}
      title={t("assistente.chiudiTitolo")}
      message={pendingExpense ? t("assistente.chiudiProposta") : t("assistente.chiudiMessaggio")}
      confirmLabel={t("comune.chiudi")}
      cancelLabel={t("assistente.resta")}
    />
    </SafeAreaView>
    </View>
    </Portal.Host>
  );
}
