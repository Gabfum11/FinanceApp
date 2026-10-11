import { useState } from "react";
import { View, Image } from "react-native";
import { Text, Snackbar } from "react-native-paper";
import { creaStili } from "../styles/auth.styles";
import { PaginaScorrevole } from "@/components/PaginaScorrevole";
import { SelettoreLingua } from "@/components/SelettoreLingua";
import { useStili } from "@/utils/tema";
import { PaginaDivisa } from "@/components/PaginaDivisa";
import { TornaAllaLanding } from "@/components/TornaAllaLanding";
import { ModuloAccesso } from "@/components/ModuliAccesso";
import { useSchermoLargo } from "@/utils/layout";


export default function LoginScreen() {
  const styles = useStili(creaStili);
  //sul computer logo e lingua stanno nel pannello verde della pagina divisa
  const largo = useSchermoLargo();
  const [errorMessage, setErrorMessage] = useState("");
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  function mostraErrore(messaggio: string) {
    setErrorMessage(messaggio);
    setSnackbarVisible(true);
  }

  return (
    <PaginaDivisa indietro>
    <View style={styles.container}>{/*container di tutta la schermata*/}
      <PaginaScorrevole style={styles.content} tastiera centrata>
        {/* la lingua per chi ha saltato la presentazione o torna dopo un logout */}
        {!largo && (
          <View style={styles.barraAlta}>
            <TornaAllaLanding />
            <View style={styles.selettore}>
              <SelettoreLingua />
            </View>
          </View>
        )}
        {!largo && (
        <View style={styles.logoContainer}>
          <Image source={require("../assets/images/logo/trackit-icon-rounded-180.png")} style={styles.logo} />
          <Text style={styles.logoLabel}>TrackIt</Text>
        </View>
        )}
        <ModuloAccesso onErrore={mostraErrore} />
      </PaginaScorrevole>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
      >
        {errorMessage}
      </Snackbar>
    </View>
    </PaginaDivisa>
  );
}
