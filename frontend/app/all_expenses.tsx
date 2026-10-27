import { router, useLocalSearchParams } from "expo-router";
import { SectionList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton, Text, Searchbar, Snackbar } from "react-native-paper";
import { annullaImport, giornoCaricamento } from "@/utils/importEstratto";
import { PulsanteEliminaSpese } from "@/components/importa/PulsanteEliminaSpese";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/utils/apiFetch";
import { intestazioneGiorno, localeAttuale, toDateString } from "@/utils/date";
import { creaStili } from "@/styles/all_expenses.styles";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AvvisoEliminazione } from "@/components/AvvisoEliminazione";
import { useEliminaConAnnulla } from "@/utils/eliminazione";
import { BarraPeriodo } from "@/components/BarraPeriodo";
import { usePreferenze } from "@/utils/preferenze";
import { useTranslation } from "react-i18next";
import { nomeCategoria } from "@/utils/categorie";
import { useStili } from "@/utils/tema";
import { LARGHEZZA_CONTENUTO, useSchermoLargo } from "@/utils/layout";
import { ChipGruppi } from "@/components/spese/ChipGruppi";
import { RigaSpesa, RigaTabella, IntestazioneTabella, type Expense } from "@/components/spese/RigaSpesa";

//"Caffè" va trovato anche digitando "caffe": togliamo accenti e maiuscole
function normalize(text: string): string {
    return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

type Gruppo = { id: number; name: string };

type CategoryGroup = Gruppo & { children: { id: number; name: string }[] };

type Period = "mese" | "anno" | "tutto";

//mese o anno di calendario spostato di "offset" dal presente: inizio incluso, fine esclusa
function periodRange(period: Period, offset: number): { from: Date; to: Date } | null {
    const today = new Date();
    if (period === "mese") {
        return {
            from: new Date(today.getFullYear(), today.getMonth() + offset, 1),
            to: new Date(today.getFullYear(), today.getMonth() + offset + 1, 1),
        };
    }
    if (period === "anno") {
        return { from: new Date(today.getFullYear() + offset, 0, 1), to: new Date(today.getFullYear() + offset + 1, 0, 1) };
    }
    return null;
}

export default function ExpenseList() {
  const styles = useStili(creaStili);
  const { importo } = usePreferenze();
  const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    //sul computer le spese diventano una tabella, in una colonna centrata
    const largo = useSchermoLargo();
    const [expenses, setExpenses]=useState<Expense[]>([]);
    const [expensesLoaded, setExpensesLoaded] = useState(false);
    const [query, setQuery] = useState("");
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [period, setPeriod] = useState<Period>("tutto");
    const [offset, setOffset] = useState(0);
    const range = periodRange(period, offset);
    //le spese portano la sottocategoria: per raggrupparle serve sapere a quale
    //gruppo appartiene ciascuna, informazione che sta solo nel backend
    const [gruppoDiCategoria, setGruppoDiCategoria] = useState<Map<number, Gruppo>>(new Map());
    //id della spesa in attesa di conferma: null quando il dialogo e' chiuso
    const [daEliminare, setDaEliminare] = useState<Expense | null>(null);
    //arrivando dall'import: quante spese sono entrate e il codice per annullarle
    const { importate, codice } = useLocalSearchParams<{ importate?: string; codice?: string }>();
    const [avvisoImport, setAvvisoImport] = useState<string | null>(null);
    //arrivando da "I tuoi estratti conto": solo le spese di quell'estratto, senza altri filtri
    const { estratto, caricato } = useLocalSearchParams<{ estratto?: string; caricato?: string }>();
    const [confermaEstratto, setConfermaEstratto] = useState(false);
    useEffect(() => {
        if (importate && codice) setAvvisoImport(t("importa.importate", { count: Number(importate) }));
    }, [importate, codice]);

    async function annullaUltimoImport() {
        if (!codice) return;
        const riuscito = await annullaImport(codice);
        router.setParams({ importate: undefined, codice: undefined });
        setAvvisoImport(riuscito ? t("importa.annullato") : t("importa.erroreAnnulla"));
        if (riuscito) loadExpenses();
    }

    async function eliminaEstratto() {
        setConfermaEstratto(false);
        if (!estratto) return;
        if (await annullaImport(estratto)) router.back();
        else setAvvisoImport(t("importa.erroreAnnulla"));
    }

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
        //le date sono "AAAA-MM-GG": il confronto fra stringhe evita gli scarti di fuso orario
        const from = range && toDateString(range.from);
        const to = range && toDateString(range.to);
        return expenses.filter((e) => {
            if (estratto && e.importazione_id !== estratto) return false;
            if (categoryId !== null) {
                //il chip porta l'id del gruppo, la spesa quello della sottocategoria:
                //il confronto passa dal gruppo di appartenenza
                const gruppo = e.category_id !== null ? gruppoDiCategoria.get(e.category_id) : undefined;
                if (gruppo?.id !== categoryId) return false;
            }
            if (from && to && (e.date < from || e.date >= to)) return false;
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
    }, [expenses, query, categoryId, period, offset, gruppoDiCategoria, estratto]);

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

    const hasFilters = query.trim() !== "" || categoryId !== null || period !== "tutto";
    const etichettaPeriodo = !range ? null
        : period === "anno" ? String(range.from.getFullYear())
        //"ottobre 2026" -> "Ottobre 2026"
        : range.from.toLocaleDateString(localeAttuale(), { month: "long", year: "numeric" }).replace(/^./, (c) => c.toUpperCase());

    function scegliPeriodo(nuovo: Period) {
        setPeriod(nuovo);
        setOffset(0);
    }

    function resetFilters() {
        setQuery("");
        setCategoryId(null);
        scegliPeriodo("tutto");
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
    function confirmDelete(expense: Expense) {
        setDaEliminare(expense);
    }
    const eliminazione = useEliminaConAnnulla<Expense>(
        async (expense) => (await apiFetch(`/expenses/${expense.id}`, { method: "DELETE" })).ok,
        (expense, visibile) => setExpenses((prev) => visibile
            //rimessa nell'ordine del server: per data, a parita' di giorno la piu' recente in cima
            ? [...prev, expense].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
            : prev.filter((exp) => exp.id !== expense.id)),
    );
    function handleDelete(expense: Expense) {
        setDaEliminare(null);
        eliminazione.avvia(expense, {
            fatto: t("spese.eliminata"),
            nonRiuscito: t("spese.nonEliminata"),
            dettaglio: `${expense.description} · ${importo(expense.amount)}`,
        });
    }
    return (
       <View style={[styles.container, largo && styles.containerLargo, largo && { maxWidth: LARGHEZZA_CONTENUTO + 80 }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <IconButton icon="chevron-left" onPress={()=>router.back()} />
            <Text variant="titleMedium">
                {estratto && caricato ? t("estratti.titoloEstratto", { data: giornoCaricamento(caricato) }) : t("spese.titolo")}
            </Text>
            {hasFilters
                ? <IconButton icon="filter-remove-outline" onPress={resetFilters} />
                : <View style={styles.headerSpacer} />}
        </View>

        {!estratto && <>
        <Searchbar
            placeholder={t("spese.cerca")}
            value={query}
            onChangeText={setQuery}
            style={styles.searchbar}
            inputStyle={styles.searchbarInput}
        />

        <BarraPeriodo
            voci={[
                { valore: "mese", etichetta: t("statistiche.mese") },
                { valore: "anno", etichetta: t("statistiche.anno") },
                { valore: "tutto", etichetta: t("spese.tutto") },
            ]}
            scelta={period}
            onScegli={scegliPeriodo}
            etichettaGruppo={t("spese.periodo")}
            periodo={etichettaPeriodo}
            inCorso={offset === 0}
            onSposta={(passo) => setOffset((prev) => prev + passo)}
            onOggi={() => setOffset(0)}
        />

        {categories.length > 0 && (
            <ChipGruppi gruppi={categories} scelto={categoryId} onScegli={setCategoryId} />
        )}
        </>}

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
        {estratto && filtered.length > 0 && (
            <View style={styles.eliminaEstratto}>
                <PulsanteEliminaSpese onPress={() => setConfermaEstratto(true)} />
            </View>
        )}

        <SectionList
        style={styles.list} //senza flex la lista si adatta al contenuto e il layout si riassesta a ogni filtro
        contentContainerStyle={!largo && styles.listContainer}
        sections={sezioni}
        stickySectionHeadersEnabled={false}
        keyExtractor={(item)=>item.id.toString()} //dice a React come identificare ogni elemento dell'array in modo univoco
        renderSectionHeader={({ section }) => (
            <Text style={styles.dayHeader}>{intestazioneGiorno(section.giorno)}</Text>
        )}
        ListHeaderComponent={largo && filtered.length > 0 ? <IntestazioneTabella /> : null}
        renderItem={({ item, index, section })=> largo ? (
            <RigaTabella item={item} onModifica={() => openEdit(item)} onElimina={() => confirmDelete(item)} />
        ) : (
            <RigaSpesa
                item={item}
                prima={index === 0}
                ultima={index === section.data.length - 1}
                onModifica={() => openEdit(item)}
                onElimina={() => confirmDelete(item)}
            />
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

        <Snackbar
            visible={avvisoImport !== null}
            onDismiss={() => setAvvisoImport(null)}
            duration={8000}
            action={importate && codice ? { label: t("comune.annulla"), onPress: annullaUltimoImport } : undefined}
        >
            {avvisoImport}
        </Snackbar>

        <AvvisoEliminazione avviso={eliminazione.avviso} onChiudi={eliminazione.chiudi} />

        <ConfirmDialog
            visible={confermaEstratto}
            title={t("estratti.eliminaTitolo", { count: filtered.length })}
            message={caricato ? t("estratti.eliminaTesto", { data: giornoCaricamento(caricato), totale: importo(total) }) : ""}
            confirmLabel={t("comune.elimina")}
            destructive
            icon="trash-can"
            onConfirm={eliminaEstratto}
            onDismiss={() => setConfermaEstratto(false)}
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
