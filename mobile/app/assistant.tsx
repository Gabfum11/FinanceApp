import { KeyboardAvoidingView, View, FlatList, Platform, Pressable } from "react-native";
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
    expenseData?: ExpenseConfirmation;
  };

  const router = useRouter();

  const [expenseText, setExpenseText] = useState(""); //stato collegato al campo di testo dove l'utente scrive
  const [pendingExpense, setPendingExpense] = useState<ExpenseConfirmation | null>(null); //rappresenta la card in attesa di decisione dell'utente
  const [isLoading, setIsLoading] = useState(false); //gestisce il messaggio "sto analizzando"
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: "system",
            text: 'Non sono riuscito a capire. Prova a indicare cosa hai speso e quanto, tipo "Pizza 15 euro".',
          },
        ]);
        return;
      }

      const data = await response.json();
      setPendingExpense(data);
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

    const savedExpense = await response.json();
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), sender: "system", expenseData: savedExpense },
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"} //height fa si che su android, quando appare la tastiera, il contenitore si ridimensiona spingendo il campo input verso l'alto
    >
      <View style={styles.introContainer}>
        <Text variant="titleMedium" style={styles.title}>Registra la tua spesa</Text>
        <Text variant="bodyMedium" style={styles.sectionParagraph}>
          Scrivi importo e descrizione. Puoi aggiungere quando l'hai fatta, e se si ripete diventa un abbonamento.
        </Text>
        <View style={styles.examples}>
          <Text variant="bodySmall" style={styles.example}>"Pizza 15 euro"</Text>
          <Text variant="bodySmall" style={styles.example}>"Spesa 40 euro ieri"</Text>
          <Text variant="bodySmall" style={styles.example}>"Palestra 50 euro al mese"</Text>
        </View>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.chatContainer}
        renderItem={({ item }) => (
          item.expenseData ? (
            <View style={styles.expenseCard}>
              <Text variant="labelSmall" style={styles.cardLabel}>IMPORTO</Text>
              <Text variant="headlineMedium" style={styles.cardAmount}>
                €{item.expenseData.amount.toFixed(2)}
              </Text>
              <Text style={styles.confirmationDetail}>
                Descrizione: {item.expenseData.description}
              </Text>
              <View style={styles.categoryRow}>
                <MaterialCommunityIcons
                  name={iconaPerGruppo(item.expenseData.category_group) as any}
                  size={18}
                  color="#2ECC71"
                />
                <Text style={styles.confirmationDetail}>
                  {" "}{item.expenseData.category_name ?? "Non assegnata"}
                </Text>
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
  );
}
