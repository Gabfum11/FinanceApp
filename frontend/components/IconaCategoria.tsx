import { View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colorePerGruppo, iconaPerCategoria } from "@/utils/categoryIcons";

// Cerchio pieno del colore del gruppo con l'icona bianca al centro: lo stesso
// colore della ciambella nelle statistiche, cosi' una categoria si riconosce
// uguale in tutta l'app. Prima ogni schermata disegnava la sua icona verde su
// fondo verde tenue, e le categorie si distinguevano solo leggendo.

/** Luminanza relativa di un colore "#RRGGBB" (formula WCAG). */
function luminanza(esadecimale: string): number {
  const canali = [1, 3, 5].map((i) => {
    const c = parseInt(esadecimale.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.045) / 1.055) ** 2.4;
  });
  return 0.2126 * canali[0] + 0.7152 * canali[1] + 0.0722 * canali[2];
}

type Props = {
  /** sottocategoria: se ha un'icona propria vince su quella del gruppo */
  categoria?: string | null;
  /** gruppo: da' il colore del cerchio e l'icona di ripiego */
  gruppo?: string | null;
  /** diametro del cerchio */
  dimensione?: number;
};

export function IconaCategoria({ categoria, gruppo, dimensione = 38 }: Props) {
  return (
    <IconaCerchio
      icona={iconaPerCategoria(categoria, gruppo)}
      sfondo={colorePerGruppo(gruppo)}
      dimensione={dimensione}
    />
  );
}

/** Lo stesso cerchio pieno con un'icona qualsiasi: le voci del profilo lo
 *  usano perche' si riconoscano a colpo d'occhio come le categorie. */
export function IconaCerchio({ icona, sfondo, dimensione = 38 }: { icona: string; sfondo: string; dimensione?: number }) {
  //sui colori chiari (il giallo di Acquisti) il bianco non si vedrebbe:
  //icona scura, come il testo nero sulla pillola gialla dell'assistente
  const colore = luminanza(sfondo) > 0.5 ? "#1A1A1A" : "#FFFFFF";
  return (
    <View
      //decorativa: accanto c'e' sempre il nome della categoria
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: dimensione,
        height: dimensione,
        borderRadius: dimensione / 2,
        backgroundColor: sfondo,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <MaterialCommunityIcons
        name={icona as any}
        size={Math.round(dimensione * 0.55)}
        color={colore}
        //senza, il carattere dell'icona eredita l'interlinea del testo e sul
        //web scende di qualche punto rispetto al centro del cerchio
        style={{ lineHeight: Math.round(dimensione * 0.55), textAlign: "center" }}
      />
    </View>
  );
}
