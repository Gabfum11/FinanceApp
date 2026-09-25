import { KeyboardAvoidingView, View, FlatList, Platform, Pressable, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../styles/tokens";
import { Text, IconButton, TextInput, Button, Switch } from "react-native-paper";
import { useState } from "react";
import { API_URL } from "@/config";
import { styles } from "../styles/assistant.styles";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { apiFetch } from "@/utils/apiFetch";
import { toDateString, fromDateString } from "@/utils/date"
import { iconaPerGruppo } from "@/utils/categoryIcons";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function AssistantScreen() {
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
  };

  type ChatMessage = {
    id: string;
    sender: "user" | "system";
    text?: string;
    examples?: string[]; //elenco sotto il testo, solo per il benvenuto
    expenseData?: ExpenseConfirmation;
  };

  const router = useRouter();

  const [expenseText, setExpenseText] = useState(""); //stato collegato al campo di testo dove l'utente scrive
  const [pendingExpense, setPendingExpense] = useState<ExpenseConfirmation | null>(null); //rappresenta la card in attesa di decisione dell'utente
  const [isLoading, setIsLoading] = useState(false); //gestisce il messaggio "sto analizzando"
  //il benvenuto è il primo messaggio del bot: sembra che l'assistente parli davvero
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "benvenuto",
      sender: "system",
      text: "Ciao! Sono l'assistente di Trackit. Dimmi cosa hai comprato, quanto hai speso e, se vuoi, anche quando. Se è una spesa che si ripete, la salvo come abbonamento.",
      //coprono i casi che l'assistente sa riconoscere: base, con data, ricorrente
      examples: [
        "Pizza 15 euro",
        "Spesa 40 euro ieri",
        "Benzina 60 euro il 3 settembre",
        "Palestra 50 euro al mese",
      ],
    },
  ]);
  const [autoRenew, setAutoRenew] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  
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
      const response = await apiFetch("/expenses/extract-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expenseText: userMessage.text }),
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
              ? detail ?? "Troppe richieste in questo momento. Riprova tra qualche istante."
              : 'Non sono riuscito a capire. Prova a indicare cosa hai speso e quanto, tipo "Pizza 15 euro".',
          },
        ]);
        return;
      }

      const data = await response.json();
      setPendingExpense(data);
      setAutoRenew(true); //ogni proposta riparte dal default, non dalla scelta fatta sulla precedente
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), sender: "system", text: "Errore di rete, riprova." },
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
    }:
    {
      description: pendingExpense.description,
      amount: pendingExpense.amount,
      date: pendingExpense.date,
      category_id: pendingExpense.category_id,
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
          text: detail ?? "Non sono riuscito a salvare, riprova.",
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
    // la card sparisce: la proposta prosegue nel form, che salva per conto suo
    const proposal = pendingExpense;
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
      },
    });
  }

  function handleCancel() {
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), sender: "system", text: "Spesa annullata." },
    ]);
    setPendingExpense(null);
  }

  return (
    //senza safe area il benvenuto finiva sotto la barra di stato e l'input sotto i tasti di navigazione
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"} //height fa si che su android, quando appare la tastiera, il contenitore si ridimensiona spingendo il campo input verso l'alto
    >
      <View style={styles.header}>
        <Image
          source={require("../assets/images/logo/saldo-bot-1024.png")}
          style={styles.headerAvatar}
        />
        <View style={styles.headerText}>
          <Text variant="titleMedium" style={styles.headerTitle}>Assistente</Text>
          <Text variant="bodySmall" style={styles.headerSubtitle}>Registra spese scrivendo a parole</Text>
        </View>
        <IconButton icon="close" onPress={() => router.back()} accessibilityLabel="Chiudi l'assistente" />
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
                  {item.expenseData.recurring ? "Abbonamento aggiunto" : "Spesa aggiunta"}
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
                    {item.expenseData.category_name ?? "Non assegnata"}
                    {" · "}
                    {item.expenseData.recurring
                      ? item.expenseData.frequency === "monthly" ? "Mensile" : item.expenseData.frequency === "weekly" ? "Settimanale" : "Annuale"
                      : fromDateString(item.expenseData.date).toLocaleDateString("it-IT")}
                  </Text>
                </View>
                <Text style={styles.savedAmount}>€{item.expenseData.amount.toFixed(2)}</Text>
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
                  <Text style={styles.examplesLabel}>Per esempio:</Text>
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
              <Text style={styles.systemText}>Sto analizzando...</Text>
            </View>
          ) : null
        }
      />

      {pendingExpense && (
        <View style={styles.expenseCard}>
          <Text variant="labelSmall" style={styles.cardLabel}>IMPORTO</Text>
          <Text variant="headlineMedium" style={styles.cardAmount}>
            €{pendingExpense.amount.toFixed(2)}
          </Text>
          <Text style={styles.confirmationDetail}>
            Descrizione: {pendingExpense.description}
          </Text>
          <View style={styles.categoryRow}>
            <MaterialCommunityIcons
              name={iconaPerGruppo(pendingExpense.category_group) as any}
              size={18}
              color="#2ECC71"
            />
            <Text style={styles.confirmationDetail}>
              {" "}{pendingExpense.category_name ?? "Non assegnata"}
            </Text>
          </View>
          <Pressable onPress={() => setShowPicker(true)} style={styles.dateRow}>
            <MaterialCommunityIcons name="calendar-outline" size={18} color="#666" />
            <Text style={styles.confirmationDetail}>
              {" "}{pendingExpense.recurring ? "Primo addebito" : "Data"}:{" "}
              {fromDateString(pendingExpense.date).toLocaleDateString("it-IT")}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#ccc" style={styles.dateChevron} />
          </Pressable>
          {showPicker && (
            <DateTimePicker
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
              Ricorrenza: {pendingExpense.frequency === "monthly" ? "Mensile" : pendingExpense.frequency === "weekly" ? "Settimanale" : "Annuale"}
            </Text>
            <View style={styles.switchRow}>
            <Text> Rinnovo automatico</Text>
            <Switch
              value={autoRenew}
              onValueChange={setAutoRenew}
            />
            </View>
            </>
          )}
          <View style={styles.cardActions}>
            <Button mode="text" onPress={handleCancel}>Annulla</Button>
            <Button mode="outlined" icon="pencil-outline" onPress={handleEdit}>Modifica</Button>
            <Button mode="contained" onPress={handleConfirm}>Conferma</Button>
          </View>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          value={expenseText}
          onChangeText={setExpenseText}
          placeholder='Es. "Spesa 40 euro ieri"'
          mode="outlined"
          style={styles.textInput}
          disabled={isLoading || pendingExpense !== null}
        />
        <IconButton
          icon="send"
          iconColor="#2ECC71"
          onPress={handleSend}
          disabled={isLoading || pendingExpense !== null}
          size={38}
        />
      </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
