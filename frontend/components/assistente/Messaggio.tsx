import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { creaStili } from "@/styles/assistant.styles";
import { useStili, useTema } from "@/utils/tema";
import { usePreferenze } from "@/utils/preferenze";
import { fromDateString, localeAttuale } from "@/utils/date";
import { nomeCategoria } from "@/utils/categorie";
import { IconaCategoria } from "@/components/IconaCategoria";

export type ExpenseConfirmation = {
  id: number;
  description: string;
  amount: number;
  category_name: string | null;
  category_group: string | null;
  date: string;
  category_id:number | null;
  recurring: boolean;
  frequency: string | null;
  currency?: string | null; //riconosciuta nel testo ("40 sterline"), se diversa da quella dell'utente
};

//le spese lette dal server per rispondere: le sceglie il backend, non il modello
export type Fonte = {
  numero_spese: number;
  da: string;
  a: string;
  spese: { data: string; descrizione: string; importo: number }[]; //dalla piu' alta, al massimo 500
};

const BLOCCO = 15;

export type ChatMessage = {
  id: string;
  sender: "user" | "system";
  text?: string;
  examples?: string[]; //elenco sotto il testo, solo per il benvenuto
  expenseData?: ExpenseConfirmation;
  fonte?: Fonte | null; //solo nelle risposte che hanno letto delle spese
};

//"Da 4 spese · 1–30 set": chiusa una riga, toccata l'elenco delle spese
function RigaFonte({ fonte }: { fonte: Fonte }) {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const { importo } = usePreferenze();
  const { t } = useTranslation();
  const [aperta, setAperta] = useState(false);
  const [mostrate, setMostrate] = useState(BLOCCO);

  //l'anno solo se serve: "1 gen – 31 dic" di un altro anno sembrerebbe quest'anno
  const anno = fonte.da.slice(0, 4);
  const conAnno = anno !== fonte.a.slice(0, 4) || anno !== String(new Date().getFullYear());
  const giorno = (d: string) =>
    fromDateString(d).toLocaleDateString(localeAttuale(), {
      day: "numeric", month: "short", ...(conAnno && { year: "numeric" }),
    });
  const periodo = fonte.da === fonte.a ? giorno(fonte.da) : `${giorno(fonte.da)} – ${giorno(fonte.a)}`;
  const riassunto = [
    fonte.numero_spese ? t("assistente.daSpese", { count: fonte.numero_spese }) : t("assistente.nessunaSpesa"),
    periodo,
  ].join(" · ");
  const prossime = Math.min(BLOCCO, fonte.spese.length - mostrate);
  const apribile = fonte.spese.length > 0;

  return (
    <View>
      <Pressable
        style={styles.fonte}
        onPress={() => setAperta(!aperta)}
        disabled={!apribile}
        accessibilityRole="button"
        accessibilityLabel={`${t("assistente.fonteRisposta")}: ${riassunto}`}
        accessibilityState={{ expanded: aperta, disabled: !apribile }}
      >
        <MaterialCommunityIcons name="database-outline" size={16} color={colors.primary} />
        <Text style={styles.fonteTesto}>{riassunto}</Text>
        {apribile && (
          <MaterialCommunityIcons name={aperta ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} />
        )}
      </Pressable>
      {aperta && (
        <View style={styles.fonteElenco}>
          {fonte.spese.slice(0, mostrate).map((s, i) => (
            <View key={i} style={[styles.fonteRiga, i > 0 && styles.fonteRigaBordo]}>
              <Text style={styles.fonteData}>{giorno(s.data)}</Text>
              <Text style={styles.fonteDescrizione} numberOfLines={1}>{s.descrizione}</Text>
              <Text style={styles.fonteImporto}>{importo(s.importo)}</Text>
            </View>
          ))}
          {prossime > 0 && (
            <Pressable
              style={[styles.fonteRiga, styles.fonteRigaBordo]}
              onPress={() => setMostrate(mostrate + BLOCCO)}
              accessibilityRole="button"
            >
              <Text style={[styles.fonteTesto, { color: colors.primary }]}>
                {t("assistente.mostraAltre", { count: prossime })}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={18} color={colors.primary} />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

//icona, descrizione, categoria e data, importo: uguale nella spesa da
//confermare e in quella salvata, che cosi' si riconosce come la stessa
export function CorpoSpesa({ spesa }: { spesa: ExpenseConfirmation }) {
  const styles = useStili(creaStili);
  const { importoIn } = usePreferenze();
  const { t } = useTranslation();
  const frequenza = (f: string | null) => t(`frequenze.${f ?? "monthly"}`);

  return (
    <View style={styles.savedBody}>
      <IconaCategoria categoria={spesa.category_name} gruppo={spesa.category_group} dimensione={36} />
      <View style={styles.savedInfo}>
        <Text style={styles.savedDescription} numberOfLines={1}>
          {spesa.description}
        </Text>
        <Text style={styles.savedMeta}>
          {nomeCategoria(spesa.category_name)}
          {" · "}
          {spesa.recurring
            ? frequenza(spesa.frequency)
            : fromDateString(spesa.date).toLocaleDateString(localeAttuale())}
        </Text>
      </View>
      <Text style={styles.savedAmount}>{importoIn(spesa.amount, spesa.currency)}</Text>
    </View>
  );
}

//un messaggio della chat: una bolla di testo, o la card di una spesa salvata
export function Messaggio({ item }: { item: ChatMessage }) {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const { t } = useTranslation();

  if (item.expenseData) {
    return (
      //card di esito: dice chiaramente che il salvataggio è andato a buon fine
      <View style={styles.savedCard}>
        <View style={styles.savedHeader}>
          <MaterialCommunityIcons name="check-circle" size={20} color={colors.primary} />
          <Text style={styles.savedTitle}>
            {item.expenseData.recurring ? t("assistente.abbonamentoAggiunto") : t("assistente.spesaAggiunta")}
          </Text>
        </View>
        <CorpoSpesa spesa={item.expenseData} />
      </View>
    );
  }
  return (
    <View
      style={[
        styles.messageBubble,
        item.sender === "user" ? styles.userBubble : styles.systemBubble,
        item.fonte && styles.conFonte,
      ]}
    >
      <Text style={item.sender === "user" ? styles.userText : styles.systemText}>
        {item.text}
      </Text>
      {item.examples && (
        <View style={styles.examples}>
          <Text style={styles.examplesLabel}>{t("assistente.perEsempio")}</Text>
          {item.examples.map((esempio) => (
            <Text key={esempio} style={styles.example}>“{esempio}”</Text>
          ))}
        </View>
      )}
      {item.fonte && <RigaFonte fonte={item.fonte} />}
    </View>
  );
}
