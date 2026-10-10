import { Pressable, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { IconaCategoria } from "@/components/IconaCategoria";
import { usePreferenze } from "@/utils/preferenze";
import { localeAttuale } from "@/utils/date";
import { nomeCategoria } from "@/utils/categorie";
import { useStili, useTema } from "@/utils/tema";
import { creaStili } from "@/styles/import-estratto.styles";
import type { Messaggio, RigaImport } from "@/utils/importEstratto";

// Una riga dell'estratto da controllare. Il messaggio ha sempre la stessa forma
// e lo stesso posto: cambiano solo colore e icona, e c'e' sempre il testo,
// perche' il colore da solo non basta a chi non lo distingue.

const ICONE: Record<Messaggio, keyof typeof MaterialCommunityIcons.glyphMap> = {
  categoria: "help-circle",
  rimborso_parziale: "undo-variant",
  rimborso_totale: "undo-variant",
  doppione: "content-copy",
  abbonamento: "autorenew",
  non_spesa: "information",
};

function giornoBreve(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(localeAttuale(), { day: "numeric", month: "short" });
}

type Props = {
  riga: RigaImport;
  separata: boolean;
  onCambiaSelezione: () => void;
  onModifica: () => void;
};

export function RigaImportata({ riga, separata, onCambiaSelezione, onModifica }: Props) {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const { importo } = usePreferenze();
  const { t } = useTranslation();

  const coloriMessaggio: Record<Messaggio, [string, string]> = {
    categoria: [colors.msgArancio, colors.msgArancioSoft],
    rimborso_parziale: [colors.primaryDark, colors.primarySoft],
    rimborso_totale: [colors.primaryDark, colors.primarySoft],
    doppione: [colors.msgBlu, colors.msgBluSoft],
    abbonamento: [colors.msgBlu, colors.msgBluSoft],
    non_spesa: [colors.textMuted, colors.surfaceAlt],
  };
  const meta = [riga.categoria_nome ? nomeCategoria(riga.categoria_nome) : null, giornoBreve(riga.data)]
    .filter(Boolean)
    .join(" · ");
  const testoMessaggio = riga.messaggio
    ? t(`importa.msg_${riga.messaggio}`, {
        importo: riga.rimborso_importo != null ? importo(riga.rimborso_importo) : "",
        data: riga.rimborso_data ? giornoBreve(riga.rimborso_data) : "",
      })
    : null;

  return (
    <View style={[styles.riga, separata && styles.rigaSeparata]}>
      <Pressable
        style={styles.casella}
        onPress={onCambiaSelezione}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: riga.selezionata }}
        accessibilityLabel={riga.nome}
      >
        <MaterialCommunityIcons
          name={riga.selezionata ? "checkbox-marked" : "checkbox-blank-outline"}
          size={24}
          color={riga.selezionata ? colors.primary : colors.textMuted}
        />
      </Pressable>
      {riga.categoria_id !== null ? (
        <IconaCategoria categoria={riga.categoria_nome} gruppo={riga.categoria_gruppo} dimensione={36} />
      ) : (
        <View style={styles.iconaSconosciuta}>
          <MaterialCommunityIcons name="help" size={20} color={colors.textOnPrimary} />
        </View>
      )}
      <View style={styles.rigaTesti}>
        <Text style={[styles.rigaNome, !riga.selezionata && styles.rigaNomeEsclusa]}>{riga.nome}</Text>
        <Text style={styles.rigaMeta}>{meta}</Text>
        {riga.messaggio && (
          <View style={[styles.messaggio, { backgroundColor: coloriMessaggio[riga.messaggio][1] }]}>
            <MaterialCommunityIcons name={ICONE[riga.messaggio]} size={14} color={coloriMessaggio[riga.messaggio][0]} />
            <Text style={[styles.messaggioTesto, { color: coloriMessaggio[riga.messaggio][0] }]}>{testoMessaggio}</Text>
          </View>
        )}
      </View>
      <View style={styles.importoColonna}>
        <Text style={[styles.importo, !riga.selezionata && styles.importoEscluso]}>−{importo(riga.importo)}</Text>
        {riga.importo_originale != null && <Text style={styles.importoPieno}>{importo(riga.importo_originale)}</Text>}
      </View>
      <Pressable style={styles.matita} onPress={onModifica} accessibilityRole="button" accessibilityLabel={t("comune.modifica")}>
        <MaterialCommunityIcons name="pencil" size={20} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}
