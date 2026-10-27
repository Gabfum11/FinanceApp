import { View, Pressable } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { creaStili } from "@/styles/home.styles";
import { useStili, useTema } from "@/utils/tema";
import { usePreferenze } from "@/utils/preferenze";
import { formatDataSpesa } from "@/utils/date";
import { IconaCategoria } from "@/components/IconaCategoria";
import { nomeCategoria } from "@/utils/categorie";

export type Expense = {
  id: number;
  description: string;
  amount: number;
  date: string;
  category_id: number | null; //può tornare utile
  category_name: string | null;
  //gruppo della sottocategoria: colore e icona di ripiego
  category_group?: string | null;
  created_at : string;
  //spesa pagata in un'altra valuta: amount è già convertito
  original_amount?: number | null;
  original_currency?: string | null;
};

//le ultime spese, o l'invito ad aggiungere la prima
export function UltimeSpese({ expenses, expensesLoaded, saldoVisibile, importo, largo }: {
  expenses: Expense[];
  //distingue "non ho ancora caricato" da "non ci sono spese"
  expensesLoaded: boolean;
  saldoVisibile: boolean;
  importo: (valore: number) => string;
  largo: boolean;
}) {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const router = useRouter();
  const { importoIn } = usePreferenze();
  const { t } = useTranslation();

  return (
    <>
      {/* "Vedi tutte" sulla riga del titolo: prima stava su una riga da sola,
          verde chiaro su grigio (2:1), e sembrava un'etichetta */}
      <View style={[styles.sectionTitleRow, largo && styles.sectionTitleLargo]}>
        <Text style={styles.sectionTitle} accessibilityRole="header">{t("home.ultime")}</Text>
        {/* router.push e non Link asChild: sul web Link fonde gli stili come oggetti
            e lo stile-funzione del Pressable spariva, con freccia e testo in colonna */}
        {expenses.length > 0 && (
          <Pressable
            style={({ pressed }) => [styles.linkExpenses, pressed && styles.premuto]}
            onPress={() => router.push("/all_expenses")}
            accessibilityRole="link"
            hitSlop={4}
          >
            <Text style={styles.linkExpensesTesto}>{t("home.vediTutte")}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.primaryDark} />
          </Pressable>
        )}
      </View>
      {/* due righe sul telefono, cinque sul computer: un semplice elenco, perche'
          una FlatList dentro uno ScrollView che scorre nello stesso verso da' problemi */}
      {/* un solo riquadro con le righe separate da una linea: prima ogni riga
          era una card con ombra, bordo e margine, e sembravano staccate */}
      {expenses.length > 0 && (
        <View style={styles.expenseList}>
          {expenses.slice(0, largo ? 5 : 2).map((item, indice) => (
            <View key={item.id} style={[styles.expenseRow, indice > 0 && styles.expenseRowSeparata]}>
              <IconaCategoria categoria={item.category_name} gruppo={item.category_group} />
              <View style={styles.expenseInfo}>
                <Text style={styles.expenseDescription}>{item.description}</Text>
                <Text style={styles.expenseMeta}>{nomeCategoria(item.category_name)}{" · "}{formatDataSpesa(item.date)}</Text>
              </View>
              <View style={styles.amountColumn}>
                {/* colore neutro: se ogni riga e' rossa il rosso non avvisa piu' di niente.
                    Il segno meno vero, attaccato alla cifra, non va a capo da solo */}
                <Text style={styles.expenseAmount}>−{importo(item.amount)}</Text>
                {saldoVisibile && item.original_currency && item.original_amount != null && (
                  <Text style={styles.expenseOriginal}>{importoIn(item.original_amount, item.original_currency)}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
      {expensesLoaded && expenses.length === 0 && (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcona}>
            <MaterialCommunityIcons name="receipt-text" size={30} color={colors.primaryDark} />
          </View>
          <Text style={styles.emptyTitle}>{t("home.nessunaSpesa")}</Text>
          <Text style={styles.emptyHint}>{t("home.nessunaSpesaBreve")}</Text>
          {/* un pulsante vero al posto di "tocca + in basso": la prima cosa da fare */}
          <Pressable
            style={({ pressed }) => [styles.emptyPulsante, pressed && styles.premuto]}
            onPress={() => router.push("/add_expense")}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="plus" size={18} color={colors.surfaceDark} />
            <Text style={styles.emptyPulsanteTesto}>{t("schede.aggiungi")}</Text>
          </Pressable>
          {/* chi arriva con mesi di movimenti parte subito con i dati veri */}
          <Pressable
            style={({ pressed }) => [styles.linkExpenses, pressed && styles.premuto]}
            onPress={() => router.push("/import_estratto")}
            accessibilityRole="link"
          >
            <MaterialCommunityIcons name="tray-arrow-down" size={18} color={colors.primaryDark} />
            <Text style={styles.linkExpensesTesto}>{t("importa.ingressoHome")}</Text>
          </Pressable>
        </View>
      )}
    </>
  );
}
