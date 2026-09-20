import { KeyboardAvoidingView, View, FlatList, Platform } from "react-native";
import { Text, IconButton, TextInput, Button, Switch } from "react-native-paper";
import { useState } from "react";
import { API_URL } from "@/config";
import { styles } from "../styles/add-expense.styles";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { apiFetch } from "@/utils/apiFetch";

export default function AddExpenseScreen() {
  type ExpenseConfirmation = {
    id: number;
    description: string;
    amount: number;
    category_name: string | null;
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

  const [expenseText, setesxpenseText] = useState(""); //stato collegato al campo di testo dove l'utente scrive
  const [pendingExpense, setPendingExpense] = useState<ExpenseConfirmation | null>(null); //rappresenta la card in attesa di decisione dell'utente
  const [isLoading, setIsLoading] = useState(false); //gestisce il messaggio "sto analizzando"
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [autoRenew, setAutoRenew] = useState(true);
  
  async function handleSend() {
    const userMessage: ChatMessage = {
      id: Date.now().toString(), //id basato sul timestamp attuale
      sender: "user",
      text: expenseText,
    };
    setMessages((prev) => [...prev, userMessage]); //crea un array contenente tutti i messaggi precedenti, più il nuovo aggiunto in fondo
    setesxpenseText("");
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
          { id: Date.now().toString(), sender: "system", text: "Non sono riuscito a capire, riprova." },
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

  async function handleConfirm() {
    if (!pendingExpense) return;
    const endpoint= pendingExpense.recurring ? "/subscriptions/" : "/expenses/"
    const body= pendingExpense.recurring ?
    {
      description: pendingExpense.description,
      amount: pendingExpense.amount,
      frequency: pendingExpense.frequency,
      category_id: pendingExpense.category_id,
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

    if (response.ok) {
      const savedExpense = await response.json();
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), sender: "system", expenseData: savedExpense },
      ]);
    }
    setPendingExpense(null);
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
          Scrivi importo e descrizione, tipo "Pizza 15 euro" o "Palestra 50 euro al mese" per un abbonamento
        </Text>
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
              <Text style={styles.confirmationDetail}>
                Categoria: {item.expenseData.category_name ?? "Non assegnata"}
              </Text>
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
          <Text style={styles.confirmationDetail}>
            Categoria: {pendingExpense.category_name ?? "Non assegnata"}
          </Text>
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
            <Button mode="outlined" onPress={handleCancel}>Annulla</Button>
            <Button mode="contained" onPress={handleConfirm}>Conferma e salva</Button>
          </View>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          value={expenseText}
          onChangeText={setesxpenseText}
          placeholder='Es. "Pizza 15 euro"'
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
