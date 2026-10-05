import { useEffect, useMemo, useState } from "react";
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
import { useSchermoLargo } from "@/utils/layout";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, IconButton, ActivityIndicator, Portal, Switch, Menu } from "react-native-paper";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SelettoreData } from "@/components/SelettoreData";
import { apiFetch } from "@/utils/apiFetch";
import { fromDateString, toDateString } from "@/utils/date";
import { creaStili, coloriSpesa } from "../styles/add-expense.styles";
import { iconaPerGruppo } from "@/utils/categoryIcons";
import { usePreferenze } from "@/utils/preferenze";
import { simbolo, eValuta, VALUTE, IMPORTO_MASSIMO, type Valuta } from "@/utils/formato";
import { useConfirmDiscard } from "@/utils/useConfirmDiscard";
import { segnalaSalvataggio } from "@/utils/esitoAssistente";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useTranslation } from "react-i18next";
import { nomeCategoria } from "@/utils/categorie";
import { localeAttuale } from "@/utils/date";
import { traduciErrore } from "@/utils/messaggioErrore";
import { useStili, useTema } from "@/utils/tema";

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
  { value: "monthly", label: "frequenze.monthly" },
  { value: "weekly", label: "frequenze.weekly" },
  { value: "yearly", label: "frequenze.yearly" },
];

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "backspace"];
//stesso testo del server: lo riconosce e propone di scrivere a mano la cifra convertita
const CAMBIO_NON_DISPONIBILE = "Exchange rate unavailable";
const MAX_DECIMALS = 2;

