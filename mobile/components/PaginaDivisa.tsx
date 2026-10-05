import type { ReactNode } from "react";
import { Image, View } from "react-native";
import { Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { SelettoreLingua } from "@/components/SelettoreLingua";
import { usePreferenze } from "@/utils/preferenze";
import { useSchermoLargo } from "@/utils/layout";
import { creaStili } from "@/styles/pagina-divisa.styles";
import { useStili } from "@/utils/tema";

const LOGO = require("../assets/images/logo/trackit-icon-rounded-180.png");

// Accesso, registrazione, verifica e recupero sul computer: a sinistra il verde
// del marchio, a destra il modulo. Il modulo largo quanto il monitor sarebbe
// scomodo, e una colonna stretta in mezzo al vuoto sembrerebbe un telefono
// appoggiato sullo schermo. Sul telefono non aggiunge niente.
//
// Logo e selettore della lingua stanno qui: le schermate li nascondono quando
// sono dentro la pagina divisa (useSchermoLargo), per non mostrarli due volte.
export function PaginaDivisa({ children }: { children: ReactNode }) {
  const styles = useStili(creaStili);
  const largo = useSchermoLargo();
  const { t } = useTranslation();
  const { importo } = usePreferenze();

  if (!largo) return <>{children}</>;

  return (
    <View style={styles.pagina}>
      <View style={styles.marchio}>
        <View style={[styles.cerchio, styles.cerchioGrande]} />
        <View style={[styles.cerchio, styles.cerchioPiccolo]} />
        <View style={styles.logoRiga}>
          <Image source={LOGO} style={styles.logo} accessibilityIgnoresInvertColors />
          <Text style={styles.nomeApp}>TrackIt</Text>
        </View>
        <View style={styles.messaggio}>
          <Text style={styles.titolo}>{t("presentazione.p1.titolo")}</Text>
          <Text style={styles.sottotitolo}>{t("presentazione.p1.testo")}</Text>
        </View>
        {/* un assaggio dell'app: la card che si vede appena entrati */}
        <View style={styles.card}>
          <View style={styles.cardRiga}>
            <Text style={styles.cardEtichetta}>{t("presentazione.p3.libero")}</Text>
          </View>
          <View style={styles.cardRiga}>
            <Text style={styles.cardImporto}>{importo(412.5)}</Text>
            <Text style={styles.cardTotale}>{t("presentazione.p3.di", { totale: importo(800) })}</Text>
          </View>
          <View style={styles.barra}>
            <View style={styles.barraPiena} />
          </View>
        </View>
      </View>

      <View style={styles.lato}>
        <View style={styles.lingua}>
          <SelettoreLingua />
        </View>
        <View style={styles.modulo}>{children}</View>
      </View>
    </View>
  );
}
