import { router } from "expo-router";
import { SectionList, View, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton, Text, Searchbar } from "react-native-paper";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/utils/apiFetch";
import { intestazioneGiorno } from "@/utils/date";
import { creaStili } from "@/styles/all_expenses.styles";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IconaCategoria } from "@/components/IconaCategoria";
import { usePreferenze } from "@/utils/preferenze";
import { useTranslation } from "react-i18next";
import { nomeCategoria } from "@/utils/categorie";
import { useStili } from "@/utils/tema";
import { LARGHEZZA_CONTENUTO, useSchermoLargo } from "@/utils/layout";

type Expense = {
  id: number;
  description: string;
  amount: number;
  date: string;
  category_id: number | null;
  category_name: string | null;
  //gruppo della sottocategoria: colore e icona di ripiego
  category_group?: string | null;
  created_at : string;
  //spesa pagata in un'altra valuta: amount è già convertito
  original_amount?: number | null;
  original_currency?: string | null;
};
//"Caffè" va trovato anche digitando "caffe": togliamo accenti e maiuscole
function normalize(text: string): string {
    return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

type Gruppo = { id: number; name: string };

type CategoryGroup = Gruppo & { children: { id: number; name: string }[] };

type Period = "all" | "month" | "quarter";

const PERIODS: { value: Period; label: string }[] = [
    { value: "all", label: "spese.tutto" },
    { value: "month", label: "spese.questoMese" },
    { value: "quarter", label: "spese.treMesi" },
];

function periodStart(period: Period): Date | null {
    const today = new Date();
    if (period === "month") return new Date(today.getFullYear(), today.getMonth(), 1);
    if (period === "quarter") return new Date(today.getFullYear(), today.getMonth() - 2, 1);
    return null;
}

export default function ExpenseList() {
  const styles = useStili(creaStili);
  const { importo, importoIn } = usePreferenze();
  const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    //sul computer le spese diventano una tabella, in una colonna centrata
    const largo = useSchermoLargo();
    const [expenses, setExpenses]=useState<Expense[]>([]);
    const [expensesLoaded, setExpensesLoaded] = useState(false);
    const [query, setQuery] = useState("");
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [period, setPeriod] = useState<Period>("all");
    //le spese portano la sottocategoria: per raggrupparle serve sapere a quale
    //gruppo appartiene ciascuna, informazione che sta solo nel backend
    const [gruppoDiCategoria, setGruppoDiCategoria] = useState<Map<number, Gruppo>>(new Map());
    //id della spesa in attesa di conferma: null quando il dialogo e' chiuso
    const [daEliminare, setDaEliminare] = useState<number | null>(null);

    //i chip mostrano i gruppi, non le sottocategorie: con 46 voci sarebbero
    //troppi da scorrere. Compaiono solo i gruppi che hanno spese registrate
    const categories = useMemo(() => {
        const usati = new Map<number, string>();
        for (const e of expenses) {
            if (e.category_id === null) continue;
            const gruppo = gruppoDiCategoria.get(e.category_id);
            if (gruppo) usati.set(gruppo.id, gruppo.name);
        }
        return [...usati.entries()].sort((a, b) => a[1].localeCompare(b[1]));
    }, [expenses, gruppoDiCategoria]);

    const filtered = useMemo(() => {
        const q = normalize(query.trim());
        const from = periodStart(period);
        return expenses.filter((e) => {
            if (categoryId !== null) {
                //il chip porta l'id del gruppo, la spesa quello della sottocategoria:
                //il confronto passa dal gruppo di appartenenza
                const gruppo = e.category_id !== null ? gruppoDiCategoria.get(e.category_id) : undefined;
                if (gruppo?.id !== categoryId) return false;
            }
            if (from && new Date(e.date) < from) return false;
            if (!q) return true;
            //la ricerca testuale guarda anche il nome del gruppo: cercando "casa"
            //si trovano le bollette, che non contengono quella parola
            const gruppo = e.category_id !== null ? gruppoDiCategoria.get(e.category_id) : undefined;
            return (
                normalize(e.description).includes(q) ||
                normalize(e.category_name ?? "").includes(q) ||
                //si cerca anche nella lingua dell'utente: "Gym" deve trovare Palestra
                normalize(nomeCategoria(e.category_name)).includes(q) ||
                normalize(gruppo?.name ?? "").includes(q)
            );
        });
    }, [expenses, query, categoryId, period, gruppoDiCategoria]);

    const total = useMemo(
        () => filtered.reduce((sum, e) => sum + e.amount, 0),
        [filtered]
    );

    //le spese si dividono per giorno, la data diventa l'intestazione:
    //sul telefono come sul computer, dove ogni giorno ha le sue righe di tabella
    const sezioni = useMemo(() => {
        //arrivano in ordine di inserimento: una spesa di ieri registrata oggi
        //finirebbe in cima, staccata dalle altre dello stesso giorno
        const ordinate = [...filtered].sort((a, b) => b.date.localeCompare(a.date));
        const perGiorno: { giorno: string; data: Expense[] }[] = [];
        for (const e of ordinate) {
            const ultima = perGiorno[perGiorno.length - 1];
            if (ultima?.giorno === e.date) ultima.data.push(e);
            else perGiorno.push({ giorno: e.date, data: [e] });
        }
        return perGiorno;
    }, [filtered]);

    const hasFilters = query.trim() !== "" || categoryId !== null || period !== "all";

    function resetFilters() {
        setQuery("");
        setCategoryId(null);
        setPeriod("all");
    }
    async function loadExpenses() {
        const response=await apiFetch("/expenses/");
        if (response.ok) {
            const data=await response.json()
            setExpenses(data)
            setExpensesLoaded(true)
        }
    }
    //la gerarchia cambia raramente: basta caricarla una volta all'apertura
    useEffect(() => {
        async function loadGruppi() {
            try {
                const response = await apiFetch("/categories/grouped");
                if (!response.ok) return;
                const gruppi: CategoryGroup[] = await response.json();
                const mappa = new Map<number, Gruppo>();
                for (const g of gruppi) {
                    for (const figlia of g.children) {
                        mappa.set(figlia.id, { id: g.id, name: g.name });
                    }
                }
                setGruppoDiCategoria(mappa);
            } catch {
                //senza gerarchia i chip categoria non compaiono, il resto funziona
            }
        }
        loadGruppi();
    }, []);
    useFocusEffect(
        useCallback(()=>{
            loadExpenses();
        },[])
    );
    function openEdit(expense: Expense) {
        router.push({
            pathname: "/add_expense",
            params: {
                editId: String(expense.id),
                amount: String(expense.original_currency ? expense.original_amount : expense.amount),
                ...(expense.original_currency && { currency: expense.original_currency }),
                description: expense.description,
                date: expense.date,
                ...(expense.category_id !== null && { categoryId: String(expense.category_id) }),
            },
        });
    }
    function confirmDelete(expenseId: number) {
        setDaEliminare(expenseId);
    }
    async function handleDelete(expenseId:number) {
        setDaEliminare(null);
        const response=await apiFetch(`/expenses/${expenseId}`, {method:"DELETE"});
        if(response.ok){
            setExpenses((prev) => prev.filter((exp) => exp.id !== expenseId)); //serve ad aggiornare la lista a schermo filtrando le spese, il cui id non corrisponde a quello della spesa cancellata
        }
        
    }
    return (
       <View style={[styles.container, largo && styles.containerLargo, largo && { maxWidth: LARGHEZZA_CONTENUTO + 80 }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <IconButton icon="chevron-left" onPress={()=>router.back()} />
            <Text variant="titleMedium">{t("spese.titolo")}</Text>
            {hasFilters
                ? <IconButton icon="filter-remove-outline" onPress={resetFilters} />
                : <View style={styles.headerSpacer} />}
        </View>

        <Searchbar
            placeholder={t("spese.cerca")}
            value={query}
            onChangeText={setQuery}
            style={styles.searchbar}
            inputStyle={styles.searchbarInput}
        />

        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
            contentContainerStyle={styles.chipRow}
        >
            {PERIODS.map((p) => (
                <Pressable
                    key={p.value}
                    onPress={() => setPeriod(p.value)}
                    style={[styles.chip, period === p.value && styles.chipSelected]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: period === p.value }}
                >
                    <Text style={[styles.chipLabel, period === p.value && styles.chipLabelSelected]}>
                        {t(p.label)}
                    </Text>
                </Pressable>
            ))}
        </ScrollView>

        {categories.length > 0 && (
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipScroll}
                contentContainerStyle={styles.chipRow}
            >
                <Pressable
                    onPress={() => setCategoryId(null)}
                    style={[styles.chip, categoryId === null && styles.chipSelected]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: categoryId === null }}
                >
                    <Text style={[styles.chipLabel, categoryId === null && styles.chipLabelSelected]}>
                        {t("spese.tutte")}
                    </Text>
                </Pressable>
                {categories.map(([id, name]) => (
                    <Pressable
                        key={id}
                        onPress={() => setCategoryId(id)}
                        style={[styles.chip, categoryId === id && styles.chipSelected]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: categoryId === id }}
                    >
                        <Text style={[styles.chipLabel, categoryId === id && styles.chipLabelSelected]}>
                            {nomeCategoria(name)}
                        </Text>
                    </Pressable>
                ))}
            </ScrollView>
        )}

        {/* filtrando, la domanda successiva e' sempre "quanto ho speso in questo".
            Resta sempre montata: comparendo e sparendo sposterebbe la lista */}
        <View style={styles.summaryRow}>
            {filtered.length > 0 && (
                <>
                    <Text style={styles.summaryCount}>
                        {t("spese.conteggio", { count: filtered.length })}
                    </Text>
                    <Text style={styles.summaryTotal}>{importo(total)}</Text>
                </>
            )}
        </View>

        <SectionList
        style={styles.list} //senza flex la lista si adatta al contenuto e il layout si riassesta a ogni filtro
        contentContainerStyle={!largo && styles.listContainer}
        sections={sezioni}
        stickySectionHeadersEnabled={false}
        keyExtractor={(item)=>item.id.toString()} //dice a React come identificare ogni elemento dell'array in modo univoco
        renderSectionHeader={({ section }) => (
            <Text style={styles.dayHeader}>{intestazioneGiorno(section.giorno)}</Text>
        )}
        ListHeaderComponent={largo && filtered.length > 0 ? (
            <View style={styles.intestazioneTabella}>
                <View style={styles.colonnaIcona} />
                <Text style={[styles.intestazioneColonna, styles.colonnaDescrizione]}>{t("spese.colonnaDescrizione")}</Text>
                <Text style={[styles.intestazioneColonna, styles.colonnaCategoria]}>{t("spese.colonnaCategoria")}</Text>
                <Text style={[styles.intestazioneColonna, styles.colonnaImporto]}>{t("spese.colonnaImporto")}</Text>
                <View style={styles.colonnaAzioni} />
            </View>
        ) : null}
        renderItem={({ item, index, section })=> largo ? (
            //sul computer: una riga di tabella, ogni dato nella sua colonna
            <View style={styles.rigaTabella}>
                <View style={styles.colonnaIcona}>
                    <IconaCategoria categoria={item.category_name} gruppo={item.category_group} dimensione={34} />
                </View>
                <Text style={[styles.expenseDescription, styles.colonnaDescrizione]} numberOfLines={1}>{item.description}</Text>
                <Text style={[styles.expenseMeta, styles.colonnaCategoria]} numberOfLines={1}>{nomeCategoria(item.category_name)}</Text>
                <View style={[styles.amountColumn, styles.colonnaImporto]}>
                    <Text style={styles.expenseAmount}>−{importo(item.amount)}</Text>
                    {item.original_currency && item.original_amount != null && (
                        <Text style={styles.expenseOriginal}>{importoIn(item.original_amount, item.original_currency)}</Text>
                    )}
                </View>
                <View style={[styles.azioni, styles.colonnaAzioni]}>
                    <IconButton icon="pencil-outline" size={18} onPress={() => openEdit(item)} accessibilityLabel={t("spese.modifica")} />
                    <IconButton icon="trash-can-outline" size={18} onPress={() => confirmDelete(item.id)} accessibilityLabel={t("spese.elimina")} />
                </View>
            </View>
        ) : (
            //le spese dello stesso giorno formano un riquadro solo, divise da una linea
            <View style={[
                styles.expenseRow,
                index === 0 && styles.expenseRowPrima,
                index > 0 && styles.expenseRowSeparata,
                index === section.data.length - 1 && styles.expenseRowUltima,
            ]}>
                {/* l'icona rende la lista scansionabile senza leggere */}
                <IconaCategoria categoria={item.category_name} gruppo={item.category_group} />
                <View style={styles.expenseInfo}>
                    <Text style={styles.expenseDescription}>{item.description}</Text>
                    {/* la data e' gia' nell'intestazione del giorno */}
                    <Text style={styles.expenseMeta}>{nomeCategoria(item.category_name)}</Text>
                </View>
                <View style={styles.amountColumn}>
                    <Text style={styles.expenseAmount}>−{importo(item.amount)}</Text>
                    {item.original_currency && item.original_amount != null && (
                        <Text style={styles.expenseOriginal}>{importoIn(item.original_amount, item.original_currency)}</Text>
                    )}
                </View>
                {/* sempre visibili: si deve capire subito che la spesa si puo' modificare o eliminare */}
                <IconButton icon="pencil-outline" size={18} onPress={() => openEdit(item)} accessibilityLabel={t("spese.modifica")} style={styles.azioneRiga} />
                <IconButton icon="trash-can-outline" size={18} onPress={() => confirmDelete(item.id)} accessibilityLabel={t("spese.elimina")} style={styles.azioneRiga} />
            </View>
        )}
        ListEmptyComponent={
            !expensesLoaded ? null : hasFilters ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>{t("spese.nessunRisultato")}</Text>
                    <Text style={styles.emptyHint}>{t("spese.cambiaFiltri")}</Text>
                </View>
            ) : (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>{t("spese.nessunaSpesa")}</Text>
                </View>
            )
        }
        />

        <ConfirmDialog
            visible={daEliminare !== null}
            title={t("spese.eliminaTitolo")}
            message={t("spese.eliminaTesto")}
            confirmLabel={t("comune.elimina")}
            destructive
            icon="trash-can"
            onConfirm={() => daEliminare !== null && handleDelete(daEliminare)}
            onDismiss={() => setDaEliminare(null)}
        />
       </View> 
    )
}
