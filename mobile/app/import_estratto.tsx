import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, ScrollView, View } from "react-native";
import { ActivityIndicator, IconButton, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useStili, useTema } from "@/utils/tema";
import { creaStili } from "@/styles/import-estratto.styles";
import { FinestraComputer } from "@/components/FinestraComputer";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RigaImportata } from "@/components/RigaImportata";
import { FoglioModificaImport, type CategoriaScelta, type Gruppo } from "@/components/FoglioModificaImport";
import { apiFetch } from "@/utils/apiFetch";
import { usePreferenze } from "@/utils/preferenze";
import { localeAttuale } from "@/utils/date";
import {
  chiediAnteprima,
  confermaImport,
  daScegliere,
  scegliFile,
  type Anteprima,
  type ErroreImport,
  type RigaImport,
} from "@/utils/importEstratto";

// Import dell'estratto conto: si sceglie il file, il backend lo legge e propone
// le spese, l'utente controlla e conferma. Le fasi stanno in una schermata sola
// perche' tornare indietro di una fase non deve rifare la navigazione.

type Fase = "scelta" | "caricamento" | "errore" | "controllo";

//sotto mezzo secondo l'attesa non si mostra: comparirebbe e sparirebbe subito
const RITARDO_ATTESA = 500;
//oltre, il server Render si sta probabilmente risvegliando
const ATTESA_LUNGA = 10_000;
const ATTESA_MASSIMA = 90_000;

