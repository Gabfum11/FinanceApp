import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  SectionList,
  TextInput as RNTextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, IconButton, ActivityIndicator } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { apiFetch } from "@/utils/apiFetch";
import { fromDateString, toDateString } from "@/utils/date";
import { styles, colors } from "../styles/add-expense.styles";
import { iconaPerGruppo } from "@/utils/categoryIcons";

type Category = {
  id: number;
  name: string;
  keywords: string | null;
  parent_id: number | null;
};

//le categorie sono a due livelli: i gruppi fanno da intestazione e non sono
//selezionabili, si sceglie sempre una sottocategoria
type CategoryGroup = {
  id: number;
  name: string;
  children: Category[];
};

type Frequency = "monthly" | "weekly" | "yearly";

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "monthly", label: "Mensile" },
  { value: "weekly", label: "Settimanale" },
  { value: "yearly", label: "Annuale" },
];

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "backspace"];
const MAX_DECIMALS = 2;

export default function AddExpenseScreen() {
  const router = useRouter();
  // I parametri di rotta arrivano sempre come stringhe: li usa "Modifica"
  // dell'assistente per precompilare il form con i dati estratti.
  const params = useLocalSearchParams<{
    amount?: string;
    description?: string;
    categoryId?: string;
    date?: string;
    recurring?: string;
    frequency?: string;
    editId?: string; //presente solo quando si modifica un elemento esistente
  }>();
  const editId = params.editId;
  const isEditing = !!editId;

  // L'importo è tenuto come stringa perché il tastierino lavora carattere per
  // carattere: un numero perderebbe lo zero finale di "24,90" e la virgola appena digitata.
  const [amountRaw, setAmountRaw] = useState(() =>
    params.amount ? params.amount.replace(".", ",") : "0"
  );
  const [category, setCategory] = useState<Category | null>(null);
  const [date, setDate] = useState(() =>
    params.date ? fromDateString(params.date) : new Date()
  );
  const [description, setDescription] = useState(params.description ?? "");

  // Spesa e abbonamento condividono tutto tranne un campo: la spesa ha una
  // data, l'abbonamento una frequenza di rinnovo.
  const [isSubscription, setIsSubscription] = useState(params.recurring === "true");
  const [frequency, setFrequency] = useState<Frequency>(() =>
    FREQUENCIES.some((f) => f.value === params.frequency)
      ? (params.frequency as Frequency)
      : "monthly"
  );

  // L'importo non è un TextInput, quindi il "focus" è esplicito: regge
  // la visibilità del tastierino e del cursore lampeggiante.
  const [isAmountFocused, setIsAmountFocused] = useState(false);

  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amount = parseFloat(amountRaw.replace(",", "."));
  const canSave = !isSaving && amount > 0 && category !== null;

  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await apiFetch("/categories/grouped");
        if (!response.ok) return;
        const data: CategoryGroup[] = await response.json();
        setCategories(data);
        // la categoria proposta arriva come id: l'oggetto completo esiste solo ora,
        // e va cercato tra le sottocategorie di tutti i gruppi
        if (params.categoryId) {
          const cercato = Number(params.categoryId);
          const preselected = data
            .flatMap((gruppo) => gruppo.children)
            .find((c) => c.id === cercato);
          if (preselected) setCategory(preselected);
        }
      } catch {
        // le categorie restano vuote: il picker mostrerà lo stato di lista vuota
      }
    }
    loadCategories();
  }, []);

  function focusAmount() {
    // la tastiera di sistema della Descrizione e il tastierino non devono convivere
    Keyboard.dismiss();
    setIsAmountFocused(true);
  }

  function handleKeyPress(key: string) {
    setError(null);
    setAmountRaw((prev) => {
      if (key === "backspace") {
        const next = prev.slice(0, -1);
        return next === "" ? "0" : next;
      }
      if (key === ",") {
        return prev.includes(",") ? prev : prev + ",";
      }
      // cifra
      const [, decimals] = prev.split(",");
      if (decimals !== undefined && decimals.length >= MAX_DECIMALS) return prev;
      return prev === "0" ? key : prev + key;
    });
  }

  function handleDateSelected(event: any, selectedDate: Date) {
    setShowDatePicker(false);
    setDate(selectedDate);
  }

  function formatDate(d: Date) {
    const isToday = toDateString(d) === toDateString(new Date());
    const formatted = d.toLocaleDateString("it-IT", { day: "numeric", month: "long" });
    return isToday ? `Oggi, ${formatted}` : formatted;
  }

  async function handleSave() {
    if (!canSave) return;
    setIsAmountFocused(false);
    setIsSaving(true);
    setError(null);
    const common = {
      description: description.trim() || category!.name,
      amount,
      category_id: category!.id,
    };
    const collection = isSubscription ? "/subscriptions/" : "/expenses/";
    //in modifica start_date non si tocca: ha gia' generato le spese arretrate
    const body = isSubscription
      ? isEditing
        //in modifica si sposta il prossimo addebito: la data di partenza
        //ha gia' generato le spese arretrate e non si tocca
        ? { ...common, frequency, next_date: toDateString(date) }
        : { ...common, frequency, start_date: toDateString(date) }
      : { ...common, date: toDateString(date) };

    try {
      const response = await apiFetch(isEditing ? `${collection}${editId}` : collection, {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        // il server spiega i casi noti (es. troppi rinnovi arretrati)
        const detail = await response
          .json()
          .then((body) => (typeof body?.detail === "string" ? body.detail : null))
          .catch(() => null);
        setError(
          detail ??
            (isSubscription
              ? "Non è stato possibile salvare l'abbonamento. Riprova."
              : "Non è stato possibile salvare la spesa. Riprova.")
        );
        return;
      }
      router.back();
    } catch {
      setError("Errore di rete. Riprova.");
    } finally {
      setIsSaving(false);
    }
  }

  function screenTitle() {
    if (isEditing) return isSubscription ? "Modifica abbonamento" : "Modifica spesa";
    return isSubscription ? "Nuovo abbonamento" : "Nuova spesa";
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" size={28} onPress={() => router.back()} />
        <Text variant="titleMedium" style={styles.headerTitle}>
          {screenTitle()}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* in modifica il tipo non cambia: una spesa non diventa un abbonamento */}
        {!isEditing && (
        <View style={styles.segmented}>
          {[
            { value: false, label: "Spesa" },
            { value: true, label: "Abbonamento" },
          ].map((option) => {
            const selected = isSubscription === option.value;
            return (
              <Pressable
                key={option.label}
                style={[styles.segment, selected && styles.segmentSelected]}
                onPress={() => {
                  setIsAmountFocused(false);
                  setError(null);
                  setIsSubscription(option.value);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.segmentLabel, selected && styles.segmentLabelSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        )}

        <Pressable style={styles.amountSection} onPress={focusAmount}>
          <Text variant="labelSmall" style={styles.amountLabel}>
            IMPORTO
          </Text>
          <View style={styles.amountRow}>
            <Text style={styles.currency}>€</Text>
            <Text style={styles.amountValue}>{amountRaw}</Text>
            {isAmountFocused && <BlinkingCursor />}
          </View>
          <View style={[styles.amountUnderline, !isAmountFocused && styles.amountUnderlineBlurred]} />
        </Pressable>

        <View style={styles.fields}>
          <View>
            <Text variant="bodySmall" style={styles.fieldLabel}>
              Categoria
            </Text>
            <Pressable
              style={styles.field}
              onPress={() => {
                setIsAmountFocused(false);
                setShowCategoryPicker(true);
              }}
            >
              <MaterialCommunityIcons name="format-list-bulleted" size={20} color={colors.label} />
              <Text style={category ? styles.fieldText : styles.fieldPlaceholder}>
                {category ? category.name : "Seleziona categoria"}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color={colors.label} />
            </Pressable>
          </View>

          {isSubscription && (
            <View>
              <Text variant="bodySmall" style={styles.fieldLabel}>
                Frequenza
              </Text>
              <View style={styles.frequencyRow}>
                {FREQUENCIES.map((option) => {
                  const selected = frequency === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      style={[styles.frequencyChip, selected && styles.frequencyChipSelected]}
                      onPress={() => {
                        setIsAmountFocused(false);
                        setFrequency(option.value);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text
                        style={[
                          styles.frequencyLabel,
                          selected && styles.frequencyLabelSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* la data di partenza di un abbonamento ha gia' generato le spese arretrate */}
          <View>
            <Text variant="bodySmall" style={styles.fieldLabel}>
              {!isSubscription ? "Data" : isEditing ? "Prossimo addebito" : "Primo addebito"}
            </Text>
              <Pressable
                style={styles.field}
                onPress={() => {
                  setIsAmountFocused(false);
                  setShowDatePicker(true);
                }}
              >
                <MaterialCommunityIcons name="calendar-outline" size={20} color={colors.keypadText} />
                <Text style={styles.fieldText}>{formatDate(date)}</Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color={colors.label} />
              </Pressable>
          </View>

          <View>
            <Text variant="bodySmall" style={styles.fieldLabel}>
              Descrizione
            </Text>
            <View style={styles.field}>
              <MaterialCommunityIcons name="text-short" size={20} color={colors.label} />
              <RNTextInput
                value={description}
                onChangeText={setDescription}
                onFocus={() => setIsAmountFocused(false)}
                placeholder="Es. Esselunga"
                placeholderTextColor={colors.placeholder}
                style={styles.descriptionInput}
                maxLength={200}
                returnKeyType="done"
              />
            </View>
          </View>
        </View>

        <Pressable
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={[styles.saveButtonText, !canSave && styles.saveButtonTextDisabled]}>
              {isEditing
                ? "Salva modifiche"
                : isSubscription
                  ? "Salva abbonamento"
                  : "Salva spesa"}
            </Text>
          )}
        </Pressable>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>

      {isAmountFocused && (
      <View style={styles.keypad}>
        {KEYS.map((key) => (
          <Pressable
            key={key}
            style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
            onPress={() => handleKeyPress(key)}
          >
            {key === "backspace" ? (
              <MaterialCommunityIcons name="backspace-outline" size={24} color={colors.keypadText} />
            ) : (
              <Text style={styles.keyText}>{key}</Text>
            )}
          </Pressable>
        ))}
      </View>
      )}

      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onValueChange={handleDateSelected}
          onDismiss={() => setShowDatePicker(false)}
        />
      )}

      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowCategoryPicker(false)}>
          {/* il Pressable interno intercetta il tap così non chiude il foglio */}
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <Text variant="titleMedium" style={styles.modalTitle}>
              Seleziona categoria
            </Text>
            <SectionList
              sections={categories.map((gruppo) => ({
                title: gruppo.name,
                data: gruppo.children,
              }))}
              keyExtractor={(item) => item.id.toString()}
              stickySectionHeadersEnabled
              renderSectionHeader={({ section }) => (
                //il gruppo è solo un'intestazione: non è selezionabile.
                //L'icona sta qui e non su ogni voce: ripeterla 46 volte
                //aggiungerebbe rumore senza distinguere nulla
                <View style={styles.categoryGroupHeader}>
                  <MaterialCommunityIcons
                    name={iconaPerGruppo(section.title) as any}
                    size={16}
                    color={colors.label}
                  />
                  <Text style={styles.categoryGroupTitle}>{section.title}</Text>
                </View>
              )}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.categoryRow}
                  onPress={() => {
                    setCategory(item);
                    setShowCategoryPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.categoryRowText,
                      category?.id === item.id && styles.categoryRowSelected,
                    ]}
                  >
                    {item.name}
                  </Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <Text style={styles.categoryRow}>Nessuna categoria disponibile.</Text>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function BlinkingCursor() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[styles.cursor, { opacity }]} />;
}
