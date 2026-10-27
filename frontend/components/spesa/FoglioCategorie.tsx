import { useMemo } from "react";
import { Modal, Pressable, SectionList, View } from "react-native";
import { Text, IconButton, Searchbar } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { creaStili, coloriSpesa } from "@/styles/add-expense.styles";
import { useStili, useTema } from "@/utils/tema";
import { useSchermoLargo } from "@/utils/layout";
import { iconaPerGruppo } from "@/utils/categoryIcons";
import { nomeCategoria } from "@/utils/categorie";
import { IconaCategoria } from "@/components/IconaCategoria";

export type Category = {
  id: number;
  name: string;
  keywords: string | null;
  parent_id: number | null;
};

//le categorie sono a due livelli: i gruppi fanno da intestazione e non sono
//selezionabili, si sceglie sempre una sottocategoria
export type CategoryGroup = {
  id: number;
  name: string;
  children: Category[];
};

//"Caffè" va trovato anche digitando "caffe": togliamo accenti e maiuscole
function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

//il foglio (sul computer la finestra) per scegliere la categoria, con la ricerca
export function FoglioCategorie({ visible, categories, scelta, onScegli, cerca, onCerca, onChiudi }: {
  visible: boolean;
  categories: CategoryGroup[];
  scelta: Category | null;
  onScegli: (categoria: Category) => void;
  //la ricerca sta nella schermata: si azzera alla chiusura, anche con Esc
  cerca: string;
  onCerca: (testo: string) => void;
  onChiudi: () => void;
}) {
  const styles = useStili(creaStili);
  const { colors: tokens } = useTema();
  const colors = useMemo(() => coloriSpesa(tokens), [tokens]);
  const { t } = useTranslation();
  const largo = useSchermoLargo();
  //il foglio e' una Modal, fuori dalla SafeAreaView: senza questo l'ultima
  //voce finiva sotto la barra dei gesti dell'iPhone
  const { bottom: margineSotto } = useSafeAreaInsets();

  //si cerca nel nome tradotto e in quello italiano, nel gruppo ("casa" trova
  //le bollette) e nelle parole chiave del server ("netflix" trova Abbonamenti digitali)
  const sezioniCategorie = useMemo(() => {
    const q = normalize(cerca.trim());
    return categories
      .map((gruppo) => {
        const nelGruppo =
          normalize(gruppo.name).includes(q) || normalize(nomeCategoria(gruppo.name)).includes(q);
        return {
          title: gruppo.name,
          data: !q || nelGruppo
            ? gruppo.children
            : gruppo.children.filter(
                (c) =>
                  normalize(c.name).includes(q) ||
                  normalize(nomeCategoria(c.name)).includes(q) ||
                  normalize(c.keywords ?? "").includes(q)
              ),
        };
      })
      .filter((sezione) => sezione.data.length > 0);
  }, [categories, cerca]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType={largo ? "fade" : "slide"}
      onRequestClose={onChiudi}
    >
      <Pressable style={[styles.modalOverlay, largo && styles.modalOverlayLargo]} onPress={onChiudi}>
        {/* il Pressable interno intercetta il tap così non chiude il foglio */}
        <Pressable
          style={[styles.modalSheet, !largo && { paddingBottom: Math.max(28, margineSotto + 12) }, largo && styles.modalSheetLargo]}
          onPress={() => {}}
        >
          {/* la maniglia dice "foglio" sul telefono; sul computer e' una finestra */}
          {!largo && <View style={styles.maniglia} />}
          <View style={styles.modalIntestazione}>
            <Text variant="titleMedium" style={styles.modalTitle}>
              {t("spesa.selezionaCategoria")}
            </Text>
            <IconButton
              icon="close"
              size={22}
              mode="contained-tonal"
              containerColor={colors.surfaceAlt}
              iconColor={colors.text}
              onPress={onChiudi}
              accessibilityLabel={t("comune.chiudi")}
              style={styles.modalChiudi}
            />
          </View>
          {/* sul computer si scrive subito; sul telefono la tastiera coprirebbe l'elenco */}
          <Searchbar
            placeholder={t("spesa.cercaCategoria")}
            value={cerca}
            onChangeText={onCerca}
            autoFocus={largo}
            style={styles.categorySearch}
            inputStyle={styles.categorySearchInput}
          />
          <SectionList
            sections={sezioniCategorie}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(item) => item.id.toString()}
            stickySectionHeadersEnabled
            renderSectionHeader={({ section }) => (
              //il gruppo è solo un'intestazione: non è selezionabile
              <View style={styles.categoryGroupHeader}>
                <MaterialCommunityIcons
                  name={iconaPerGruppo(section.title) as any}
                  size={16}
                  color={colors.label}
                />
                <Text style={styles.categoryGroupTitle}>{nomeCategoria(section.title)}</Text>
              </View>
            )}
            renderItem={({ item, section }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.categoryRow,
                  scelta?.id === item.id && styles.categoryRowScelta,
                  pressed && styles.categoryRowPremuta,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: scelta?.id === item.id }}
                onPress={() => onScegli(item)}
              >
                <IconaCategoria categoria={item.name} gruppo={section.title} dimensione={34} />
                <Text
                  style={[
                    styles.categoryRowText,
                    scelta?.id === item.id && styles.categoryRowSelected,
                  ]}
                >
                  {nomeCategoria(item.name)}
                </Text>
                {scelta?.id === item.id && (
                  <MaterialCommunityIcons name="check-circle" size={22} color={colors.green} />
                )}
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={styles.categoryEmpty}>
                {cerca.trim()
                  ? t("spesa.nessunaCategoriaTrovata", { testo: cerca.trim() })
                  : t("spesa.nessunaCategoria")}
              </Text>
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
