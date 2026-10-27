import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSpazioBarra } from "@/utils/barraSchede";
import { LARGHEZZA_CONTENUTO, useSchermoLargo } from "@/utils/layout";

type Props = {
  children: ReactNode;
  //stile del contenuto (margini laterali, spazio in fondo): il margine in alto lo aggiunge il componente
  style?: StyleProp<ViewStyle>;
  //schermate con campi di testo: la pagina si accorcia quando compare la tastiera,
  //cosi' si puo' scorrere fino al pulsante invece di trovarlo coperto
  tastiera?: boolean;
  //schermate a schede: la barra galleggia sopra il fondo, l'ultima riga deve poterla superare
  sopraBarra?: boolean;
  //sul computer il contenuto sta a meta' altezza: un modulo corto in cima a
  //una pagina alta lascerebbe tutto il vuoto sotto
  centrata?: boolean;
};

// Contenuto di una schermata che puo' scorrere. Con un paddingTop fisso di 60 e
// una View che non scorre, su telefoni bassi o con caratteri di sistema grandi
// la parte in fondo finiva sotto la barra delle schede o sotto la tastiera.
// Snackbar e finestre di dialogo restano fuori, fisse sullo schermo.
export function PaginaScorrevole({ children, style, tastiera = false, sopraBarra = false, centrata = false }: Props) {
  const insets = useSafeAreaInsets();
  const spazioBarra = useSpazioBarra();
  //sul computer il contenuto sta in una colonna centrata, con margini piu' ampi
  const largo = useSchermoLargo();

  const pagina = (
    <ScrollView
      contentContainerStyle={[
        style,
        { paddingTop: insets.top + 16 },
        sopraBarra && { paddingBottom: spazioBarra },
        largo && { width: "100%", maxWidth: LARGHEZZA_CONTENUTO + 80, alignSelf: "center", paddingHorizontal: 40, paddingTop: 32 },
        largo && centrata && { flexGrow: 1, justifyContent: "center" },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );

  if (!tastiera) return pagina;
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      {pagina}
    </KeyboardAvoidingView>
  );
}
