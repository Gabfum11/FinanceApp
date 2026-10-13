import { View } from "react-native";
import { IconButton, Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { creaStili } from "@/styles/all_expenses.styles";
import { useStili } from "@/utils/tema";
import { usePreferenze } from "@/utils/preferenze";
import { nomeCategoria } from "@/utils/categorie";
import { IconaCategoria } from "@/components/IconaCategoria";

export type Expense = {
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

type Azioni = { onModifica: () => void; onElimina: () => void };

//l'importo, e sotto la cifra pagata se era in un'altra valuta
function Importo({ item }: { item: Expense }) {
  const styles = useStili(creaStili);
  const { importo, importoIn } = usePreferenze();
  return (
    <>
      <Text style={styles.expenseAmount}>−{importo(item.amount)}</Text>
      {item.original_currency && item.original_amount != null && (
        <Text style={styles.expenseOriginal}>{importoIn(item.original_amount, item.original_currency)}</Text>
      )}
    </>
  );
}

//sul telefono: le spese dello stesso giorno formano un riquadro solo, divise da una linea
export function RigaSpesa({ item, prima, ultima, onModifica, onElimina }: { item: Expense; prima: boolean; ultima: boolean } & Azioni) {
  const styles = useStili(creaStili);
  const { t } = useTranslation();

  return (
    <View style={[
      styles.expenseRow,
      prima && styles.expenseRowPrima,
      !prima && styles.expenseRowSeparata,
      ultima && styles.expenseRowUltima,
    ]}>
      {/* l'icona rende la lista scansionabile senza leggere */}
      <IconaCategoria categoria={item.category_name} gruppo={item.category_group} />
      <View style={styles.expenseInfo}>
        <Text style={styles.expenseDescription}>{item.description}</Text>
        {/* la data e' gia' nell'intestazione del giorno */}
        <Text style={styles.expenseMeta}>{nomeCategoria(item.category_name)}</Text>
      </View>
      <View style={styles.amountColumn}>
        <Importo item={item} />
      </View>
      {/* sempre visibili: si deve capire subito che la spesa si puo' modificare o eliminare */}
      <IconButton icon="pencil-outline" size={18} onPress={onModifica} accessibilityLabel={t("spese.modifica")} style={styles.azioneRiga} />
      <IconButton icon="trash-can-outline" size={18} onPress={onElimina} accessibilityLabel={t("spese.elimina")} style={styles.azioneRiga} />
    </View>
  );
}

//sul computer: una riga di tabella, ogni dato nella sua colonna
export function RigaTabella({ item, onModifica, onElimina }: { item: Expense } & Azioni) {
  const styles = useStili(creaStili);
  const { t } = useTranslation();

  return (
    <View style={styles.rigaTabella}>
      <View style={styles.colonnaIcona}>
        <IconaCategoria categoria={item.category_name} gruppo={item.category_group} dimensione={34} />
      </View>
      <Text style={[styles.expenseDescription, styles.colonnaDescrizione]} numberOfLines={1}>{item.description}</Text>
      <Text style={[styles.expenseMeta, styles.colonnaCategoria]} numberOfLines={1}>{nomeCategoria(item.category_name)}</Text>
      <View style={[styles.amountColumn, styles.colonnaImporto]}>
        <Importo item={item} />
      </View>
      <View style={[styles.azioni, styles.colonnaAzioni]}>
        <IconButton icon="pencil-outline" size={18} onPress={onModifica} accessibilityLabel={t("spese.modifica")} />
        <IconButton icon="trash-can-outline" size={18} onPress={onElimina} accessibilityLabel={t("spese.elimina")} />
      </View>
    </View>
  );
}

//i titoli delle colonne, sopra la tabella del computer
export function IntestazioneTabella() {
  const styles = useStili(creaStili);
  const { t } = useTranslation();

  return (
    <View style={styles.intestazioneTabella}>
      <View style={styles.colonnaIcona} />
      <Text style={[styles.intestazioneColonna, styles.colonnaDescrizione]}>{t("spese.colonnaDescrizione")}</Text>
      <Text style={[styles.intestazioneColonna, styles.colonnaCategoria]}>{t("spese.colonnaCategoria")}</Text>
      <Text style={[styles.intestazioneColonna, styles.colonnaImporto]}>{t("spese.colonnaImporto")}</Text>
      <View style={styles.colonnaAzioni} />
    </View>
  );
}