export default function ImportEstratto() {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const router = useRouter();
  const { t } = useTranslation();
  const [fase, setFase] = useState<Fase>("scelta");
  const [nomeFile, setNomeFile] = useState("");
  const [errore, setErrore] = useState<ErroreImport>("non_riconosciuto");
  const [anteprima, setAnteprima] = useState<Anteprima | null>(null);
  const [mostraAttesa, setMostraAttesa] = useState(false);
  const [attesaLunga, setAttesaLunga] = useState(false);
  const [movimentoRidotto, setMovimentoRidotto] = useState(false);
  const richiesta = useRef<AbortController | null>(null);
  const { importo } = usePreferenze();
  const [righe, setRighe] = useState<RigaImport[]>([]);
  const [chiediConferma, setChiediConferma] = useState(false);
  const [inInvio, setInInvio] = useState(false);
  const [erroreInvio, setErroreInvio] = useState(false);
  const [gruppi, setGruppi] = useState<Gruppo[]>([]);
  const [inModifica, setInModifica] = useState<{ indice: number; inFila: boolean; totale: number } | null>(null);
  const lista = useRef<ScrollView>(null);
  //posizione verticale di ogni riga, per scorrere fino alla prima da sistemare
  const posizioni = useRef<Map<number, number>>(new Map());

  //le sezioni seguono il messaggio arrivato dal server: una riga resta dov'e'
  //anche dopo che le scegli la categoria, cosi' la lista non salta sotto il dito
  const daSistemare = useMemo(() => righe.filter((r) => r.messaggio !== null), [righe]);
  const pronte = useMemo(() => righe.filter((r) => r.messaggio === null), [righe]);
  const selezionate = righe.filter((r) => r.selezionata);
  const mancanti = daScegliere(righe);
  const totale = selezionate.reduce((somma, r) => somma + r.importo, 0);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setMovimentoRidotto).catch(() => {});
    //le categorie servono solo al foglio di modifica: si caricano una volta
    apiFetch("/categories/grouped")
      .then((r) => (r.ok ? r.json() : []))
      .then(setGruppi)
      .catch(() => {});
    //uscendo dalla schermata la richiesta in corso non serve piu'
    return () => richiesta.current?.abort();
  }, []);

  async function scegli() {
    const file = await scegliFile();
    if (!file) return;
    setNomeFile(file.name);
    analizza(file);
  }

  async function analizza(file: File) {
    const controllo = new AbortController();
    richiesta.current = controllo;
    setFase("caricamento");
    setMostraAttesa(false);
    setAttesaLunga(false);
    const timer = [
      setTimeout(() => setMostraAttesa(true), RITARDO_ATTESA),
      setTimeout(() => setAttesaLunga(true), ATTESA_LUNGA),
      setTimeout(() => {
        controllo.abort();
        setErrore("lento");
        setFase("errore");
      }, ATTESA_MASSIMA),
    ];
    try {
      const esito = await chiediAnteprima(file, controllo.signal);
      if (typeof esito === "string") {
        setErrore(esito);
        setFase("errore");
      } else {
        setAnteprima(esito);
        setRighe(esito.righe);
        setFase("controllo");
      }
    } catch {
      //annullata dall'utente o dal tempo massimo: la fase l'ha gia' decisa chi ha annullato
    } finally {
      timer.forEach(clearTimeout);
      if (richiesta.current === controllo) richiesta.current = null;
    }
  }

  function cambiaSelezione(indice: number) {
    setRighe((attuali) => attuali.map((r) => (r.indice === indice ? { ...r, selezionata: !r.selezionata } : r)));
  }

  function togliPronte() {
    setRighe((attuali) => attuali.map((r) => (r.messaggio === null ? { ...r, selezionata: false } : r)));
  }

  function apriModifica(indice: number, inFila: boolean) {
    setInModifica({ indice, inFila, totale: inFila ? daScegliere(righe).length : 1 });
  }

  function salvaModifica(nome: string, categoria: CategoriaScelta | null, applicaAgliAltri: boolean) {
    if (!inModifica) return;
    const corrente = righe.find((r) => r.indice === inModifica.indice);
    if (!corrente) return;
    const aggiornate = righe.map((r) => {
      const stessa = r.indice === corrente.indice;
      const altra = applicaAgliAltri && r.selezionata && r.esercente === corrente.esercente;
      if (!stessa && !altra) return r;
      return {
        ...r,
        nome: stessa ? nome : r.nome,
        ...(categoria && { categoria_id: categoria.id, categoria_nome: categoria.name, categoria_gruppo: categoria.gruppo }),
      };
    });
    setRighe(aggiornate);
    //in fila: si passa alla prossima riga ancora senza categoria
    const prossima = inModifica.inFila ? daScegliere(aggiornate)[0] : undefined;
    if (prossima) {
      lista.current?.scrollTo({ y: posizioni.current.get(prossima.indice) ?? 0, animated: true });
      setInModifica({ ...inModifica, indice: prossima.indice });
    } else {
      setInModifica(null);
    }
  }

  const rigaInModifica = inModifica ? righe.find((r) => r.indice === inModifica.indice) : undefined;

  function premiImporta() {
    if (mancanti.length > 0) {
      //il pulsante non e' mai grigio: porta alla prima riga da sistemare e la apre
      const prima = mancanti[0];
      lista.current?.scrollTo({ y: posizioni.current.get(prima.indice) ?? 0, animated: true });
      apriModifica(prima.indice, true);
      return;
    }
    if (selezionate.length > 0) setChiediConferma(true);
  }

  async function importa() {
    if (!anteprima || inInvio) return;
    setInInvio(true);
    setErroreInvio(false);
    const importate = await confermaImport(anteprima.codice, righe);
    setInInvio(false);
    setChiediConferma(false);
    if (importate === null) {
      setErroreInvio(true);
      return;
    }
    router.replace({ pathname: "/all_expenses", params: { importate: String(importate), codice: anteprima.codice } });
  }

  function giornoLungo(iso: string) {
    return new Date(`${iso}T00:00:00`).toLocaleDateString(localeAttuale(), { day: "numeric", month: "long" });
  }

  function annullaAnalisi() {
    richiesta.current?.abort();
    setFase("scelta");
  }

  return (
    <FinestraComputer conChiudi={false}>
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <IconButton
          icon="chevron-left"
          size={28}
          onPress={() => (fase === "caricamento" ? annullaAnalisi() : router.back())}
          accessibilityLabel={t("comune.indietro")}
        />
        <Text variant="titleMedium" style={styles.headerTitle}>{t("importa.titolo")}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {fase === "scelta" && (
        <View style={styles.scelta}>
          <View style={styles.riquadroFile}>
            <View style={styles.iconaFile}>
              <MaterialCommunityIcons name="file-excel" size={30} color={colors.primaryDark} />
            </View>
            <Text style={styles.sceltaTitolo}>{t("importa.sceltaTitolo")}</Text>
            <Text style={styles.nota}>{t("importa.sceltaTesto")}</Text>
            <Pressable
              style={({ pressed }) => [styles.pulsante, pressed && styles.premuto]}
              onPress={scegli}
              accessibilityRole="button"
            >
              <Text style={styles.pulsanteTesto}>{t("importa.sceltaPulsante")}</Text>
            </Pressable>
          </View>
          <Text style={styles.nota}>{t("importa.sceltaNota")}</Text>
          <Text style={styles.nota}>{t("importa.sceltaAiuto")}</Text>
        </View>
      )}

      {fase === "caricamento" && (
        <>
          {mostraAttesa && (
            <>
              <View style={styles.stato} accessibilityRole="progressbar" accessibilityLiveRegion="polite">
                <ActivityIndicator animating={!movimentoRidotto} color={colors.primary} />
                <View style={styles.statoTesti}>
                  <Text style={styles.statoTitolo}>{t("importa.analisi")}</Text>
                  <Text style={styles.statoNota} numberOfLines={2}>{nomeFile}</Text>
                  {attesaLunga && <Text style={styles.statoNota}>{t("importa.analisiLenta")}</Text>}
                </View>
              </View>
              <View style={styles.sagoma} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                {[0.8, 0.65, 0.75, 0.55].map((larghezza, i) => (
                  <View key={i} style={[styles.sagomaRiga, i > 0 && styles.sagomaSeparata]}>
                    <View style={[styles.blocco, { width: 22, height: 22 }]} />
                    <View style={[styles.blocco, { width: 36, height: 36, borderRadius: 18 }]} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <View style={[styles.blocco, { width: `${larghezza * 100}%` }]} />
                      <View style={[styles.blocco, { width: "40%", height: 10 }]} />
                    </View>
                    <View style={[styles.blocco, { width: 56 }]} />
                  </View>
                ))}
              </View>
            </>
          )}
          <View style={styles.spazio} />
          <Pressable
            style={({ pressed }) => [styles.pulsanteSecondario, pressed && styles.premuto]}
            onPress={annullaAnalisi}
            accessibilityRole="button"
          >
            <Text style={styles.pulsanteSecondarioTesto}>{t("comune.annulla")}</Text>
          </Pressable>
        </>
      )}

      {fase === "errore" && (
        <>
          <View style={styles.errore} accessibilityRole="alert">
            <View style={styles.erroreIcona}>
              <MaterialCommunityIcons name="information" size={30} color={colors.msgArancio} />
            </View>
            <Text style={styles.erroreTitolo}>{t("importa.erroreTitolo")}</Text>
            <Text style={styles.erroreTesto}>{t(`importa.errore_${errore}`)}</Text>
          </View>
          <View style={styles.spazio} />
          <Pressable
            style={({ pressed }) => [styles.pulsante, { marginHorizontal: 16 }, pressed && styles.premuto]}
            onPress={scegli}
            accessibilityRole="button"
          >
            <Text style={styles.pulsanteTesto}>{t("importa.altroFile")}</Text>
          </Pressable>
          <Text style={styles.link} onPress={() => router.back()} accessibilityRole="link">
            {t("importa.tornaSpesa")}
          </Text>
        </>
      )}

      {fase === "controllo" && anteprima && (
        <>
          <Text style={styles.passo}>{t("importa.passo")}</Text>
          <ScrollView ref={lista} contentContainerStyle={{ paddingBottom: 16 }}>
            {daSistemare.length > 0 && (
              <>
                <View style={styles.sezione}>
                  <Text style={styles.sezioneTitolo} accessibilityRole="header">
                    {t("importa.daSistemare", { count: daSistemare.length })}
                  </Text>
                </View>
                <View style={styles.lista}>
                  {daSistemare.map((r, i) => (
                    <View key={r.indice} onLayout={(e) => posizioni.current.set(r.indice, e.nativeEvent.layout.y)}>
                      <RigaImportata
                        riga={r}
                        separata={i > 0}
                        onCambiaSelezione={() => cambiaSelezione(r.indice)}
                        onModifica={() => apriModifica(r.indice, false)}
                      />
                    </View>
                  ))}
                </View>
              </>
            )}
            {pronte.length > 0 && (
              <>
                <View style={styles.sezione}>
                  <Text style={styles.sezioneTitolo} accessibilityRole="header">
                    {t("importa.pronte", { count: pronte.length })}
                  </Text>
                  <Text style={styles.sezioneAzione} onPress={togliPronte} accessibilityRole="button">
                    {t("importa.togliTutte")}
                  </Text>
                </View>
                <View style={styles.lista}>
                  {pronte.map((r, i) => (
                    <RigaImportata
                      key={r.indice}
                      riga={r}
                      separata={i > 0}
                      onCambiaSelezione={() => cambiaSelezione(r.indice)}
                      onModifica={() => apriModifica(r.indice, false)}
                    />
                  ))}
                </View>
              </>
            )}
          </ScrollView>
          <View style={styles.piede}>
            <View style={styles.piedeRiga}>
              <Text style={styles.piedeTesto}>{t("importa.selezionate", { count: selezionate.length })}</Text>
              <Text style={styles.piedeTotale}>{importo(totale)}</Text>
            </View>
            {erroreInvio && <Text style={[styles.piedeTesto, { color: colors.msgArancio }]}>{t("importa.erroreConferma")}</Text>}
            <Pressable
              style={({ pressed }) => [styles.pulsante, mancanti.length > 0 && styles.pulsanteBloccato, pressed && styles.premuto]}
              onPress={premiImporta}
              disabled={selezionate.length === 0}
              accessibilityRole="button"
            >
              {mancanti.length > 0 && <MaterialCommunityIcons name="help-circle" size={18} color={colors.msgArancio} />}
              <Text style={[styles.pulsanteTesto, mancanti.length > 0 && styles.pulsanteBloccatoTesto]}>
                {mancanti.length > 0
                  ? t("importa.pulsanteBloccato", { count: mancanti.length })
                  : t("importa.pulsanteImporta", { count: selezionate.length })}
              </Text>
            </Pressable>
          </View>
          {rigaInModifica && inModifica && (
            <FoglioModificaImport
              riga={rigaInModifica}
              altreStesso={righe.filter((r) => r.indice !== rigaInModifica.indice && r.selezionata && r.esercente === rigaInModifica.esercente).length}
              inFila={inModifica.inFila}
              posizione={inModifica.totale - daScegliere(righe).length + 1}
              totaleInFila={inModifica.totale}
              gruppi={gruppi}
              onSalva={salvaModifica}
              onChiudi={() => setInModifica(null)}
            />
          )}
          <ConfirmDialog
            visible={chiediConferma}
            title={t("importa.confermaTitolo", { count: selezionate.length })}
            message={t("importa.confermaTesto", {
              dal: giornoLungo(selezionate.reduce((m, r) => (r.data < m ? r.data : m), selezionate[0]?.data ?? anteprima.dal)),
              al: giornoLungo(selezionate.reduce((m, r) => (r.data > m ? r.data : m), selezionate[0]?.data ?? anteprima.al)),
              totale: importo(totale),
            })}
            confirmLabel={t("importa.confermaPulsante")}
            cancelLabel={t("comune.indietro")}
            icon="tray-arrow-down"
            loading={inInvio}
            onConfirm={importa}
            onDismiss={() => setChiediConferma(false)}
          />
        </>
      )}
    </SafeAreaView>
    </FinestraComputer>
  );
}
