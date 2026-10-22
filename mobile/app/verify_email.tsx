import { View } from "react-native";
import { Snackbar } from "react-native-paper";
import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { creaStili } from "@/styles/verify-email.styles";
import { useStili } from "@/utils/tema";
import { PaginaDivisa } from "@/components/PaginaDivisa";
import { ModuloVerifica } from "@/components/ModuloVerifica";

// Per chi si registra da /register: dalla landing il codice si chiede nella finestra di accesso
export default function VerifyEmail() {
  const styles = useStili(creaStili);
  const { email } = useLocalSearchParams<{ email: string }>();
  const [errorMessage, setErrorMessage] = useState("");
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  function mostraErrore(messaggio: string) {
    setErrorMessage(messaggio);
    setSnackbarVisible(true);
  }

  return (
    <PaginaDivisa>
      <View style={styles.pagina}>
        <ModuloVerifica email={email} onErrore={mostraErrore} />
        <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)}>
          {errorMessage}
        </Snackbar>
      </View>
    </PaginaDivisa>
  );
}
