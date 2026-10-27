import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import { Searchbar, Switch, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { IconaCategoria } from "@/components/IconaCategoria";
import { nomeCategoria } from "@/utils/categorie";
import { usePreferenze } from "@/utils/preferenze";
import { localeAttuale } from "@/utils/date";
import { useStili, useTema } from "@/utils/tema";
import { creaStili } from "@/styles/import-estratto.styles";
import type { RigaImport } from "@/utils/importEstratto";

// Il foglio della matita: nome e categoria si cambiano, data e importo no
// (arrivano dalla banca). Il testo della banca sta in cima, intero: e' quello
// che fa ricordare cos'era ("ah, e' la palestra").

export type Gruppo = { id: number; name: string; children: { id: number; name: string }[] };
export type CategoriaScelta = { id: number; name: string; gruppo: string };

type Props = {
  riga: RigaImport;
  /** quante altre righe selezionate hanno lo stesso esercente */
  altreStesso: number;
  /** aperto dal pulsante arancio: il salvataggio passa alla riga successiva */
  inFila: boolean;
  posizione: number;
  totaleInFila: number;
  gruppi: Gruppo[];
  onSalva: (nome: string, categoria: CategoriaScelta | null, applicaAgliAltri: boolean) => void;
  onChiudi: () => void;
};

function categoriaDellaRiga(riga: RigaImport): CategoriaScelta | null {
  return riga.categoria_id !== null && riga.categoria_nome
    ? { id: riga.categoria_id, name: riga.categoria_nome, gruppo: riga.categoria_gruppo ?? "" }
    : null;
}

export function FoglioModificaImport({ riga, altreStesso, inFila, posizione, totaleInFila, gruppi, onSalva, onChiudi }: Props) {
  const styles = useStili(creaStili);
  const { colors } = useTema();
  const { importo } = usePreferenze();
  const { t } = useTranslation();
  const [nome, setNome] = useState(riga.nome);
  const [categoria, setCategoria] = useState<CategoriaScelta | null>(categoriaDellaRiga(riga));
  const [applica, setApplica] = useState(true);
  const [scegliendo, setScegliendo] = useState(false);
  const [cerca, setCerca] = useState("");

  //ogni riga riparte dai suoi valori: in fila il foglio resta aperto e cambia riga
  useEffect(() => {
    setNome(riga.nome);
    setCategoria(categoriaDellaRiga(riga));
    setScegliendo(false);
    setCerca("");
  }, [riga.indice]);

  const filtrati = useMemo(() => {
    const q = cerca.trim().toLowerCase();
    if (!q) return gruppi;
    return gruppi
      .map((g) => ({ ...g, children: g.children.filter((c) => nomeCategoria(c.name).toLowerCase().includes(q)) }))
      .filter((g) => g.children.length > 0);
  }, [gruppi, cerca]);

  const data = new Date(`${riga.data}T00:00:00`).toLocaleDateString(localeAttuale(), {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onChiudi}>
      <Pressable style={styles.velo} onPress={onChiudi} accessibilityLabel={t("comune.chiudi")}>
        {/* un tocco dentro il foglio non deve chiuderlo */}
        <Pressable style={styles.foglio} onPress={() => {}}>
          <View style={styles.maniglia} />
          {scegliendo ? (
            <>
              <Searchbar placeholder={t("importa.categoria")} value={cerca} onChangeText={setCerca} />
              <ScrollView>
                {filtrati.map((g) => (
                  <View key={g.id}>
                    <Text style={styles.gruppoTitolo}>{nomeCategoria(g.name)}</Text>
                    {g.children.map((c) => (
                      <Pressable
                        key={c.id}
                        style={styles.voce}
                        onPress={() => {
                          setCategoria({ id: c.id, name: c.name, gruppo: g.name });
                          setScegliendo(false);
                        }}
                        accessibilityRole="button"
                      >
                        <IconaCategoria categoria={c.name} gruppo={g.name} dimensione={32} />
                        <Text style={styles.voceTesto}>{nomeCategoria(c.name)}</Text>
                        {categoria?.id === c.id && <MaterialCommunityIcons name="check" size={20} color={colors.primaryDark} />}
                      </Pressable>
                    ))}
                  </View>
                ))}
              </ScrollView>
            </>
          ) : (
            <ScrollView contentContainerStyle={{ gap: 12 }}>
              <View style={styles.campo}>
                <Text style={styles.etichetta}>{t("importa.testoBanca")}</Text>
                <Text style={styles.testoBanca} selectable>{riga.testo}</Text>
              </View>
              <View style={styles.campo}>
                <Text style={styles.etichetta}>{t("importa.nome")}</Text>
                <TextInput style={styles.input} value={nome} onChangeText={setNome} maxLength={100} accessibilityLabel={t("importa.nome")} />
              </View>
              <View style={styles.campo}>
                <Text style={styles.etichetta}>{t("importa.categoria")}</Text>
                <Pressable style={styles.input} onPress={() => setScegliendo(true)} accessibilityRole="button">
                  <Text style={{ color: categoria ? colors.text : colors.msgArancio }}>
                    {categoria ? nomeCategoria(categoria.name) : t("importa.msg_categoria")}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textMuted} />
                </Pressable>
              </View>
              <View style={styles.dueCampi}>
                <View style={[styles.campo, { flex: 1 }]}>
                  <Text style={styles.etichetta}>{t("importa.data")}</Text>
                  <View style={styles.input}><Text style={styles.inputSolaLettura}>{data}</Text></View>
                </View>
                <View style={[styles.campo, { flex: 1 }]}>
                  <Text style={styles.etichetta}>{t("importa.importo")}</Text>
                  <View style={styles.input}><Text style={styles.inputSolaLettura}>−{importo(riga.importo)}</Text></View>
                </View>
              </View>
              {altreStesso > 0 && (
                <View style={styles.interruttore}>
                  <Text style={styles.interruttoreTesto}>
                    {t("importa.stessaCategoria", { count: altreStesso, nome: nome.trim() || riga.nome })}
                  </Text>
                  <Switch value={applica} onValueChange={setApplica} />
                </View>
              )}
              <Pressable
                style={({ pressed }) => [styles.pulsante, pressed && styles.premuto]}
                onPress={() => onSalva(nome.trim() || riga.nome, categoria, applica && altreStesso > 0)}
                accessibilityRole="button"
              >
                <Text style={styles.pulsanteTesto}>
                  {inFila && totaleInFila > 1
                    ? t("importa.salvaProssima", { n: posizione, totale: totaleInFila })
                    : t("comune.salva")}
                </Text>
              </Pressable>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
