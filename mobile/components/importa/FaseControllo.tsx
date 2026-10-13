import { type RefObject } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useStili, useTema } from "@/utils/tema";
import { creaStili } from "@/styles/import-estratto.styles";
import { usePreferenze } from "@/utils/preferenze";
import { RigaImportata } from "@/components/RigaImportata";
import type { RigaImport } from "@/utils/importEstratto";

//le righe lette dal file, divise tra quelle da sistemare e quelle pronte
export function ElencoControllo({ lista, posizioni, daSistemare, pronte, onCambiaSelezione, onModifica, onTogliPronte }: {
  //la schermata scorre la lista fino alla prima riga da sistemare
  lista: RefObject<ScrollView | null>;
  //posizione verticale di ogni riga da sistemare
  posizioni: RefObject<Map<number, number>>;
  daSistemare: RigaImport[];
  pronte: RigaImport[];
  onCambiaSelezione: (indice: number) => void;
  onModifica: (indice: number) => void;
  onTogliPronte: () => void;
}) {
  const styles = useStili(creaStili);
  const { t } = useTranslation();

  return (
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
                  onCambiaSelezione={() => onCambiaSelezione(r.indice)}
                  onModifica={() => onModifica(r.indice)}
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
            <Text style={styles.sezioneAzione} onPress={onTogliPronte} accessibilityRole="button">
              {t("importa.togliTutte")}
            </Text>
          </View>
          <View style={styles.lista}>
            {pronte.map((r, i) => (
              <RigaImportata
                key={r.indice}
                riga={r}
                separata={i > 0}
                onCambiaSelezione={() => onCambiaSelezione(r.indice)}
                onModifica={() => onModifica(r.indice)}
              />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

//in fondo: quante righe e quanto, e il pulsante che importa o porta alla prima da sistemare
export function PiedeImport({ selezionate, totale, mancanti, erroreInvio, onImporta }: {
  selezionate: number;
  totale: number;
  mancanti: number;
  erroreInvio: boolean;
  onImporta: () => void;
}) {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const { importo } = usePreferenze();
  const { t } = useTranslation();

  return (
    <View style={styles.piede}>
      <View style={styles.piedeRiga}>
        <Text style={styles.piedeTesto}>{t("importa.selezionate", { count: selezionate })}</Text>
        <Text style={styles.piedeTotale}>{importo(totale)}</Text>
      </View>
      {erroreInvio && <Text style={[styles.piedeTesto, { color: colors.msgArancio }]}>{t("importa.erroreConferma")}</Text>}
      <Pressable
        style={({ pressed }) => [styles.pulsante, mancanti > 0 && styles.pulsanteBloccato, pressed && styles.premuto]}
        onPress={onImporta}
        disabled={selezionate === 0}
        accessibilityRole="button"
      >
        {mancanti > 0 && <MaterialCommunityIcons name="help-circle" size={18} color={colors.msgArancio} />}
        <Text style={[styles.pulsanteTesto, mancanti > 0 && styles.pulsanteBloccatoTesto]}>
          {mancanti > 0
            ? t("importa.pulsanteBloccato", { count: mancanti })
            : t("importa.pulsanteImporta", { count: selezionate })}
        </Text>
      </Pressable>
    </View>
  );
}
