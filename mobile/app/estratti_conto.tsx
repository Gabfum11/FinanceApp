import { router, useFocusEffect } from "expo-router";
import { FlatList, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton, Snackbar, Text } from "react-native-paper";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { creaStili as creaStiliSpese } from "@/styles/all_expenses.styles";
import { creaStili } from "@/styles/estratti_conto.styles";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PulsanteEliminaSpese } from "@/components/importa/PulsanteEliminaSpese";
import { annullaImport, elencoEstratti, giornoCaricamento, type Estratto } from "@/utils/importEstratto";
import { fromDateString, localeAttuale } from "@/utils/date";
import { usePreferenze } from "@/utils/preferenze";
import { useStili } from "@/utils/tema";
import { LARGHEZZA_CONTENUTO, useSchermoLargo } from "@/utils/layout";

// Gli estratti conto caricati, uno per card: da qui si vedono le loro spese o
// si eliminano tutte insieme, anche dopo che l'avviso dell'import e' sparito.

function giorno(data: string): string {
  return fromDateString(data).toLocaleDateString(localeAttuale(), { day: "numeric", month: "long" });
}

export default function EstrattiConto() {
  const stiliSpese = useStili(creaStiliSpese);
  const styles = useStili(creaStili);
  const { t } = useTranslation();
  const { importo } = usePreferenze();
  const insets = useSafeAreaInsets();
  const largo = useSchermoLargo();
  //null finche' non arriva la prima risposta: niente "nessun estratto" in anticipo
  const [estratti, setEstratti] = useState<Estratto[] | null>(null);
  const [daEliminare, setDaEliminare] = useState<Estratto | null>(null);
  const [avviso, setAvviso] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      elencoEstratti().then((elenco) => (elenco ? setEstratti(elenco) : setAvviso(t("errori.rete"))));
    }, [t]),
  );

  async function elimina(estratto: Estratto) {
    setDaEliminare(null);
    if (await annullaImport(estratto.codice)) {
      setEstratti((prima) => prima?.filter((e) => e.codice !== estratto.codice) ?? null);
      setAvviso(t("estratti.eliminate"));
    } else {
      setAvviso(t("importa.erroreAnnulla"));
    }
  }

  return (
    <View style={[stiliSpese.container, largo && stiliSpese.containerLargo, largo && { maxWidth: LARGHEZZA_CONTENUTO + 80 }]}>
      <View style={[stiliSpese.header, { paddingTop: insets.top + 8 }]}>
        <IconButton icon="chevron-left" onPress={() => router.back()} />
        <Text variant="titleMedium">{t("estratti.titolo")}</Text>
        <View style={stiliSpese.headerSpacer} />
      </View>

      <FlatList
        data={estratti ?? []}
        keyExtractor={(e) => e.codice}
        contentContainerStyle={styles.lista}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cima}>
              <Text style={styles.quando}>{giornoCaricamento(item.caricato_il, true)}</Text>
              <Text style={styles.totale}>{importo(item.totale)}</Text>
            </View>
            <Text style={styles.dettagli}>
              {t("spese.conteggio", { count: item.spese })} · {t("estratti.periodo", { dal: giorno(item.dal), al: giorno(item.al) })}
            </Text>
            <View style={styles.azioni}>
              <Pressable
                style={({ pressed }) => [styles.pulsante, styles.vedi, pressed && styles.premuto]}
                onPress={() =>
                  router.push({
                    pathname: "/all_expenses",
                    params: { estratto: item.codice, caricato: item.caricato_il },
                  })
                }
                accessibilityRole="button"
              >
                <Text style={styles.vediTesto}>{t("estratti.vediSpese")}</Text>
              </Pressable>
              <PulsanteEliminaSpese onPress={() => setDaEliminare(item)} />
            </View>
          </View>
        )}
        ListEmptyComponent={
          estratti === null ? null : (
            <View style={stiliSpese.emptyState}>
              <Text style={stiliSpese.emptyTitle}>{t("estratti.nessuno")}</Text>
            </View>
          )
        }
      />

      <Snackbar visible={avviso !== null} onDismiss={() => setAvviso(null)}>
        {avviso}
      </Snackbar>

      <ConfirmDialog
        visible={daEliminare !== null}
        title={t("estratti.eliminaTitolo", { count: daEliminare?.spese ?? 0 })}
        message={
          daEliminare
            ? t("estratti.eliminaTesto", { data: giornoCaricamento(daEliminare.caricato_il), totale: importo(daEliminare.totale) })
            : ""
        }
        confirmLabel={t("comune.elimina")}
        destructive
        icon="trash-can"
        onConfirm={() => daEliminare && elimina(daEliminare)}
        onDismiss={() => setDaEliminare(null)}
      />
    </View>
  );
}
