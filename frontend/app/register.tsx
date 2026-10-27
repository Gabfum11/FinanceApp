import { useState } from "react";
import { View, Image } from "react-native";
import { Text, Snackbar } from "react-native-paper";
import { creaStili } from "../styles/auth.styles";
import { PaginaScorrevole } from "@/components/PaginaScorrevole";
import { useStili } from "@/utils/tema";
import { PaginaDivisa } from "@/components/PaginaDivisa";
import { TornaAllaLanding } from "@/components/TornaAllaLanding";
import { ModuloRegistrazione } from "@/components/ModuliAccesso";
import { useSchermoLargo } from "@/utils/layout";

export default function RegisterScreen() {
  const styles = useStili(creaStili);
  //sul computer il logo sta nel pannello verde della pagina divisa
  const largo = useSchermoLargo();
    const [errorMessage, setErrorMessage] = useState("");
    const [snackbarVisible, setSnackbarVisible] = useState(false);

    function mostraErrore(messaggio: string) {
        setErrorMessage(messaggio);
        setSnackbarVisible(true);
    }

    return (
        <PaginaDivisa indietro>
        <View style={styles.container}>
            <PaginaScorrevole style={styles.content} tastiera centrata>
                {!largo && <TornaAllaLanding />}
                {!largo && (
                <View style={styles.logoContainer}>
                    <Image source={require("../assets/images/logo/trackit-icon-rounded-180.png")} style={styles.logo} />
                    <Text style={styles.logoLabel}>TrackIt</Text>
                </View>
                )}
                <ModuloRegistrazione onErrore={mostraErrore} />
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
