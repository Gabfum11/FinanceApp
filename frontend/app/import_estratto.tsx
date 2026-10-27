import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, ScrollView, View } from "react-native";
import { IconButton, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useStili } from "@/utils/tema";
import { creaStili } from "@/styles/import-estratto.styles";
import { FinestraComputer } from "@/components/FinestraComputer";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FoglioModificaImport, type CategoriaScelta, type Gruppo } from "@/components/FoglioModificaImport";
import { apiFetch } from "@/utils/apiFetch";
import { usePreferenze } from "@/utils/preferenze";
import { useSchermoLargo } from "@/utils/layout";
import { localeAttuale } from "@/utils/date";
import { useConfirmDiscard } from "@/utils/useConfirmDiscard";
import {
  chiediAnteprima,
  confermaImport,
  daScegliere,
  scegliFile,
  type Anteprima,
  type ErroreImport,
  type RigaImport,
} from "@/utils/importEstratto";
import { FaseScelta } from "@/components/importa/FaseScelta";
import { FaseCaricamento, FaseErrore } from "@/components/importa/FaseAttesaErrore";
import { ElencoControllo, PiedeImport } from "@/components/importa/FaseControllo";

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
  const largo = useSchermoLargo();
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

  //uscire mentre il file si legge o mentre si controllano le spese fa perdere
  //il lavoro: ogni uscita (freccia, indietro, ✕, Esc, clic fuori) chiede prima
  const { lasciaUscire, dialogo: dialogoUscita } = useConfirmDiscard(
    fase === "caricamento" || fase === "controllo",
    fase === "caricamento"
      ? {
          title: t("importa.esciCaricamentoTitolo"),
          message: t("importa.esciCaricamentoTesto"),
          confirmLabel: t("importa.esciCaricamentoConferma"),
          cancelLabel: t("importa.esciCaricamentoAnnulla"),
          icon: "timer-sand",
        }
      : {
          title: t("importa.esciControlloTitolo"),
          message: t("importa.esciControlloTesto", { count: righe.length }),
          confirmLabel: t("importa.esciControlloConferma"),
          cancelLabel: t("importa.esciControlloAnnulla"),
          icon: "file-document-remove",
        },
  );

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
    nuovoFile(file);
  }

  //scelto o trascinato nel riquadro
  function nuovoFile(file: File) {
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
    lasciaUscire();
    router.replace({ pathname: "/all_expenses", params: { importate: String(importate), codice: anteprima.codice } });
  }

  function giornoLungo(iso: string) {
    const data = new Date(`${iso}T00:00:00`);
    return data.toLocaleDateString(localeAttuale(), {
      day: "numeric",
      month: "long",
      ...(data.getFullYear() !== new Date().getFullYear() && { year: "numeric" }),
    });
  }

  function annullaAnalisi() {
    richiesta.current?.abort();
    setFase("scelta");
  }

  return (
    //sul computer e' una finestra: titolo a sinistra e ✕ a destra, come le altre
    <FinestraComputer conChiudi={largo}>
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {largo ? (
        <View style={styles.headerComputer}>
          <Text variant="titleMedium" style={styles.headerTitoloComputer} accessibilityRole="header">
            {t("importa.titolo")}
          </Text>
        </View>
      ) : (
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
      )}

      {fase === "scelta" && (
        <FaseScelta onScegli={scegli} onFile={nuovoFile} />
      )}

      {fase === "caricamento" && (
        <FaseCaricamento
          mostraAttesa={mostraAttesa}
          attesaLunga={attesaLunga}
          movimentoRidotto={movimentoRidotto}
          nomeFile={nomeFile}
          onAnnulla={annullaAnalisi}
        />
      )}

      {fase === "errore" && (
        <FaseErrore errore={errore} onAltroFile={scegli} onTorna={() => router.back()} />
      )}

      {fase === "controllo" && anteprima && (
        <>
          <Text style={styles.passo}>{t("importa.passo")}</Text>
          <ElencoControllo
            lista={lista}
            posizioni={posizioni}
            daSistemare={daSistemare}
            pronte={pronte}
            onCambiaSelezione={cambiaSelezione}
            onModifica={(indice) => apriModifica(indice, false)}
            onTogliPronte={togliPronte}
          />
          <PiedeImport
            selezionate={selezionate.length}
            totale={totale}
            mancanti={mancanti.length}
            erroreInvio={erroreInvio}
            onImporta={premiImporta}
          />
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
      <ConfirmDialog {...dialogoUscita} />
    </SafeAreaView>
    </FinestraComputer>
  );
}