export default function AddExpenseScreen() {
  const styles = useStili(creaStili);
  const { colors: tokens } = useTema();
  const colors = useMemo(() => coloriSpesa(tokens), [tokens]);
  const { valuta, importo: formatta, importoIn } = usePreferenze();
  const { t } = useTranslation();
  const router = useRouter();
  //sul computer: finestra al centro della pagina, importo scritto con la tastiera
  const largo = useSchermoLargo();
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
    fromAssistant?: string; //aperto da "Modifica" dell'assistente: l'esito torna alla chat
    autoRenew?: string; //dalla card dell'assistente o dall'abbonamento in modifica
    currency?: string; //spesa o abbonamento in valuta estera
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
  //spento = "Manuale": a ogni scadenza l'app chiede se si è rinnovato
  const [autoRenew, setAutoRenew] = useState(params.autoRenew !== "false");

  // Valuta in cui è stata pagata. null = quella dell'account: così, se il
  // valore salvato sul telefono arriva un attimo dopo, la spesa non diventa
  // per sbaglio "in valuta estera" nella valuta di prima.
  const [valutaScelta, setValutaScelta] = useState<Valuta | null>(() =>
    eValuta(params.currency) ? params.currency : null
  );
  const valutaSpesa = valutaScelta ?? valuta;
  const estera = valutaSpesa !== valuta;
  //il massimo nella valuta in cui si sta scrivendo l'importo
  const formattaInValuta = (v: number) => importoIn(v, valutaSpesa);
  const [menuValuta, setMenuValuta] = useState(false);
  // Tasso per l'anteprima, legato a valuta e giorno per cui è stato chiesto:
  // cambiando l'una o l'altro, quello vecchio non si mostra più.
  const [cambio, setCambio] = useState<{ chiave: string; rate: number; date: string } | null>(null);
  const [cambioMancante, setCambioMancante] = useState<string | null>(null);
  // la cifra addebitata, scritta a mano quando il tasso non si trova
  const [convertitoRaw, setConvertitoRaw] = useState("");

  // L'importo non è un TextInput, quindi il "focus" è esplicito: regge
  // la visibilità del tastierino e del cursore lampeggiante.
  const [isAmountFocused, setIsAmountFocused] = useState(false);

  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // I valori di partenza del form, per capire se l'utente ha cambiato qualcosa:
  // uscire da un form intatto non deve chiedere conferma.
  const [iniziali] = useState(() => ({
    amountRaw,
    description,
    date: toDateString(date),
    isSubscription,
    frequency,
    autoRenew,
    valutaScelta,
  }));
  // la categoria proposta si conosce solo dopo aver caricato l'elenco
  const [categoriaIniziale, setCategoriaIniziale] = useState<number | null>(null);
  const modificato =
    amountRaw !== iniziali.amountRaw ||
    description !== iniziali.description ||
    toDateString(date) !== iniziali.date ||
    isSubscription !== iniziali.isSubscription ||
    frequency !== iniziali.frequency ||
    autoRenew !== iniziali.autoRenew ||
    valutaScelta !== iniziali.valutaScelta ||
    (category?.id ?? null) !== categoriaIniziale;
  const { lasciaUscire, dialogo } = useConfirmDiscard(modificato);

  const amount = parseFloat(amountRaw.replace(",", "."));
  const giorno = toDateString(date);
  const chiaveCambio = `${valutaSpesa}-${giorno}`;
  const cambioAttuale = estera && cambio?.chiave === chiaveCambio ? cambio : null;
  const senzaCambio = estera && cambioMancante === chiaveCambio;
  const convertito = parseFloat(convertitoRaw.replace(",", "."));
  // una spesa estera senza tasso si salva solo con la cifra scritta a mano;
  // un abbonamento no: il server la riprova a ogni rinnovo
  const mancaConvertito = senzaCambio && !isSubscription && !(convertito > 0);
  const canSave = !isSaving && amount > 0 && category !== null && !mancaConvertito;

  useEffect(() => {
    if (!estera) return;
    let annullato = false;
    apiFetch(`/exchange-rate?from_currency=${valutaSpesa}&day=${giorno}`)
      .then(async (response) => {
        if (annullato) return;
        if (!response.ok) {
          setCambioMancante(chiaveCambio);
          return;
        }
        const dati = await response.json();
        if (!annullato) setCambio({ chiave: chiaveCambio, rate: dati.rate, date: dati.date });
      })
      .catch(() => {
        if (!annullato) setCambioMancante(chiaveCambio);
      });
    return () => {
      annullato = true;
    };
  }, [estera, valutaSpesa, giorno, chiaveCambio]);

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
          if (preselected) {
            setCategoriaIniziale(preselected.id);
            setCategory(preselected);
          }
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
    //un'altra cifra oltre il massimo non entra: si spiega perche', invece di
    //lasciar scrivere un importo che il server rifiuterebbe
    if (/^[0-9]$/.test(key)) {
      const prossimo = amountRaw === "0" ? key : amountRaw + key;
      if (parseFloat(prossimo.replace(",", ".")) > IMPORTO_MASSIMO) {
        setError(t("spesa.importoTroppoAlto", { massimo: formattaInValuta(IMPORTO_MASSIMO) }));
        return;
      }
    }
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

  //sul computer c'e' la tastiera vera: le cifre passano dalla stessa logica
  //del tastierino, Invio salva ed Esc chiude. Nei campi di testo (descrizione,
  //importo convertito) i tasti restano a loro, tranne Esc
  useEffect(() => {
    if (!largo || typeof window === "undefined") return;
    function tasto(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        if (showCategoryPicker) setShowCategoryPicker(false);
        else router.back();
        return;
      }
      const elemento = (evento.target as HTMLElement | null)?.tagName;
      if (elemento === "INPUT" || elemento === "TEXTAREA") return;
      if (evento.key === "Enter") handleSave();
      else if (/^[0-9]$/.test(evento.key)) handleKeyPress(evento.key);
      else if (evento.key === "," || evento.key === ".") handleKeyPress(",");
      else if (evento.key === "Backspace") handleKeyPress("backspace");
      else return;
      evento.preventDefault();
    }
    window.addEventListener("keydown", tasto);
    return () => window.removeEventListener("keydown", tasto);
  });

  function handleDateSelected(event: any, selectedDate: Date) {
    setShowDatePicker(false);
    setDate(selectedDate);
  }

  function formatDate(d: Date) {
    const isToday = toDateString(d) === toDateString(new Date());
    const formatted = d.toLocaleDateString(localeAttuale(), { day: "numeric", month: "long" });
    return isToday ? t("spesa.oggiData", { data: formatted }) : formatted;
  }

  async function handleSave() {
    if (!canSave) return;
    setIsAmountFocused(false);
    setIsSaving(true);
    setError(null);
    // in modifica l'importo si manda solo se è cambiato: per una spesa estera il
    // server lo riconvertirebbe, e una cifra scritta a mano andrebbe persa
    const importoCambiato =
      !isEditing ||
      amountRaw !== iniziali.amountRaw ||
      giorno !== iniziali.date ||
      valutaScelta !== iniziali.valutaScelta;
    const common = {
      description: description.trim() || nomeCategoria(category!.name),
      category_id: category!.id,
      ...(importoCambiato && { amount, currency: valutaSpesa }),
      ...(importoCambiato && senzaCambio && !isSubscription && { converted_amount: convertito }),
    };
    const collection = isSubscription ? "/subscriptions/" : "/expenses/";
    //in modifica start_date non si tocca: ha gia' generato le spese arretrate
    const body = isSubscription
      ? isEditing
        //in modifica si sposta il prossimo addebito: la data di partenza
        //ha gia' generato le spese arretrate e non si tocca
        ? { ...common, frequency, auto_renew: autoRenew, next_date: toDateString(date) }
        : { ...common, frequency, auto_renew: autoRenew, start_date: toDateString(date) }
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
        if (detail === CAMBIO_NON_DISPONIBILE) {
          // il tasso c'era per l'anteprima ma non al salvataggio: si chiede la cifra a mano
          setCambioMancante(chiaveCambio);
          setError(
            isSubscription
              ? t("spesa.cambioAbbonamento")
              : t("spesa.cambioSpesa", { simbolo: simbolo(valuta) })
          );
          return;
        }
        setError(
          traduciErrore(detail, isSubscription ? t("spesa.erroreAbbonamento") : t("spesa.erroreSpesa"))
        );
        return;
      }
      if (params.fromAssistant === "true") {
        const saved = await response.json();
        segnalaSalvataggio({
          id: saved.id,
          description: saved.description,
          //la cifra digitata, nella sua valuta: è quella che la chat mostra
          amount,
          currency: estera ? valutaSpesa : null,
          date: toDateString(date),
          category_id: saved.category_id,
          category_name: saved.category_name ?? null,
          category_group: saved.category_group ?? null,
          recurring: isSubscription,
          frequency: isSubscription ? frequency : null,
        });
      }
      lasciaUscire();
      router.back();
    } catch {
      setError(t("errori.rete"));
    } finally {
      setIsSaving(false);
    }
  }

  function screenTitle() {
    if (isEditing) return isSubscription ? t("spesa.titoloModificaAbbonamento") : t("spesa.titoloModificaSpesa");
    return isSubscription ? t("spesa.titoloNuovo") : t("spesa.titoloNuova");
  }

  return (
    // i dialoghi vanno disegnati dentro la modale: con l'host globale, su iOS
    // finirebbero sotto la schermata presentata
    <Portal.Host>
    <View style={largo ? styles.velo : styles.pieno}>
    {/* sul computer un clic fuori dalla finestra la chiude, come Esc */}
    {largo && <Pressable style={styles.sfondoVelo} onPress={() => router.back()} accessibilityLabel={t("comune.annulla")} />}
    <SafeAreaView style={[styles.container, largo && styles.finestra]} edges={["top", "bottom"]}>
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
            { value: false, label: t("spesa.tipoSpesa") },
            { value: true, label: t("spesa.tipoAbbonamento") },
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
            {t("spesa.importo")}
          </Text>
          <View style={styles.amountRow}>
            <Menu
              visible={menuValuta}
              onDismiss={() => setMenuValuta(false)}
              anchor={
                <Pressable
                  style={styles.valutaTocco}
                  onPress={() => {
                    setIsAmountFocused(false);
                    setMenuValuta(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t("spesa.valuta", { valuta: valutaSpesa })}
                >
                  <Text style={styles.currency}>{simbolo(valutaSpesa)}</Text>
                  <MaterialCommunityIcons name="chevron-down" size={18} color={colors.green} />
                </Pressable>
              }
            >
              {VALUTE.map((v) => (
                <Menu.Item
                  key={v}
                  title={`${simbolo(v)}  ${v}`}
                  leadingIcon={v === valutaSpesa ? "check" : undefined}
                  onPress={() => {
                    setError(null);
                    setValutaScelta(v === valuta ? null : v);
                    setMenuValuta(false);
                  }}
                />
              ))}
            </Menu>
            <Text style={styles.amountValue}>{amountRaw}</Text>
            {isAmountFocused && <BlinkingCursor />}
          </View>
          <View style={[styles.amountUnderline, !isAmountFocused && styles.amountUnderlineBlurred]} />
          {cambioAttuale && amount > 0 && (
            <Text style={styles.anteprima}>
              {t("spesa.anteprima", {
                importo: formatta(amount * cambioAttuale.rate),
                data: fromDateString(cambioAttuale.date).toLocaleDateString(localeAttuale(), { day: "numeric", month: "short" }),
              })}
              {isSubscription && t("spesa.ricalcolato")}
            </Text>
          )}
          {senzaCambio && (
            <Text style={styles.anteprimaErrore}>
              {isSubscription
                ? t("spesa.senzaCambioAbbonamento")
                : t("spesa.senzaCambioSpesa")}
            </Text>
          )}
        </Pressable>

        <View style={styles.fields}>
          {senzaCambio && !isSubscription && (
            <View>
              <Text variant="bodySmall" style={styles.fieldLabel}>
                {t("spesa.addebitato", { simbolo: simbolo(valuta) })}
              </Text>
              <View style={styles.field}>
                <MaterialCommunityIcons name="bank-outline" size={20} color={colors.label} />
                <RNTextInput
                  value={convertitoRaw}
                  onChangeText={setConvertitoRaw}
                  onFocus={() => setIsAmountFocused(false)}
                  keyboardType="decimal-pad"
                  placeholder={t("spesa.estrattoConto")}
                  placeholderTextColor={colors.placeholder}
                  style={styles.convertitoInput}
                />
              </View>
            </View>
          )}

          <View>
            <Text variant="bodySmall" style={styles.fieldLabel}>
              {t("spesa.categoria")}
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
                {category ? nomeCategoria(category.name) : t("spesa.selezionaCategoria")}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color={colors.label} />
            </Pressable>
          </View>

          {isSubscription && (
            <View>
              <Text variant="bodySmall" style={styles.fieldLabel}>
                {t("spesa.frequenza")}
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
                        {t(option.label)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {isSubscription && (
            <View style={styles.autoRenewRow}>
              <View style={styles.autoRenewText}>
                <Text style={styles.autoRenewLabel}>{t("spesa.rinnovoAutomatico")}</Text>
                <Text style={styles.autoRenewHint}>
                  {autoRenew
                    ? t("spesa.rinnovoAutomaticoSi")
                    : t("spesa.rinnovoAutomaticoNo")}
                </Text>
              </View>
              <Switch
                value={autoRenew}
                onValueChange={(valore) => {
                  setIsAmountFocused(false);
                  setAutoRenew(valore);
                }}
              />
            </View>
          )}

          {/* la data di partenza di un abbonamento ha gia' generato le spese arretrate */}
          <View>
            <Text variant="bodySmall" style={styles.fieldLabel}>
              {!isSubscription ? t("spesa.data") : isEditing ? t("spesa.prossimoAddebito") : t("spesa.primoAddebito")}
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
              {t("spesa.descrizione")}
            </Text>
            <View style={styles.field}>
              <MaterialCommunityIcons name="text-short" size={20} color={colors.label} />
              <RNTextInput
                value={description}
                onChangeText={setDescription}
                onFocus={() => setIsAmountFocused(false)}
                placeholder={t("spesa.esempioDescrizione")}
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
                ? t("spesa.salvaModifiche")
                : isSubscription
                  ? t("spesa.salvaAbbonamento")
                  : t("spesa.salvaSpesa")}
            </Text>
          )}
        </Pressable>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>

      {/* sul computer si scrive con la tastiera vera: il tastierino non serve */}
      {isAmountFocused && !largo && (
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
        <SelettoreData
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
              {t("spesa.selezionaCategoria")}
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
                  <Text style={styles.categoryGroupTitle}>{nomeCategoria(section.title)}</Text>
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
                    {nomeCategoria(item.name)}
                  </Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <Text style={styles.categoryRow}>{t("spesa.nessunaCategoria")}</Text>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>
      <ConfirmDialog {...dialogo} />
    </SafeAreaView>
    </View>
    </Portal.Host>
  );
}

function BlinkingCursor() {
  const styles = useStili(creaStili);
  //useState e non useRef: il valore si crea una volta e si legge durante il
  //disegno, cosa che con .current di un ref il linter non permette
  const [opacity] = useState(() => new Animated.Value(1));

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
