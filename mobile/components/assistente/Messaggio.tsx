import { View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { creaStili } from "@/styles/assistant.styles";
import { useStili, useTema } from "@/utils/tema";
import { usePreferenze } from "@/utils/preferenze";
import { fromDateString, localeAttuale } from "@/utils/date";
import { nomeCategoria } from "@/utils/categorie";
import { IconaCategoria } from "@/components/IconaCategoria";

export type ExpenseConfirmation = {
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

export type ChatMessage = {
  id: string;
  sender: "user" | "system";
  text?: string;
  examples?: string[]; //elenco sotto il testo, solo per il benvenuto
  expenseData?: ExpenseConfirmation;
};

//icona, descrizione, categoria e data, importo: uguale nella spesa da
//confermare e in quella salvata, che cosi' si riconosce come la stessa
export function CorpoSpesa({ spesa }: { spesa: ExpenseConfirmation }) {
  const styles = useStili(creaStili);
  const { importoIn } = usePreferenze();
  const { t } = useTranslation();
  const frequenza = (f: string | null) => t(`frequenze.${f ?? "monthly"}`);

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

//un messaggio della chat: una bolla di testo, o la card di una spesa salvata
export function Messaggio({ item }: { item: ChatMessage }) {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const { t } = useTranslation();

  if (item.expenseData) {
    return (
      //card di esito: dice chiaramente che il salvataggio è andato a buon fine
      <View style={styles.savedCard}>
        <View style={styles.savedHeader}>
          <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />
          <Text style={styles.savedTitle}>
            {item.expenseData.recurring ? t("assistente.abbonamentoAggiunto") : t("assistente.spesaAggiunta")}
          </Text>
        </View>
        <CorpoSpesa spesa={item.expenseData} />
      </View>
    );
  }
  return (
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
  );
}
