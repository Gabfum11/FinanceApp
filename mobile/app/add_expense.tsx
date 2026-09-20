import { useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
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

type Category = {
  id: number;
  name: string;
  keywords: string | null;
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
  }>();

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

  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amount = parseFloat(amountRaw.replace(",", "."));
  const canSave = !isSaving && amount > 0 && category !== null;

  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await apiFetch("/categories/");
        if (!response.ok) return;
        const data: Category[] = await response.json();
        setCategories(data);
        // la categoria proposta arriva come id: l'oggetto completo esiste solo ora
        if (params.categoryId) {
          const preselected = data.find((c) => c.id === Number(params.categoryId));
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
    try {
      const response = await apiFetch(isSubscription ? "/subscriptions/" : "/expenses/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isSubscription ? { ...common, frequency } : { ...common, date: toDateString(date) }
        ),
      });

      if (!response.ok) {
        setError(
          isSubscription
            ? "Non è stato possibile salvare l'abbonamento. Riprova."
            : "Non è stato possibile salvare la spesa. Riprova."
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

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" size={28} onPress={() => router.back()} />
        <Text variant="titleMedium" style={styles.headerTitle}>
          {isSubscription ? "Nuovo abbonamento" : "Nuova spesa"}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
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
                  setShowDatePicker(false);
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

          {isSubscription ? (
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
          ) : (
            <View>
              <Text variant="bodySmall" style={styles.fieldLabel}>
                Data
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
          )}

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
              {isSubscription ? "Salva abbonamento" : "Salva spesa"}
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
            <FlatList
              data={categories}
              keyExtractor={(item) => item.id.toString()}
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
