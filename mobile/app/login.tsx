import { useState } from "react";
import { View, Image } from "react-native";
import { TextInput, Button, Text, Snackbar } from "react-native-paper";
import {styles} from "../styles/auth.styles";
import { Link } from "expo-router";
import { API_URL, PRIVACY_URL } from "@/config";
import { salvaSessione } from "@/utils/session"; //salva i token in modo persistente al riavvio dell'app
import { useRouter } from "expo-router";
import { useGoogleLogin } from "@/utils/useGoogleLogin";
import { GoogleButton } from "@/components/GoogleButton";
import { messaggioErrore } from "@/utils/messaggioErrore";
import * as WebBrowser from "expo-web-browser";
import { PaginaScorrevole } from "@/components/PaginaScorrevole";
import { SelettoreLingua } from "@/components/SelettoreLingua";
import { useTranslation } from "react-i18next";


export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [showPassword, setShowPassword]=useState(false)
  const router=useRouter();
  const { t } = useTranslation();
  const google = useGoogleLogin({
    onSuccess: () => router.replace("/(tabs)/home"),
    onError: (message) => {
      setErrorMessage(message);
      setSnackbarVisible(true);
    },
  });
 async function handleLogin() {
  try {
    setLoading(true);
    const response = await fetch(`${API_URL}/auth/login`, { //apiurl serve per non scrivere ogni volta l'url completo, ma solo la parte finale
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }), //è una scorciatoia JavaScript per scrivere { email: email, password: password } (quando il nome della chiave coincide col nome della variabile, puoi ometterlo)
    });

    if (!response.ok) {
      const messaggio = await messaggioErrore(response, t("login.nonRiuscito"));
      setErrorMessage(messaggio)
      setSnackbarVisible(true)
      console.log("errore", messaggio);
      return;
    }

    const data = await response.json(); //json decodifica la rispota in un oggetto js utilizzabile
    await salvaSessione(data); //permette la persistenza dei token al riavvio
    console.log("Login riuscito, token salvato"); //il token è necessario per una navigazione automatica post login
    router.replace("/(tabs)/home")
  } catch (error) {
    console.log("Errore di rete:", error);
    setErrorMessage(t("errori.rete"));
    setSnackbarVisible(true);
  } finally {
    setLoading(false)
  }
}

  return (
    <View style={styles.container}>{/*container di tutta la schermata*/}
      <PaginaScorrevole style={styles.content} tastiera>
        {/* per chi ha saltato la presentazione o torna dopo un logout */}
        <SelettoreLingua />
        <View style={styles.logoContainer}>
          <Image source={require("../assets/images/logo/trackit-icon-rounded-180.png")} style={styles.logo} />
          <Text style={styles.logoLabel}>TrackIt</Text>
        </View>
        <Text variant="headlineMedium" style={styles.title}>
          {t("login.titolo")}
        </Text>

        <TextInput
          label={t("comune.email")}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none" //evita che la prima lettera sia scelta in maiuscolo
          mode="outlined"
          outlineStyle={styles.inputOutline}
          keyboardType="email-address"
          style={styles.input}
        />
        <Text style={styles.linkAction} onPress={()=>router.push('/resetPassword')}>{t("login.dimenticata")}</Text>
        <TextInput
          label={t("comune.password")}
          value={password}
          onChangeText={setPassword}
           secureTextEntry={!showPassword} //nasconde i caratteri(mostra pallini o asteriscghi)
          mode="outlined"
          outlineStyle={styles.inputOutline}
          style={styles.input}
          right={
          <TextInput.Icon 
              icon={showPassword ? "eye-off" : "eye"} 
              onPress={() => setShowPassword(!showPassword)} 
          />
          }
        />
        <Button 
          mode="contained" 
          onPress={handleLogin} 
          style={styles.button}
          labelStyle={styles.buttonLabel}
          loading={loading}
          disabled={loading}
          >
          {t("accesso.accedi")}
        </Button>

        {google.isReady && (
          <>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t("comune.oppure")}</Text>
              <View style={styles.dividerLine} />
            </View>
            <GoogleButton
              onPress={google.signIn}
              disabled={google.isLoading || loading}
            />
            {/* dal login, Google crea l'account a chi non ce l'ha: senza avviso
                l'utente si registrerebbe senza aver visto l'informativa */}
            <Text style={styles.legal}>
              {t("accesso.legaleGoogle")}
              <Text style={styles.legalLink} onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}>
                {t("accesso.informativa")}
              </Text>
            </Text>
          </>
        )}

        <Text style={styles.link}>
          {t("accesso.nonHaiAccount")}{" "}
          <Link href="/register"> 
           <Text style={styles.linkAction}> {t("accesso.registrati")} </Text>
          </Link>
        </Text>
      </PaginaScorrevole>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
      >
        {errorMessage}
    </Snackbar>
        
      
    </View>
  );
}