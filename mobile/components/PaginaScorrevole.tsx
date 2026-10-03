import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSpazioBarra } from "@/utils/barraSchede";

type Props = {
  children: ReactNode;
  //stile del contenuto (margini laterali, spazio in fondo): il margine in alto lo aggiunge il componente
  style?: StyleProp<ViewStyle>;
  //schermate con campi di testo: la pagina si accorcia quando compare la tastiera,
  //cosi' si puo' scorrere fino al pulsante invece di trovarlo coperto
  tastiera?: boolean;
  //schermate a schede: la barra galleggia sopra il fondo, l'ultima riga deve poterla superare
  sopraBarra?: boolean;
};

// Contenuto di una schermata che puo' scorrere. Con un paddingTop fisso di 60 e
// una View che non scorre, su telefoni bassi o con caratteri di sistema grandi
// la parte in fondo finiva sotto la barra delle schede o sotto la tastiera.
// Snackbar e finestre di dialogo restano fuori, fisse sullo schermo.
export function PaginaScorrevole({ children, style, tastiera = false, sopraBarra = false }: Props) {
  const insets = useSafeAreaInsets();
  const spazioBarra = useSpazioBarra();

  const pagina = (
    <ScrollView
      contentContainerStyle={[style, { paddingTop: insets.top + 16 }, sopraBarra && { paddingBottom: spazioBarra }]}
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
